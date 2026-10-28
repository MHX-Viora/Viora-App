import {DEFAULT_API_ORIGIN, DEFAULT_HOST_ORIGIN} from './production.js';

// Auth Bridge has no OIDC, redirect, certificate or client-secret dependency.
export class MiniAppAuthError extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'MiniAppAuthError'; }
}
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);
const credential = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
type NativeBridge = {postMessage(value: string): void; onmessage?: (event: {data: string}) => void};
export interface AuthBridgeRuntime { events: EventTarget; documentEvents?: EventTarget; parent?: Pick<Window,'postMessage'>; native?: NativeBridge; origin: string }
export interface AnktMiniAppOptions {apiOrigin?: string; hostOrigin?: string; clientId: string; timeoutMs?: number}
export interface MiniAppAuthSession { sessionId: string; environment: 'Sandbox'|'Production'; expiresAt: number; scope: 'profile' }
export interface MiniAppLoginCode {code: string; expiresIn: number}
export interface MiniAppUserInfo {id: string; username: string; displayName: string; avatarUrl: string|null; coverUrl: string|null; gender: string; isSandbox: boolean; fullName: string|null}

export function createAnktMiniApp(input: AnktMiniAppOptions, injected?: AuthBridgeRuntime) {
  const loopbackHosts = ['localhost','127.0.0.1','[::1]'];
  function origin(value: string, hostOnly = false) {
    let url: URL;
    try { url = new URL(value); } catch { throw new MiniAppAuthError('INVALID_ORIGIN'); }
    const localHttpHost=hostOnly && url.protocol==='http:' && loopbackHosts.includes(url.hostname);
    if (url.protocol !== 'https:' && !localHttpHost || url.origin !== value || url.username || url.password) throw new MiniAppAuthError('INVALID_ORIGIN');
    return value;
  }
  const api = origin(input.apiOrigin ?? DEFAULT_API_ORIGIN), host = origin(input.hostOrigin ?? DEFAULT_HOST_ORIGIN,true), timeout = input.timeoutMs ?? 10000;
  const sandboxHostOnly=loopbackHosts.includes(new URL(host).hostname);
  if (!/^app_[A-Za-z0-9_-]{43}$/.test(input.clientId) || !Number.isInteger(timeout) || timeout < 50 || timeout > 30000) throw new MiniAppAuthError('INVALID_CLIENT');
  const nativeWindow = typeof window === 'undefined' ? undefined : window as Window & {ReactNativeWebView?: NativeBridge; ANKTProductionHost?: NativeBridge};
  const native = nativeWindow?.ReactNativeWebView ?? nativeWindow?.ANKTProductionHost;
  const runtime = injected ?? (typeof window === 'undefined' ? undefined : {events: window,
    ...(window.parent !== window ? {parent: window.parent} : {native,documentEvents:window.document}), origin: window.location.origin});
  let tokens: {access: string; session: MiniAppAuthSession}|undefined, login: Promise<void>|undefined, epoch = 0, disposed = false;
  const requests=new Set<AbortController>();
  let pending: {id: string; resend():void; resolve(value: unknown): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout>}|undefined;
  function receive(data: unknown) {
    if (!record(data) || data.channel !== 'ankt.auth' || data.version !== 1 || data.type !== 'response' || data.id !== pending?.id || !pending) return;
    const current = pending; pending = undefined; clearTimeout(current.timer);
    if (data.ok !== true) { current.reject(new MiniAppAuthError(record(data.error) && typeof data.error.code === 'string' ? data.error.code : 'AUTH_EXCHANGE_FAILED')); return; }
    current.resolve(data.result);
  }
  const listener = (event: Event) => {
    const message = event as MessageEvent;
    if (runtime?.parent) {
      if (message.origin === host && message.source === runtime.parent) receive(message.data);
    } else if (runtime?.native && typeof message.data === 'string' && message.data.length<=8192) {
      try {const data:unknown=JSON.parse(message.data);
        if(record(data)&&data.channel==='ankt.auth.transport'&&data.type==='ready'){pending?.resend();return;}
      }catch{/* Malformed data cannot authorize a session. */}
      nativeListener({data:message.data});
    }
  };
  const previousNative = runtime?.native?.onmessage;
  const nativeListener = (event: {data: string}) => { try { if(event.data.length < 8192) receive(JSON.parse(event.data)); } catch { /* Ignore untrusted protocol data. */ } };
  runtime?.events.addEventListener('message', listener);
  if (!runtime?.parent && runtime?.native) runtime.documentEvents?.addEventListener('message',listener);
  const lifecycle = () => dispose();
  runtime?.events.addEventListener('pagehide',lifecycle);
  if (runtime?.native) runtime.native.onmessage = nativeListener;
  async function request(path: string, body?: unknown, access?: string): Promise<unknown> {
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeout);requests.add(abort);
    let response: Response;
    try {
      response = await fetch(api + '/api/miniapp/auth/' + path, {method: body === undefined ? 'GET' : 'POST',
        credentials: 'omit', cache: 'no-store', redirect: 'error', signal: abort.signal,
        headers: {'Content-Type':'application/json', 'X-Ankt-MiniApp-Client':input.clientId, ...(access ? {Authorization: 'Bearer ' + access} : {})},
        ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    const data: unknown = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new MiniAppAuthError(record(data) && record(data.error) && typeof data.error.code === 'string' ? data.error.code : 'AUTH_EXCHANGE_FAILED');
    return data;
    } catch(error) {if(error instanceof MiniAppAuthError)throw error;throw new MiniAppAuthError('AUTH_EXCHANGE_FAILED');}
    finally{clearTimeout(timer);requests.delete(abort);}
  }
  async function authorize() {
    if (disposed || !runtime || !runtime.parent && !runtime.native) throw new MiniAppAuthError('HOST_UNAVAILABLE');
    const current = epoch;
    const verifier = base64(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
    if(disposed||current!==epoch)throw new MiniAppAuthError('SESSION_EXPIRED');
    const launch = await new Promise<unknown>((resolve,reject) => {
      const id = crypto.randomUUID(), timer = setTimeout(() => { pending = undefined; reject(new MiniAppAuthError('HOST_UNAVAILABLE')); }, timeout);
      const message = {channel:'ankt.auth',version:1,type:'request',id,method:'auth.login',params:{clientId:input.clientId,codeChallenge:challenge}};
      const send=()=>{try { if (runtime.parent) runtime.parent.postMessage(message,host); else runtime.native!.postMessage(JSON.stringify(message)); }
        catch { clearTimeout(timer); pending = undefined; reject(new MiniAppAuthError('HOST_UNAVAILABLE')); }};
      let resent=false;
      pending = {id,resolve,reject,timer,resend:()=>{if(!resent){resent=true;send();}}};
      send();
    });
    if (disposed || current !== epoch) throw new MiniAppAuthError('SESSION_EXPIRED');
    if (!record(launch) || launch.clientId !== input.clientId || launch.origin !== runtime.origin ||
        typeof launch.sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(launch.sessionId) || !credential(launch.code) ||
        (launch.environment !== 'Sandbox' && launch.environment !== 'Production') || launch.expiresIn !== 60) throw new MiniAppAuthError('AUTH_EXCHANGE_FAILED');
    if(sandboxHostOnly && launch.environment!=='Sandbox')throw new MiniAppAuthError('SANDBOX_HOST_ONLY');
    const result = await request('exchange',{client_id:input.clientId,session_id:launch.sessionId,code:launch.code,code_verifier:verifier});
    if (disposed || current !== epoch) throw new MiniAppAuthError('SESSION_EXPIRED');
    if (!record(result) || result.token_type !== 'Bearer' || result.scope !== 'profile' || result.session_id !== launch.sessionId || result.environment !== launch.environment ||
        typeof result.access_token !== 'string' || !/^(mas_|map_)[A-Za-z0-9_-]{43}$/.test(result.access_token) ||
        !result.access_token.startsWith(launch.environment === 'Sandbox' ? 'mas_' : 'map_') ||
        !Number.isInteger(result.expires_in) || Number(result.expires_in) < 1 || Number(result.expires_in) > 300) throw new MiniAppAuthError('AUTH_EXCHANGE_FAILED');
    tokens = {access:result.access_token,session:{sessionId:launch.sessionId,environment:launch.environment as 'Sandbox'|'Production',expiresAt:Date.now()+Number(result.expires_in)*1000,scope:'profile'}};
  }
  async function init() {
    if (disposed) throw new MiniAppAuthError('HOST_UNAVAILABLE');
    if (tokens && tokens.session.expiresAt > Date.now()) return;
    tokens = undefined;
    if (!login) login = authorize().finally(() => {login = undefined;});
    await login;
  }
  async function getUserInfo(): Promise<MiniAppUserInfo> {
    await init(); const current = epoch, token = tokens!;
    try {
      const user = await request('me',undefined,token.access);
      if (current !== epoch || !record(user) || typeof user.id !== 'string' || typeof user.displayName !== 'string' ||
          typeof user.username !== 'string' || typeof user.isSandbox !== 'boolean' || user.isSandbox !== (token.session.environment === 'Sandbox')) throw new MiniAppAuthError('AUTH_EXCHANGE_FAILED');
      const ready={channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.ready',params:{clientId:input.clientId,sessionId:token.session.sessionId}};
      if(runtime?.parent)runtime.parent.postMessage(ready,host);else runtime?.native?.postMessage(JSON.stringify(ready));
      return user as unknown as MiniAppUserInfo;
    } catch (error) { if(current===epoch)tokens=undefined; throw error; }
  }
  async function getLoginCode(): Promise<MiniAppLoginCode> {
    await init(); const current=epoch;
    const result=await request('code',{},tokens!.access);
    if(disposed||current!==epoch)throw new MiniAppAuthError('SESSION_EXPIRED');
    if(!record(result)||!credential(result.code)||result.expiresIn!==60)throw new MiniAppAuthError('AUTH_EXCHANGE_FAILED');
    // Never cache one-use codes; each explicit call issues a fresh grant.
    return {code:result.code as string,expiresIn:60};
  }
  async function logout() {
    const current = tokens; tokens=undefined; epoch++;
    for(const request of requests)request.abort();
    if (pending) {clearTimeout(pending.timer);pending.reject(new MiniAppAuthError('SESSION_EXPIRED'));pending=undefined;}
    if (current) await request('revoke',{},current.access);
  }
  function dispose() {
    if(disposed)return; disposed=true; tokens=undefined;epoch++;
    for(const request of requests)request.abort();requests.clear();
    runtime?.events.removeEventListener('message',listener);
    runtime?.documentEvents?.removeEventListener('message',listener);
    runtime?.events.removeEventListener('pagehide',lifecycle);
    if(runtime?.native?.onmessage===nativeListener)runtime.native.onmessage=previousNative;
    if(pending){clearTimeout(pending.timer);pending.reject(new MiniAppAuthError('HOST_UNAVAILABLE'));pending=undefined;}
  }
  return {init,auth:{getSession:async()=>{await init();return {...tokens!.session};},getAccessToken:async()=>{await init();return tokens!.access;},getUserInfo,getLoginCode,logout},
    app:{getEnvironment:()=>tokens && tokens.session.expiresAt>Date.now() ? (tokens.session.environment==='Sandbox'?'sandbox' as const:'production' as const) : null,
      close:async()=>{
        const session=tokens?.session;
        if(!session||disposed)throw new MiniAppAuthError('HOST_UNAVAILABLE');
        await logout();
        const message={channel:'ankt.auth',version:1,type:'request',id:crypto.randomUUID(),method:'auth.close',params:{clientId:input.clientId,sessionId:session.sessionId}};
        try{if(runtime?.parent)runtime.parent.postMessage(message,host);else runtime?.native?.postMessage(JSON.stringify(message));}finally{dispose();}
      }},dispose};
}

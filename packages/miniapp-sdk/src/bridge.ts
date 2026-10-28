import {SdkError} from './config.js';

export const BRIDGE_CHANNEL = 'ankt.miniapp';
type Method = 'bridge.handshake' | 'platform.getContext' | 'platform.close' | 'platform.getEnvironment' | 'platform.isInsideAnkt' | 'platform.openExternalUrl' | 'diagnostics.report';
export interface HostContext {appId: string; environment: 'Sandbox' | 'Production'; runtime: 'controlled-web' | 'sandbox-web'}
export interface BridgeRuntime {events: EventTarget; parent: Pick<Window, 'postMessage'>}
export interface BridgeOptions {timeoutMs?: number; runtime?: BridgeRuntime; protocolVersion?: 1 | 2}
export interface SandboxDiagnostic {
  category: 'Runtime' | 'Bridge' | 'Network' | 'Permission';
  code: 'SDK_INITIALIZED' | 'RUNTIME_READY' | 'RUNTIME_ERROR' | 'BRIDGE_READY' | 'BRIDGE_ERROR' | 'NETWORK_ERROR' | 'PERMISSION_DENIED';
  count?: number;
}
const record = (value: unknown): value is Record<string,unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string,unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const v1Methods = ['platform.getContext','platform.close'];
const v2Methods = [...v1Methods,'platform.getEnvironment','platform.isInsideAnkt','platform.openExternalUrl','diagnostics.report'];
const diagnosticCodes: Record<string,readonly string[]> = {
  Runtime:['SDK_INITIALIZED','RUNTIME_READY','RUNTIME_ERROR'],Bridge:['BRIDGE_READY','BRIDGE_ERROR'],
  Network:['NETWORK_ERROR'],Permission:['PERMISSION_DENIED'],
};

class HostBridge {
  #verified = false;
  #disposed = false;
  #permissions = new Set<string>();
  readonly #pending = new Map<string, {method: Method; resolve: (value: unknown) => void; reject: (error: SdkError) => void; timer: ReturnType<typeof setTimeout>}>();
  readonly #message: EventListener;
  readonly #pagehide: EventListener;

  constructor(readonly origin: string, readonly runtime: BridgeRuntime, readonly timeoutMs: number,readonly version:1|2) {
    this.#message = event => this.#receive(event as MessageEvent);
    this.#pagehide = () => this.dispose();
    runtime.events.addEventListener('message',this.#message);
    runtime.events.addEventListener('pagehide',this.#pagehide);
  }
  get insideHost() {return this.#verified && !this.#disposed;}
  async handshake(): Promise<void> {
    const result = await this.#send('bridge.handshake');
    const methods=this.version===1?v1Methods:v2Methods;
    if (!record(result) || !exact(result,['permissions']) || !Array.isArray(result.permissions) ||
      result.permissions.length > methods.length || new Set(result.permissions).size!==result.permissions.length ||
      result.permissions.some(value => typeof value !== 'string' || !methods.includes(value))) throw new SdkError('BRIDGE_PROTOCOL');
    this.#permissions = new Set(result.permissions as string[]); this.#verified = true;
  }
  async getContext(): Promise<HostContext> {
    const value = await this.#send('platform.getContext');
    if (!record(value) || !exact(value,['appId','environment','runtime']) || typeof value.appId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(value.appId) || typeof value.environment !== 'string' || !['Sandbox','Production'].includes(value.environment) ||
      (this.version===1?value.runtime!=='controlled-web':value.runtime!=='sandbox-web'||value.environment!=='Sandbox'))
      throw new SdkError('BRIDGE_PROTOCOL');
    return value as unknown as HostContext;
  }
  async close(): Promise<void> {
    if (await this.#send('platform.close') !== null) throw new SdkError('BRIDGE_PROTOCOL');
    this.dispose();
  }
  async getEnvironment():Promise<'Sandbox'|'Production'> {
    if(this.version===1)return (await this.getContext()).environment;
    if(await this.#send('platform.getEnvironment')!=='Sandbox')throw new SdkError('BRIDGE_PROTOCOL');
    return 'Sandbox';
  }
  async isInsideAnkt():Promise<boolean> {
    if(this.version===1)return this.insideHost;
    const value=await this.#send('platform.isInsideAnkt');
    if(typeof value!=='boolean')throw new SdkError('BRIDGE_PROTOCOL');
    return value;
  }
  async openExternalUrl(value:string):Promise<void> {
    let url:URL;
    try {
      if(typeof value!=='string'||value.length>2048)throw new Error();url=new URL(value);
      if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error();
    } catch {throw new SdkError('INVALID_CONFIG');}
    if(await this.#send('platform.openExternalUrl',{url:url.href})!==null)throw new SdkError('BRIDGE_PROTOCOL');
  }
  async reportDiagnostic(value:SandboxDiagnostic):Promise<void> {
    if(!record(value)||!exact(value,value.count===undefined?['category','code']:['category','code','count'])||
      typeof value.category!=='string'||!Object.hasOwn(diagnosticCodes,value.category)||typeof value.code!=='string'||!diagnosticCodes[value.category]!.includes(value.code)||
      (value.count!==undefined&&(!Number.isInteger(value.count)||typeof value.count!=='number'||value.count<0||value.count>1000000)))throw new SdkError('INVALID_CONFIG');
    const params={category:value.category,code:value.code,...(value.count===undefined?{}:{count:value.count})};
    if(await this.#send('diagnostics.report',params)!==null)throw new SdkError('BRIDGE_PROTOCOL');
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true; this.#verified = false;
    this.runtime.events.removeEventListener('message',this.#message);
    this.runtime.events.removeEventListener('pagehide',this.#pagehide);
    for (const pending of this.#pending.values()) {clearTimeout(pending.timer); pending.reject(new SdkError('BRIDGE_DISPOSED'));}
    this.#pending.clear();
  }
  #send(method: Method,params?:Record<string,unknown>): Promise<unknown> {
    if (this.#disposed) return Promise.reject(new SdkError('BRIDGE_DISPOSED'));
    if (method !== 'bridge.handshake' && (!this.#verified || !this.#permissions.has(method))) return Promise.reject(new SdkError('UNSUPPORTED_METHOD'));
    if (this.#pending.size >= 32) return Promise.reject(new SdkError('BRIDGE_BUSY'));
    const id = crypto.randomUUID();
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => {this.#pending.delete(id); reject(new SdkError('BRIDGE_TIMEOUT'));},method==='platform.openExternalUrl'?30000:this.timeoutMs);
      this.#pending.set(id,{method,resolve,reject,timer});
      try {this.runtime.parent.postMessage({channel:BRIDGE_CHANNEL,version:this.version,type:'request',id,method,...(params?{params}:{})},this.origin);}
      catch {clearTimeout(timer);this.#pending.delete(id);reject(new SdkError('BRIDGE_PROTOCOL'));}
    });
  }
  #receive(event: MessageEvent): void {
    if (this.#disposed || event.origin !== this.origin || event.source !== this.runtime.parent || !record(event.data)) return;
    const data = event.data;
    if (data.channel !== BRIDGE_CHANNEL || data.version !== this.version || data.type !== 'response' || typeof data.id !== 'string') return;
    const pending = this.#pending.get(data.id); if (!pending) return;
    this.#pending.delete(data.id); clearTimeout(pending.timer);
    if(this.version===2&&data.ok===false&&exact(data,['channel','version','type','id','ok','error'])&&record(data.error)&&exact(data.error,['code'])&&
      ['UNSUPPORTED_METHOD','BRIDGE_FORBIDDEN','BRIDGE_BUSY','BRIDGE_PROTOCOL'].includes(data.error.code as string)) {
      pending.reject(new SdkError(data.error.code as 'UNSUPPORTED_METHOD'|'BRIDGE_FORBIDDEN'|'BRIDGE_BUSY'|'BRIDGE_PROTOCOL'));return;
    }
    if (data.ok !== true || !exact(data,['channel','version','type','id','ok','result'])) {pending.reject(new SdkError('BRIDGE_PROTOCOL')); return;}
    pending.resolve(data.result);
  }
}

export async function connectHostBridge(hostOrigin: string, options: BridgeOptions = {}) {
  let origin: URL;
  try {origin = new URL(hostOrigin);} catch {throw new SdkError('INVALID_CONFIG');}
  const timeout = options.timeoutMs ?? 5000;
  const version=options.protocolVersion??1;
  if (origin.protocol !== 'https:' || origin.origin !== hostOrigin || !Number.isInteger(timeout) || timeout < 10 || timeout > 30000 || ![1,2].includes(version)) throw new SdkError('INVALID_CONFIG');
  const runtime = options.runtime ?? (typeof window !== 'undefined' && window.parent !== window ? {events:window,parent:window.parent} : undefined);
  if (!runtime) throw new SdkError('UNSUPPORTED_CONTEXT');
  const bridge = new HostBridge(hostOrigin,runtime,timeout,version);
  try {await bridge.handshake(); return bridge;}
  catch (error) {bridge.dispose(); throw error;}
}

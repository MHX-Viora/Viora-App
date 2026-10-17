import {SdkError} from './config.js';

export const BRIDGE_CHANNEL = 'ankt.miniapp';
type Method = 'bridge.handshake' | 'platform.getContext' | 'platform.close';
export interface HostContext {appId: string; environment: 'Sandbox' | 'Production'; runtime: 'controlled-web'}
export interface BridgeRuntime {events: EventTarget; parent: Pick<Window, 'postMessage'>}
export interface BridgeOptions {timeoutMs?: number; runtime?: BridgeRuntime}
const record = (value: unknown): value is Record<string,unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string,unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const methods = ['platform.getContext','platform.close'];

class HostBridge {
  #verified = false;
  #disposed = false;
  #permissions = new Set<string>();
  readonly #pending = new Map<string, {method: Method; resolve: (value: unknown) => void; reject: (error: SdkError) => void; timer: ReturnType<typeof setTimeout>}>();
  readonly #message: EventListener;
  readonly #pagehide: EventListener;

  constructor(readonly origin: string, readonly runtime: BridgeRuntime, readonly timeoutMs: number) {
    this.#message = event => this.#receive(event as MessageEvent);
    this.#pagehide = () => this.dispose();
    runtime.events.addEventListener('message',this.#message);
    runtime.events.addEventListener('pagehide',this.#pagehide);
  }
  get insideHost() {return this.#verified && !this.#disposed;}
  async handshake(): Promise<void> {
    const result = await this.#send('bridge.handshake');
    if (!record(result) || !exact(result,['permissions']) || !Array.isArray(result.permissions) ||
      result.permissions.length > 2 || result.permissions.some(value => typeof value !== 'string' || !methods.includes(value))) throw new SdkError('BRIDGE_PROTOCOL');
    this.#permissions = new Set(result.permissions as string[]); this.#verified = true;
  }
  async getContext(): Promise<HostContext> {
    const value = await this.#send('platform.getContext');
    if (!record(value) || !exact(value,['appId','environment','runtime']) || typeof value.appId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(value.appId) || typeof value.environment !== 'string' || !['Sandbox','Production'].includes(value.environment) || value.runtime !== 'controlled-web')
      throw new SdkError('BRIDGE_PROTOCOL');
    return value as unknown as HostContext;
  }
  async close(): Promise<void> {
    if (await this.#send('platform.close') !== null) throw new SdkError('BRIDGE_PROTOCOL');
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true; this.#verified = false;
    this.runtime.events.removeEventListener('message',this.#message);
    this.runtime.events.removeEventListener('pagehide',this.#pagehide);
    for (const pending of this.#pending.values()) {clearTimeout(pending.timer); pending.reject(new SdkError('BRIDGE_DISPOSED'));}
    this.#pending.clear();
  }
  #send(method: Method): Promise<unknown> {
    if (this.#disposed) return Promise.reject(new SdkError('BRIDGE_DISPOSED'));
    if (method !== 'bridge.handshake' && (!this.#verified || !this.#permissions.has(method))) return Promise.reject(new SdkError('UNSUPPORTED_METHOD'));
    if (this.#pending.size >= 32) return Promise.reject(new SdkError('BRIDGE_BUSY'));
    const id = crypto.randomUUID();
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => {this.#pending.delete(id); reject(new SdkError('BRIDGE_TIMEOUT'));},this.timeoutMs);
      this.#pending.set(id,{method,resolve,reject,timer});
      try {this.runtime.parent.postMessage({channel:BRIDGE_CHANNEL,version:1,type:'request',id,method},this.origin);}
      catch {clearTimeout(timer);this.#pending.delete(id);reject(new SdkError('BRIDGE_PROTOCOL'));}
    });
  }
  #receive(event: MessageEvent): void {
    if (this.#disposed || event.origin !== this.origin || event.source !== this.runtime.parent || !record(event.data)) return;
    const data = event.data;
    if (data.channel !== BRIDGE_CHANNEL || data.version !== 1 || data.type !== 'response' || typeof data.id !== 'string') return;
    const pending = this.#pending.get(data.id); if (!pending) return;
    this.#pending.delete(data.id); clearTimeout(pending.timer);
    if (data.ok !== true || !exact(data,['channel','version','type','id','ok','result'])) {pending.reject(new SdkError('BRIDGE_PROTOCOL')); return;}
    pending.resolve(data.result);
  }
}

export async function connectHostBridge(hostOrigin: string, options: BridgeOptions = {}) {
  let origin: URL;
  try {origin = new URL(hostOrigin);} catch {throw new SdkError('INVALID_CONFIG');}
  const timeout = options.timeoutMs ?? 5000;
  if (origin.protocol !== 'https:' || origin.origin !== hostOrigin || !Number.isInteger(timeout) || timeout < 10 || timeout > 30000) throw new SdkError('INVALID_CONFIG');
  const runtime = options.runtime ?? (typeof window !== 'undefined' && window.parent !== window ? {events:window,parent:window.parent} : undefined);
  if (!runtime) throw new SdkError('UNSUPPORTED_CONTEXT');
  const bridge = new HostBridge(hostOrigin,runtime,timeout);
  try {await bridge.handshake(); return bridge;}
  catch (error) {bridge.dispose(); throw error;}
}

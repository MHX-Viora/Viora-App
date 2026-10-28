import type { SandboxLaunch } from './mini-app-sandbox';

type Message = {origin: string; source: unknown; data: unknown};
type Options = {
  hostOrigin: string; portalOrigin: string; sessionId: string; source: () => unknown;
  launch: (nonce: string) => Promise<SandboxLaunch>; send: (message: unknown) => void;
  status: (type: string) => void;
};
export function sandboxHostOrigin(input: string, portalOrigin: string): string {
  const host = new URL(input), portal = new URL(portalOrigin);
  if(host.protocol !== 'https:' || host.pathname !== '/' || host.search || host.hash || host.username || host.password || host.hostname === portal.hostname)
    throw new Error('Sandbox host chưa được cấu hình trên hostname HTTPS riêng.');
  return host.origin;
}
export function createSandboxTransport(options: Options) {
  const origin = sandboxHostOrigin(options.hostOrigin, options.portalOrigin);
  let disposed = false, issued = false;
  const statuses = new Set(['session.connected','bridge.connected','bridge.disconnected','bridge.timeout','host.closed','host.back','host.close_failed']);
  return {
    async handle(event: Message) {
      if(disposed || event.origin !== origin || !event.source || event.source !== options.source()) return;
      const value = event.data;
      if(!value || typeof value !== 'object' || Array.isArray(value)) return;
      const data = value as Record<string, unknown>;
      if(data.channel !== 'ankt.sandbox.host' || data.version !== 1 || data.sessionId !== options.sessionId || typeof data.type !== 'string') return;
      const keys = Object.keys(data).sort().join(',');
      if(data.type !== 'host.ready') {
        if(keys === 'channel,sessionId,type,version' && statuses.has(data.type)) options.status(data.type);
        return;
      }
      if(issued || keys !== 'browserNonce,channel,sessionId,type,version' || typeof data.browserNonce !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.browserNonce)) return;
      issued = true;
      try {
        const launch = await options.launch(data.browserNonce);
        if(disposed) return;
        if(!/^[A-Za-z0-9_-]{43}$/.test(launch.grant) || !(Date.parse(launch.expiresAt) > Date.now())) throw new Error('Invalid launch');
        options.send({...data, type:'launch', grant:launch.grant});
      } catch { if(!disposed) options.status('launch.failed'); }
    },
    command(type: 'host.stop' | 'host.reload') {
      if(!disposed) options.send({channel:'ankt.sandbox.host',version:1,type,sessionId:options.sessionId});
    },
    dispose() { disposed = true; },
  };
}

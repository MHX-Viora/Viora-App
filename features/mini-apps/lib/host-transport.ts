import { hostId, hostNonce, productionHostOrigin, readLaunchReceipt, type MiniAppLaunchReceipt } from '../../../services/mini-app-launch.service';

type Message = { origin: string; source: unknown; data: unknown };
type Options = {
  hostOrigin: string; appOrigin: string; apiOrigin: string; source: () => unknown;
  launch: (bindingId: string, browserNonce: string, signal: AbortSignal) => Promise<MiniAppLaunchReceipt>;
  send: (message: unknown) => void; status: (status: string) => void;
};
const channel = 'ankt.production.host';
const statuses = new Set(['host.running', 'website.loaded', 'bridge.connected', 'bridge.disconnected', 'bridge.unavailable', 'host.paused', 'host.resumed']);
export function createProductionTransport(options: Options) {
  const origin = productionHostOrigin(options.hostOrigin, options.appOrigin, options.apiOrigin);
  const controller = new AbortController();
  let disposed = false, issued = false, generation: string | undefined, preparedGeneration: string | undefined;
  let browserNonce: string | undefined, receipt: MiniAppLaunchReceipt | undefined;
  const generations = new Set<string>();
  function send(type: string, fields: Record<string, unknown>) {
    options.send({ channel, version: 1, type, documentNonce: generation, ...fields });
  }
  function dispose() {
    if (disposed) return;
    disposed = true; controller.abort();
    if (receipt && browserNonce) send('host.stop', { sessionId: receipt.sessionId, browserNonce });
    receipt = undefined; browserNonce = undefined; generation = undefined; generations.clear();
  }
  return {
    async handle(event: Message) {
      if (disposed || event.origin !== origin || !event.source || event.source !== options.source() || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)) return;
      const data = event.data as Record<string, unknown>;
      if (data.channel !== channel || data.version !== 1 || typeof data.type !== 'string' || !hostNonce(data.documentNonce)) return;
      const exact = (fields: string[]) => {
        const keys = ['channel', 'version', 'type', 'documentNonce', ...fields];
        return Object.keys(data).length === keys.length && keys.every(key => Object.hasOwn(data, key));
      };
      if (data.type === 'host.prepared') {
        if (issued || !exact(['bindingId', 'browserNonce', 'expiresAt']) || !hostNonce(data.browserNonce) || typeof data.bindingId !== 'string' ||
          !data.bindingId.length || data.bindingId.length > 4096 || typeof data.expiresAt !== 'string' || !(Date.parse(data.expiresAt) > Date.now()) ||
          Date.parse(data.expiresAt) > Date.now() + 120000) return;
        issued = true; preparedGeneration = generation = data.documentNonce; generations.add(generation); browserNonce = data.browserNonce;
        try {
          const value = await options.launch(data.bindingId, browserNonce, controller.signal);
          if (disposed) return;
          receipt = readLaunchReceipt(value, origin);
          send('host.launch', { sessionId: receipt.sessionId, grant: receipt.grant, browserNonce });
          // Only the one-use handoff needs the plaintext grant; retain no receipt secret.
          receipt = { ...receipt, grant: '' };
          options.status('launch.granted');
        } catch { if (!disposed) { options.status('launch.failed'); dispose(); } }
        return;
      }
      if (data.type === 'host.runtime.ready') {
        if (!receipt || !browserNonce || !exact(['sessionId']) || !hostId(data.sessionId) || data.sessionId !== receipt.sessionId ||
          data.documentNonce === preparedGeneration || generations.has(data.documentNonce) || generations.size >= 32 || Date.parse(receipt.expiresAt) <= Date.now()) return;
        generation = data.documentNonce; generations.add(generation);
        send('host.resume', { sessionId: receipt.sessionId, browserNonce });
        return;
      }
      if (data.documentNonce !== generation) return;
      if (data.type === 'host.error' && exact(['sessionId', 'code']) && (data.sessionId === (receipt?.sessionId ?? null)) &&
        (data.code === 'HOST_UNAVAILABLE' || data.code === 'SESSION_ENDED')) {
        options.status('host.error'); dispose(); return;
      }
      if (!receipt || data.sessionId !== receipt.sessionId) return;
      if (data.type === 'host.closed' && exact(['sessionId', 'confirmed']) && typeof data.confirmed === 'boolean') {
        options.status(data.confirmed ? 'host.closed' : 'host.close_unconfirmed'); dispose(); return;
      }
      if (statuses.has(data.type) && exact(['sessionId'])) options.status(data.type);
    },
    dispose,
  };
}

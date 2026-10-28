import { validMiniAppId } from '../features/mini-apps/lib/contracts';

export type MiniAppLaunchRequest = { requestId: string; platform: 'Web' | 'Android' | 'iOS'; bindingId: string; browserNonce: string };
export type MiniAppLaunchReceipt = {
  sessionId: string; publicationId: string; version: string; hostOrigin: string; hostUrl: string;
  expiresAt: string; grant: string; capabilities: string[]; correlationId: string;
};
export const hostNonce = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export const hostId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function productionHostOrigin(input: string, appOrigin: string, apiOrigin: string): string {
  try {
    const host = new URL(input), app = new URL(appOrigin), api = new URL(apiOrigin);
    if (host.protocol !== 'https:' || host.pathname !== '/' || host.search || host.hash || host.username || host.password ||
      host.hostname === app.hostname || host.hostname === api.hostname || host.hostname.endsWith('.')) throw new Error();
    return host.origin;
  } catch { throw new Error('INVALID_HOST_CONFIGURATION'); }
}
export function readLaunchReceipt(value: unknown, origin: string): MiniAppLaunchReceipt {
  const invalid = (): never => { throw new Error('INVALID_LAUNCH_RESPONSE'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const row = value as Record<string, unknown>;
  const keys = ['sessionId', 'publicationId', 'version', 'hostOrigin', 'hostUrl', 'expiresAt', 'grant', 'capabilities', 'correlationId'];
  if (Object.keys(row).length !== keys.length || !keys.every(key => Object.hasOwn(row, key)) ||
    !hostId(row.sessionId) || !hostId(row.publicationId) || !hostId(row.correlationId) || !hostNonce(row.grant) ||
    row.hostOrigin !== origin || row.hostUrl !== origin + '/mini-app-host' || typeof row.version !== 'string' || !row.version.trim() || row.version.length > 80 ||
    typeof row.expiresAt !== 'string' || !(Date.parse(row.expiresAt) > Date.now()) || Date.parse(row.expiresAt) > Date.now() + 30 * 60_000 ||
    !Array.isArray(row.capabilities) || row.capabilities.length > 2 || new Set(row.capabilities).size !== row.capabilities.length ||
    row.capabilities.some(x => x !== 'platform.getContext' && x !== 'platform.close')) return invalid();
  return { sessionId: row.sessionId, publicationId: row.publicationId, version: row.version, hostOrigin: origin,
    hostUrl: row.hostUrl, expiresAt: row.expiresAt, grant: row.grant, capabilities: [...row.capabilities], correlationId: row.correlationId };
}
export function createMiniAppLaunchClient(apiUrl: string, hostUrl: string, appOrigin: string, transport: typeof fetch = fetch) {
  const origin = productionHostOrigin(hostUrl, appOrigin, apiUrl);
  const api = new URL(apiUrl);
  if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash) throw new Error('INVALID_API_CONFIGURATION');
  return {
    async launch(appId: string, request: MiniAppLaunchRequest, accessToken: string | null, signal?: AbortSignal): Promise<MiniAppLaunchReceipt> {
      if (!validMiniAppId(appId) || !hostId(request.requestId) || !['Web', 'Android', 'iOS'].includes(request.platform) ||
        typeof request.bindingId !== 'string' || request.bindingId.length < 1 || request.bindingId.length > 4096 || !hostNonce(request.browserNonce)) throw new Error('INVALID_LAUNCH');
      if (accessToken !== null && (!accessToken || /[\s\r\n]/.test(accessToken))) throw new Error('HOST_SOURCE_INVALID');
      const controller = new AbortController(), cancel = () => controller.abort();
      signal?.addEventListener('abort', cancel, { once: true });
      if (signal?.aborted) cancel();
      const timeout = setTimeout(cancel, 15000);
      try {
        controller.signal.throwIfAborted();
        const response = await transport(`${api.origin}/api/mini-apps/${appId}/launch`, {
          method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json',
            ...(request.platform === 'Web' ? {} : { Origin: new URL(appOrigin).origin }),
            ...(accessToken === null ? {} : { Authorization: `Bearer ${accessToken}` }) },
          credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
          body: JSON.stringify({ requestId: request.requestId, platform: request.platform, bindingId: request.bindingId, browserNonce: request.browserNonce }),
        });
        controller.signal.throwIfAborted();
        if (!response.ok) throw new Error(response.status === 401 ? 'HOST_SOURCE_INVALID' : response.status === 404 || response.status === 410 ? 'APP_NOT_FOUND' : 'LAUNCH_UNAVAILABLE');
        const body = await response.text(); controller.signal.throwIfAborted();
        if (body.length > 16384) throw new Error('INVALID_LAUNCH_RESPONSE');
        let value: unknown; try { value = JSON.parse(body); } catch { throw new Error('INVALID_LAUNCH_RESPONSE'); }
        return readLaunchReceipt(value, origin);
      } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
    },
  };
}

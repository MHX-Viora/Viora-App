import { hostId } from '../../../services/mini-app-launch.service';

// Validation runs before mounting a native view, not just on later navigation.
export function nativeHostUrl(input: string, origin: string): string {
  const base = new URL(origin), url = new URL(input);
  const session = url.pathname.startsWith('/mini-app-host/run/') ? url.pathname.slice(19) : '';
  if (base.protocol !== 'https:' || base.origin !== origin || base.username || base.password ||
    url.origin !== origin || url.username || url.password || url.search || url.hash || url.href !== input ||
    (url.pathname !== '/mini-app-host' && !hostId(session))) throw new Error('NATIVE_HOST_NAVIGATION_DENIED');
  return url.href;
}

// isMainFrame and url must be attached by platform APIs in the local native
// module. Never call this on a ReactNativeWebView/partner JSON origin claim.
export function readNativeHostMessage(value: unknown, origin: string): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  if (event.isMainFrame !== true || typeof event.url !== 'string' || typeof event.data !== 'string' || event.data.length > 16384) return null;
  try {
    nativeHostUrl(event.url, origin);
    const data = JSON.parse(event.data);
    return data && typeof data === 'object' && !Array.isArray(data) &&
      data.channel === 'ankt.production.host' && data.version === 1 ? data : null;
  } catch { return null; }
}

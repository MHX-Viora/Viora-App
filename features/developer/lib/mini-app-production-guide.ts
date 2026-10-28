import {VERSION} from '../../../packages/miniapp-sdk/src/config';
import {DEFAULT_API_ORIGIN, DEFAULT_HOST_ORIGIN} from '../../../packages/miniapp-sdk/src/production';

export const productionMiniApp = {
  hostOrigin: DEFAULT_HOST_ORIGIN,
  apiOrigin: DEFAULT_API_ORIGIN,
  portalUrl: 'https://mxh.ankt.vn/developers',
  sdkVersion: VERSION,
  partnerLoginPath: '/api/auth/ankt/exchange',
} as const;

/** Public developer example; never derive the trusted Host from the current Portal URL. */
export function productionLoginScript(clientId = 'YOUR_REGISTERED_APP_ID') {
  if (clientId !== 'YOUR_REGISTERED_APP_ID' && !/^app_[A-Za-z0-9_-]{43}$/.test(clientId)) throw new Error('INVALID_CLIENT_ID');
  return `const ANKT = window.ANKTMiniApp.create({
  clientId: ${JSON.stringify(clientId)},
  hostOrigin: '${productionMiniApp.hostOrigin}',
  apiOrigin: '${productionMiniApp.apiOrigin}',
});

async function start() {
  await ANKT.init();
  const { code } = await ANKT.auth.getLoginCode();
  // This route belongs to YOUR backend, not to the ANKT API.
  const response = await fetch('${productionMiniApp.partnerLoginPath}', {
    method: 'POST', credentials: 'same-origin', redirect: 'error',
    cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error('PARTNER_LOGIN_FAILED');
  const session = await response.json();
  // Your app MUST handle this event: accept its own session and open its main UI.
  // The SDK does not update your router or session store for you.
  document.dispatchEvent(new CustomEvent('ankt:partner-login', { detail: session }));
}

start().catch(error => {
  document.dispatchEvent(new CustomEvent('ankt:login-error', {
    detail: { code: error.code || 'PARTNER_LOGIN_FAILED' },
  }));
});
window.addEventListener('pagehide', () => ANKT.dispose());`;
}

export function productionIntegrationHtml(clientId = 'YOUR_REGISTERED_APP_ID', version = VERSION) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('INVALID_SDK_VERSION');
  return `<script src="./ankt-miniapp.js?v=${version}"></script>\n<script>\n${productionLoginScript(clientId)}\n</script>`;
}

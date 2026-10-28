# ANKT Mini App SDK — Web / Android / iOS

## Result

SDK 0.3.0, 6,742 bytes, SHA-256
`13560f263e580eabe045e81064bd99eb5740647abf557aba8b8ba8e0e13b6463`.

- Source entry: `packages/miniapp-sdk/src/browser.ts`; auth: `src/host-auth.ts`.
- Build: `npm --prefix packages/miniapp-sdk run build`.
- Browser artifact: `packages/miniapp-sdk/dist/ankt-miniapp.js`.
- Public artifact: `public/sdk/ankt-miniapp.v0.3.0.min.js`.
- Public alias: `public/sdk/ankt-miniapp.js`; metadata: `public/sdk/manifest.json`.
- Deployment URL: `/sdk/ankt-miniapp.v0.3.0.min.js` (prepared locally, not deployed).
- Developer saves download as `ankt-miniapp.js`, calls
  `window.ANKTMiniApp.create({clientId})`. No npm/platform-specific partner code.
- API: `init`, `auth.getSession`, `auth.getUserInfo`, `auth.getAccessToken`,
  `auth.logout`, `app.getEnvironment`, `app.close`, `dispose`.
- Guide: `docs/miniapp-sdk-integration.vi.md`; standalone demo: `miniapp-demo/`.

## Security and native integration

iframe validates parent source and configured HTTPS origin. Native uses
ReactNativeWebView.postMessage(string); replies are injected window message events.
Presence of either transport does not establish authentication: a correlated launch
with PKCE S256 and successful backend exchange is required before exposing environment.
Native host checks configured HTTPS URL and onMessage native URL. A random 256-bit
per-document nonce from expo-crypto binds the top-frame bridge, since Android's
onMessage URL alone cannot identify a sending subframe. Host reply injection checks
URL and nonce again. Cross-origin navigation, reload, background and unmount destroy
the channel; backend sessions are revoked on disposal. A late launch is revoked.

Auth Bridge native screen now uses installed react-native-webview 13.15.0, independently
of the legacy custom module's iOS 27 gate. Legacy host/module remains intact behind
the existing flag. Enable `EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED=true`; native
screen also requires `EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED=true`. No .env files
or main ANKT authentication implementation were edited. Main JWT stays in host API
calls. The page receives only one-time codes and scoped Mini App tokens.

SDK tokens remain in memory, environment prefixes are verified, dispose removes
listeners and aborts active HTTP requests. Native bootstrap after load handles
Android before-content injection timing, with one correlated SDK retry.
Portal verifies decompressed SDK bytes and SHA-256, avoiding HEAD/compression errors.
Versioned files use immutable cache; build refuses different bytes for an existing
version. Alias and manifest revalidate; internal source maps are not published.

## Verification, 2026-10-26

| Check | Result |
|---|---|
| SDK unit/browser artifact tests | 23 passed |
| Mini App Host tests, including Android/iOS component harness | 44 passed |
| Documentation tests | 14 passed |
| Backend Auth Bridge/revocation regression | 20 passed, existing net8 test assembly |
| TypeScript | Passed |
| ESLint, changed SDK/Host/Portal files | Passed |
| Expo Web export | Passed; public SDK copied into export |
| Classic script in real Chrome | Standalone returns HOST_UNAVAILABLE; clean console |
| Local HTTP download | 200, JavaScript Content-Type, 6,742 bytes, immutable cache |
| Isolated browser/backend E2E | Sandbox login, Portal download/hash, reopen and Production login passed |
| Android device/WebView | Not run: adb reports no connected devices/emulators |
| iOS device/WKWebView | Not run: no suitable device or macOS simulator |
| Live Sandbox/Production | Not run; no production deployment performed |

E2E uses isolated PostgreSQL, real Auth Bridge endpoints, Developer authentication
and the actual downloadable classic SDK file. Test endpoints are explicitly
configured only in the fixture; no live account/database or .env is loaded.
Sandbox uses a shared database test identity; Production uses a signed fixture user,
not a fabricated successful auth response. Existing prebuilt .NET fixture/test
assemblies were used; backend application source was not changed by this task.

E2E harness now finds the current OOPIF after reopening instead of waiting on a
destroyed DevTools target. Legacy host unit harnesses explicitly render the wrapper's
selected component and stub the unused AuthHost import.

## Files updated

- `packages/miniapp-sdk/README.md`, `package.json`, `package-lock.json`.
- `packages/miniapp-sdk/src/config.ts`, `src/host-auth.ts`, `tests/host-auth.test.mjs`.
- `features/mini-apps/adapters/auth-host.native.tsx`, `auth-host.web.tsx`.
- `features/mini-apps/lib/auth-bridge-host.ts`.
- `features/mini-apps/tests/auth-bridge-host.test.ts`, `native-host.test.mjs`, `web-host.test.mjs`.
- `features/developer/components/mini-app-bridge-integration.tsx`, `mini-app-auth-bridge-preview.tsx`.
- `features/developer/docs/content/sdk-guides.ts`, `lib/content-schema.ts`, `reference/sdk.ts`.
- `features/developer/docs/tests/content-coverage.test.ts`, `search.test.ts`.
- `server/developer/vercel-base.json`, `scripts/build-mini-app-deployment.cjs`.
- Backend workspace: `tools/AuthBridgeE2E/fixture.mjs`, `miniapp.fixture.ts`, `portal.fixture.jsx`.

## Files added

- `packages/miniapp-sdk/src/browser.ts`, `scripts/build-browser.mjs`, `tests/browser.test.mjs`.
- `features/mini-apps/lib/native-auth-transport.ts`.
- `features/mini-apps/tests/native-auth-transport.test.ts`, `auth-host-native.test.mjs`.
- `public/sdk/ankt-miniapp.js`, `ankt-miniapp.v0.3.0.min.js`, `manifest.json`.
- `miniapp-demo/index.html`, `app.js`, `style.css`, `serve.mjs`, `ankt-miniapp.js`.
- `docs/specs/miniapp-universal-sdk.md`, `docs/miniapp-sdk-integration.vi.md`, this handoff.

## Log cleanup requested during implementation

Deleted 79 unrelated .log files (829,212 bytes) under this workspace, including
old header/footer, landing, auth polish, SSO provisioning and npm diagnostic logs.
Preserved Mini App, SDK, Auth Bridge, Sandbox and platform-stage logs. Excluded
node_modules, .git and native module build trees. Exact deletion inventory:
`.codex-tmp/miniapp-universal-log-cleanup.json`. No selected unrelated log remains.

## Remaining validation

Run on actual Android and iOS devices and live deployed environments before release.
Native URL policy intentionally requires the exact registered launch URL: redirects
or reloads require opening a fresh host session. Other Mobile features were not
modified; full device regression remains unverified.

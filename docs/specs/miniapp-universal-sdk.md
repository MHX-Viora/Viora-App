# ANKT Universal Mini App SDK

## Objective and acceptance
Reuse Auth Bridge and PKCE. Developers load one browser script and supply only
`clientId`. Sandbox and Production are verified by the host response and token
exchange, never selected by website parameters. No ANKT JWT enters a Mini App.

## Architecture
Keep existing TypeScript APIs and exact HTTPS origin overrides for existing
integrations. Browser defaults are the public ANKT API and `https://mxh.ankt.vn`.
Select iframe transport only for an embedded page; verify parent source and origin.
Top-level native pages use ReactNativeWebView.postMessage (string) and receive
host-injected window/document message events. Retain the hardened native bridge
for backward compatibility. A bridge global alone does not authenticate a host:
only a correlated PKCE launch and successful backend exchange establish a session.
Native host must verify actual main-frame URL/origin from native metadata, including
again after asynchronous launch, before sending a code. Dispose cancels requests.

## Structure and style
SDK: packages/miniapp-sdk/src; tests: packages/miniapp-sdk/tests.
Host: features/mini-apps. Portal: features/developer/components.
Distribution: public/sdk; standalone example: miniapp-demo.
Follow existing explicit TypeScript validation, e.g. `throw new MiniAppAuthError('INVALID_ORIGIN')`.

## Ordered tasks and verification
1. Add failing native/browser SDK tests; implement transport, defaults, lifecycle.
   Verify: `npm --prefix packages/miniapp-sdk test`.
2. Build single IIFE browser file with esbuild already installed. Generate metadata,
   immutable version artifact and downloadable copy; no source maps.
   Verify: execute artifact in browser and assert global API.
3. Replace workspace install instructions with real download, metadata and copy code.
   Add standalone HTML demo and Vietnamese developer guide.
   Verify HTTP JavaScript content type, file size/hash and standalone error.
4. Run host regression and backend Auth Bridge tests; record device/E2E limitations.
   Verify: `node --import tsx --test features/mini-apps/tests/auth-bridge-host.test.ts`.

## Boundaries
Always preserve existing authentication, unrelated changes and native origin checks.
Never read or publish .env secrets, send ANKT JWT into page, or claim unrun E2E passes.
No database migration, dependency addition or production deployment is needed.
The old native module has an iOS 27 availability gate. Auth Bridge now uses the
installed react-native-webview 13.15.0 independently of that module. A top-frame
bootstrap nonce compensates for missing Android subframe source metadata; native
URL and exact launch URL must also match. A load-end bootstrap covers Android's
unreliable before-content injection and prompts a single correlated SDK retry.

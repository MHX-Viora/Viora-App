# Local Portal with hosted Auth Bridge

Objective: run ANKT Portal at http://localhost:8081 against the existing HTTPS
backend while embedding the verified HTTPS Mini App website. Reuse the same SDK.

Contract: an explicit SDK hostOrigin may be an exact HTTP loopback origin
(localhost, 127.0.0.1 or [::1], including its port). API origin remains HTTPS.
Loopback hosts may establish Sandbox sessions only; reject Production launch
responses before exchanging a code. Preserve exact parent source/origin checks.
Default host remains https://mxh.ankt.vn; no automatic trust from referrer, query
parameters, unverified messages or wildcard postMessage.

Structure: packages/miniapp-sdk/src/host-auth.ts and tests; Portal integration
component generates a localhost-specific snippet only when opened on loopback.
Reuse current TypeScript errors, e.g. MiniAppAuthError('SANDBOX_HOST_ONLY').

Ordered tasks:
1. Add failing loopback success, Production rejection and unsafe HTTP origin tests.
2. Implement host-only loopback exception; release SDK 0.3.1 without changing 0.3.0.
3. Show current local Host origin in Portal's copied snippet and explain CSP/setup.
4. Verify unit tests, types/lint and browser loopback handshake with real backend
   fixture. Document hosted Render setup and live-test limitations.

Commands: npm --prefix packages/miniapp-sdk test; npx tsc --noEmit;
node tools/AuthBridgeE2E/run-fixture.mjs (backend workspace).

Boundaries: no primary auth changes, database migrations, relaxed Render CORS or
production setting updates. Keep website HTTPS/domain verification. Backend
chooses Sandbox from the authenticated Developer actor, not an SDK environment flag.
Tests must prove loopback cannot accept Production, source spoofing or nonloopback
HTTP hosts. Actual hosted account testing requires the user's signed-in browser.

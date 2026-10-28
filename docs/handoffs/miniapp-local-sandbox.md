# Local Sandbox Portal with hosted backend

SDK 0.3.1 adds an explicit loopback Host override for development. Default Host
remains https://mxh.ankt.vn. `hostOrigin: 'http://localhost:8081'` accepts Sandbox
only; Production launches fail with SANDBOX_HOST_ONLY before code exchange.
localhost, 127.0.0.1 and [::1] are allowed exact hostnames; port/source/origin must
match. API remains HTTPS; remote HTTP origins, paths, credentials and wildcard
hosts remain rejected. No environment selector or automatic referrer trust.

Changed: SDK host-auth.ts, version/package metadata; Portal integration sample
and local Sandbox guidance; SDK README, integration guide and .env.example.
Tests: local-host.test.mjs and extended backend tools/AuthBridgeE2E fixture.
Old immutable 0.3.0 artifact is preserved. No production backend/auth/schema change.

Artifact: public/sdk/ankt-miniapp.v0.3.1.min.js, 6,951 bytes.
SHA-256: d11fa5ead81550b3f57eb22c55ca9790fd144599817d6f83dca8d450cad4dd21.
Alias: public/sdk/ankt-miniapp.js; manifest updated; demo copy updated.

User setup:
1. FE ANKT uses EXPO_PUBLIC_API_URL=https://viora-back-end-xmco.onrender.com and
   EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED=true. Metro serves the existing BFF.
2. Run npx expo start --web --port 8081; use http://localhost:8081 consistently.
3. Replace the Mini App website's SDK with 0.3.1 and initialize with its Client ID
   and explicit hostOrigin=http://localhost:8081. Rebuild/deploy that website.
4. If CSP is present, temporarily add the exact local origin to frame-ancestors.
5. Open Sandbox in local Portal. Remove local SDK override/CSP grant for Production.

Render keeps MiniAppAuth__Enabled=true, SandboxTest__Enabled=true and
MiniAppAuth__AllowedHostOrigin=https://mxh.ankt.vn. Do not configure HTTP localhost
as Render AllowedHostOrigin. The verified Mini App website remains HTTPS.

Verification:
- SDK: 30 tests passed, including loopback success, Production rejection before
  exchange, insecure API rejection, deceptive hosts, wrong source and wrong port.
- Docs: 14 tests passed. TypeScript and focused ESLint passed.
- Real Chrome E2E with isolated HTTPS backend/PostgreSQL: canonical HTTPS Sandbox,
  Portal download/hash, reopen, Production, and HTTP localhost Sandbox all passed.
  Local case uses the real BFF, Developer login, PKCE exchange and database UserInfo;
  the local Portal's generated snippet pins its exact origin.
- User's live Render account/website flow has not been exercised by the agent.
  Website deployment is still required; downloading a new SDK locally is insufficient.

Auth Bridge success provides an ANKT Mini App identity. A separate website backend
must verify the Mini App token before creating or linking its own login session.

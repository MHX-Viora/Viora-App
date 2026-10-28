# ANKT Mini App SDK 0.4.1

Integrate your existing HTTPS website with production ANKT. You do not need the
ANKT source tree, a local ANKT server, or an npm installation.

| Service | Production address |
| --- | --- |
| Developer Portal | https://mxh.ankt.vn/developers |
| Trusted Web Host | https://mxh.ankt.vn |
| ANKT API used by this SDK | https://api.mxh.ankt.vn |
| Your website/backend | Your own registered HTTPS services |

The hosted API address is the implemented SDK default, not a requirement to run a
development backend. Your website origin must match its registration and your
backend's allowed Origin. No particular partner domain or new Sandbox subdomain
is required.

## Set up an application

1. Register a Developer account and verify email on the production Portal.
2. Create a Mini App, save its actual HTTPS Website URL, branding, support and
   policy URLs. Keep the issued App ID as the public Client ID.
3. Download the verification file from the configuration tab, publish it at the
   supplied verification URL, and verify the domain.
4. In **Tích hợp Auth Bridge**, download SDK 0.4.1 and self-host it as
   `ankt-miniapp.js`. The versioned source artifact is
   `/sdk/ankt-miniapp.v0.4.1.min.js`; `/sdk/manifest.json` records its SHA-256/size.
5. Register backend credentials with ANKT operations for the same Client ID and
   required environment. The Portal does not generate credentials. Once ANKT provisions the matching
   server secret, the app owner can reveal/copy it beside Client ID in the
   integration tab, selecting Production or Sandbox. Keep it in the appropriate backend.
6. Implement partner login and session validation as described below, then test
   through Sandbox on the hosted Portal. Submit a version for review and publish
   before testing real Production-user launches.

## Frontend

```html
<script src="./ankt-miniapp.js?v=0.4.1"></script>
<script>
const ANKT = window.ANKTMiniApp.create({
  clientId: 'YOUR_REGISTERED_APP_ID',
  hostOrigin: 'https://mxh.ankt.vn',
  apiOrigin: 'https://api.mxh.ankt.vn',
});

async function start() {
  await ANKT.init();
  const {code} = await ANKT.auth.getLoginCode();
  const response = await fetch('/api/auth/ankt/exchange', {
    method: 'POST', credentials: 'same-origin', redirect: 'error',
    cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({code}),
  });
  if (!response.ok) throw new Error('PARTNER_LOGIN_FAILED');
  const session = await response.json();
  document.dispatchEvent(new CustomEvent('ankt:partner-login', {detail: session}));
}
start().catch(error => document.dispatchEvent(new CustomEvent('ankt:login-error', {
  detail: {code: error.code || 'PARTNER_LOGIN_FAILED'},
})));
window.addEventListener('pagehide', () => ANKT.dispose());
</script>
```

**You must implement `/api/auth/ankt/exchange` in your own backend.** It is an
example route, not an automatically available ANKT endpoint. Change the fetch URL
if your backend uses a different route or origin, and configure exact-origin
CORS/CSRF accordingly.

**Your frontend must handle `ankt:partner-login`.** Accept the returned partner
session into the same auth store used by your ordinary login, perform any required
onboarding, and open your main screen. The event is emitted by this example, not
by the SDK itself; it does not update your session store or router automatically.
The session response format belongs to your application. Handle `ankt:login-error`
with a visible error/retry state. Keep your standalone website's existing login.

## Partner environment setup

The SDK does not read `.env` files. Your framework must embed public values in the
frontend build and pass them to `create`; your backend must map server variables
to its own authentication adapter. The names below are examples, not new SDK API.

Frontend Expo / React Native Web, in the frontend project's `.env` or CI build env:

```dotenv
EXPO_PUBLIC_API_URL=https://api.miniapp.example.com
EXPO_PUBLIC_ANKT_CLIENT_ID=YOUR_REGISTERED_APP_ID
EXPO_PUBLIC_ANKT_API_ORIGIN=https://api.mxh.ankt.vn
EXPO_PUBLIC_ANKT_HOST_ORIGIN=https://mxh.ankt.vn
```

`API_URL` is **your** backend, not ANKT. Replace the example website/API domains
with your registered services. Read the values with literal Expo accesses:

```javascript
const ANKT = window.ANKTMiniApp.create({
  clientId: process.env.EXPO_PUBLIC_ANKT_CLIENT_ID,
  hostOrigin: process.env.EXPO_PUBLIC_ANKT_HOST_ORIGIN,
  apiOrigin: process.env.EXPO_PUBLIC_ANKT_API_ORIGIN,
});
const partnerApi = process.env.EXPO_PUBLIC_API_URL;
// In start(), POST the code to partnerApi + '/api/auth/ankt/exchange'.
```

For plain HTML use the explicit configuration in the earlier script; browsers do
not provide `process.env`. Vite uses its own `VITE_*` / `import.meta.env` convention.
Do not expose a server secret through any public frontend prefix.

Backend service / secret manager (map names into your adapter):

```dotenv
ANKT_API_ORIGIN=https://api.mxh.ankt.vn
ANKT_MINI_APP_CLIENT_ID=YOUR_REGISTERED_APP_ID
ANKT_MINI_APP_CLIENT_SECRET=REPLACE_WITH_REGISTERED_PRODUCTION_SECRET
ANKT_MINI_APP_ENVIRONMENT=Production
MINI_APP_ORIGIN=https://miniapp.example.com
```

For a .NET backend that binds the `AnktMiniApp` configuration section, use this
alternative set rather than assuming the Node-style names are read automatically:

```dotenv
AnktMiniApp__Enabled=true
AnktMiniApp__ClientId=YOUR_REGISTERED_APP_ID
AnktMiniApp__ClientSecret=REPLACE_WITH_REGISTERED_PRODUCTION_SECRET
AnktMiniApp__ApiOrigin=https://api.mxh.ankt.vn
AnktMiniApp__HostOrigin=https://mxh.ankt.vn
AnktMiniApp__MiniAppOrigin=https://miniapp.example.com
AnktMiniApp__Environment=Production
```

Use the real website origin for login Origin/CSRF checks and exact-origin CORS when
the backend is separate. Preserve your own database/session signing configuration.
After backend env changes, restart/redeploy the backend. After frontend env changes,
rebuild and deploy the full frontend artifact; Nginx reload alone does not embed env.
Sandbox keeps the same production Host/API domains but uses separate server
credentials, verified expected environment `Sandbox`, and isolated test data.

Full [frontend/backend environment guide](https://mxh.ankt.vn/developers/docs/environment-setup).

## Backend login

`init()` and `getUserInfo()` establish Bridge/profile access only. They do not log
the user into your backend. `auth.getLoginCode()` obtains a fresh, one-use
43-character code valid for 60 seconds. Send only that code to your backend.

Your backend calls ANKT over HTTPS:

```http
POST /api/miniapp/auth/partner/exchange HTTP/1.1
Host: api.mxh.ankt.vn
Authorization: Basic BASE64_OF_REGISTERED_CLIENT_ID_AND_SERVER_SECRET
Content-Type: application/json

{"code":"ONE_USE_CODE_FROM_SDK"}
```

Do not send an `Origin` header to this server-only endpoint, or forward browser
Authorization/cookies. ANKT returns `user`, `miniAppId`, `environment`, `sessionId`
and `expiresAt` (ISO datetime). Validate the exact app, expected environment and
expiry. Atomically find/create your account by `(miniAppId, environment, user.id)`
and issue your own application session with an expiry no later than the grant.
Never link accounts by display name, username or a browser-supplied ID.

Before each protected backend operation or session restoration, validate the
stored grant using the same server credentials:

```http
POST /api/miniapp/auth/partner/session HTTP/1.1
Host: api.mxh.ankt.vn
Authorization: Basic BASE64_OF_REGISTERED_CLIENT_ID_AND_SERVER_SECRET
Content-Type: application/json

{"sessionId":"PREVIOUSLY_VERIFIED_GRANT_UUID"}
```

Compare app/environment/user/grant/expiry with server-side session metadata.
Expired or revoked grants deny access. On reopen/account replacement, confirm
current ANKT identity before showing cached application UI. A partner grant lasts
no longer than the parent Bridge launch (at most 15 minutes); profile token renewal
does not extend an existing partner grant. Do not retry an ambiguous code exchange
with the same code; request a fresh code on an explicit retry. Avoid renewal loops.

## SDK API

| Method | Purpose |
| --- | --- |
| `init()` | Authenticate the Bridge; no partner session is created. |
| `auth.getUserInfo()` | Read the verified ANKT profile. |
| `auth.getSession()` | Read sessionId, environment, expiresAt (Unix ms), scope. |
| `auth.getLoginCode()` | Fresh `{code, expiresIn: 60}` for your backend; SDK 0.4.1. |
| `auth.getAccessToken()` | Scoped Mini App token; not the main ANKT JWT. |
| `auth.logout()` | Revoke the Mini App token; clear your partner session too. |
| `app.getEnvironment()` | `null` before verification/after expiry; otherwise `sandbox` or `production`. |
| `app.close()` | Revoke the Mini App token, request Host close, dispose SDK. |
| `dispose()` | Remove listeners, abort requests and clear in-memory state. |

One file supports Web iframe and Android/iOS ANKT WebViews. No secrets or codes
belong in URLs, browser storage or logs. Calling the SDK outside a trusted Host
fails `HOST_UNAVAILABLE`. Production browser CSP must allow
`frame-ancestors https://mxh.ankt.vn` and API connections to the ANKT API. Remove
conflicting `X-Frame-Options: DENY/SAMEORIGIN` from the embedded entry page.

## Sandbox, release and deployment

Sandbox runs on the production Developer Portal but issues verified test identity.
It is not a frontend URL flag. Use separate Sandbox/Production server credentials
and isolate test accounts/data/sessions. A Production backend must require verified
`environment === 'Production'`. `Connected` in the Portal proves the Bridge, not
partner account/session creation; verify the complete login and protected API flow.

When updating SDK, replace the file **and** script version query. Deploy the entire
frontend artifact; revalidate HTML and use versioned/hashed assets. Framework build
variables are embedded at build time, not by restarting Nginx. Check the bundle
actually served. SDK 0.3.x lacks partner login codes and must be upgraded for this
flow.

Vietnamese walkthrough: [production integration guide](../../docs/miniapp-sdk-integration.vi.md).
Public reference: [SDK](https://mxh.ankt.vn/developers/docs/sdk) and
[backend login](https://mxh.ankt.vn/developers/docs/auth-bridge).
The repository's `miniapp-demo/` demonstrates **profile access only**, not an
application backend login. Do not use its Connected status as proof of partner login.

## ANKT maintainers only

This section is not required for external developers. Build distributions/types
with `npm --prefix packages/miniapp-sdk run build`, verify with
`npm --prefix packages/miniapp-sdk test`. The package is private, not a public npm
installation requirement. Its optional TypeScript source entry is
`createAnktMiniApp` from `@ankt/miniapp-sdk` or `@ankt/miniapp-sdk/bridge-auth` in a
workspace where the package is already available. It exposes the same methods.
Local platform testing is documented separately in
[internal local development](../../docs/operations/miniapp-local-development.md).
Never change already released versioned SDK bytes without a version increment.

# @ankt/miniapp-sdk (unpublished)

Independent ESM/TypeScript browser package; no React or client secret. Version
0.1.0 is private and has not been published. Build requires Node 22.13+; browser
runtime requires WebCrypto, Fetch, AbortSignal and sessionStorage on HTTPS.

```sh
npm ci
npm test
npm run build
```

```ts
import {createMiniAppSdk, SdkError} from '@ankt/miniapp-sdk';

const sdk = createMiniAppSdk({
  issuer: 'https://identity.example/',
  clientId: 'public-client-id',
  redirectUri: 'https://partner.example/callback',
  scope: 'openid profile',
  timeoutMs: 15000,
});
await sdk.initialize();
// On a user gesture, from a top-level page:
await sdk.auth.login();
// On the configured callback page:
await sdk.auth.handleRedirect(new URL(window.location.href));
history.replaceState(null, '', '/'); // remove code/state from the address bar
const user = await sdk.auth.getUser();
console.log(user.sub); // store partner identity by (configured issuer, sub)
```

Use the configured issuer identifier, not a discovery-document URL. All discovered
endpoints must remain on that HTTPS origin. Callback URLs have no query/fragment.
S256 PKCE, state, nonce, RS256 signatures/JWKS, issuer/audience/lifetime and UserInfo
subject are checked by `openid-client` 6.8.8; signature validation is explicitly
enabled with `enableNonRepudiationChecks`. Supported scopes: openid/profile/email.
Only genuinely verified email is released by the server; never merge by email.

`auth.login({navigate:false, prompt:'consent'})` returns a URL for controlled
top-level navigation. Default login refuses iframe navigation; opening a real host
is separate bridge work. `prompt:'none'` can fail when login/consent is needed;
the SDK does not promise silent login. Transactions overwrite one bounded slot per
issuer/client/callback and expire in five minutes. Only transient PKCE/state/nonce
are in sessionStorage; tokens are private and stay in memory. Reload after callback
requires another top-level authorization. Storage unavailable returns a typed error.

`auth.getStatus()` reports local, unexpired in-memory state; `getUser()` checks the
live resource. `auth.logout()` clears local identity and pending transaction and
prevents outstanding operations from restoring it. It does not revoke consent,
log out ANKT or terminate a separate backend partner session. No refresh tokens.
Handle errors by `SdkError.code`; messages never include protocol credentials.
Never log tokens, callback URLs, verifier, challenge or client secrets. Configure
the callback page with `Cache-Control: no-store`, `Referrer-Policy: no-referrer`
and a restrictive CSP, and remove callback parameters immediately after processing.

Unit tests use cryptographically signed fixtures and intercepted network requests.
The separate real HTTPS E2E command below uses the actual server and partner
examples. Native platform APIs remain unsupported.

## Controlled host bridge

```ts
import {connectHostBridge} from '@ankt/miniapp-sdk';
const bridge = await connectHostBridge('https://trusted-host.example');
if (bridge.insideHost) console.log(await bridge.getContext());
await bridge.close();
bridge.dispose();
```

The host origin comes from trusted application configuration, never a query string
or received message. A verified handshake is required; only getContext/close are
implemented. Native and social-auth methods are unsupported. Transport verifies
exact origin/source/version/schema and random request IDs, caps pending calls at
32, checks method permissions, times out and cleans up on pagehide/dispose. No
arbitrary payloads or credential exchange. Invalid host data returns typed errors.

After `npm run build`, start the independent fixture from backend root:

```powershell
dotnet run --project tools/SsoBridgeHost --no-launch-profile -- C:/Users/minec/ANKT/dev/viora/packages/miniapp-sdk
```

Open `https://localhost:5461/host.html`. This loopback-only fixture uses an ephemeral
self-signed certificate and serves the child at `https://localhost:5462`. Chrome
needs a local certificate-warning exception; it does not change system trust.
Windows Schannel private-key use may require the approved unsandboxed test context.
Do not expose the fixture publicly. It loads no application DB/configuration.
The host verifies request schema/source/origin and advertises only its implemented
methods. Its iframe sandbox allows scripts and its own origin, without navigation
or popup permissions. Click the child controls to verify context and close.

References: [OpenID client code exchange](https://github.com/panva/openid-client/blob/main/docs/functions/authorizationCodeGrant.md),
[signature validation](https://github.com/panva/openid-client/blob/main/docs/functions/enableNonRepudiationChecks.md),
[UserInfo subject validation](https://github.com/panva/openid-client/blob/main/docs/functions/fetchUserInfo.md).

## Public and confidential examples

`examples/public` bundles this SDK into a secret-free SPA. `examples/confidential`
uses openid-client on the server and issues a separate protected opaque session
cookie; the browser never receives its token or client secret. Both intentionally
bind loopback and use in-memory sessions/storage for demonstration.

Start the isolated issuer from backend root (`dotnet build tools/SsoE2EHost`, then
`dotnet run --project tools/SsoE2EHost --no-build --no-launch-profile`). From this
package, run `npm run build`, then `npm run example:fixture -- GENERATED_DIRECTORY`.
The host prints the temporary directory path; do not print its private fixture file.
Open `https://127.0.0.1:5490/`, `https://localhost:5491/` and
`https://127.0.0.2:5492/` with local certificate exceptions only.

In another PowerShell terminal, set `$env:NODE_EXTRA_CA_CERTS` to the generated
directory's `root-ca.pem`, then run `npm run test:sso:e2e`. This opt-in command
executes real public SDK/confidential exchanges, consent/reconsent, UserInfo,
reload/local logout, owner revocation, CSRF rejection and callback injection.
It supplements the separately executed Chrome cookie/CSP/navigation checks.
Stop partners before stopping the issuer so its temporary storage can be removed.

See [setup, integration and key rotation](../../../viora-BE/docs/operations/developer-platform-stage-5.md)
and [security/browser evidence](../../../viora-BE/docs/testing/developer-platform-stage-5-security.md).
No public-domain, native or production deployment validation is implied.

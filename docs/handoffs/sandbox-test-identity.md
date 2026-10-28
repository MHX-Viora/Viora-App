# Sandbox Test account UI

Primary Sandbox view loads owned app metadata and `/sandbox-test`; it does not
call `/sandbox/config`. `MiniAppSandboxAccount` renders the Cloudinary profile,
readiness, callbacks, run/reopen/revoke actions and actual protocol observations.
The managed host/executor panel is explicitly opt-in under advanced testing.

Launch keeps an opaque one-time ticket in memory and submits it by POST from a
new popup to the exact issuer endpoint. No tokens/secrets/profile IDs are placed
in URLs or logs. The BFF exposes owner overview/create/revoke only; issuer start
is not proxied. FE CSP permits form POST to the configured issuer only on Sandbox
routes, even without ANKT_SANDBOX_HOST_ORIGIN.

Backend migration, API/claim contracts, image provisioning and deployment steps:
`viora-BE/docs/operations/sandbox-test-identity.md`. Deployment requires matching
BE/FE and the account marker migration. Live localhost testing against Render
needs that portal origin explicitly allowed on BE. No separate Sandbox hostname.

Frontend verification: 81 Developer/BFF tests passed; changed TypeScript and
ESLint checks passed. Browser E2E imports this actual component and actual BFF,
authenticates to a disposable .NET/OpenIddict/PostgreSQL backend, then validates
real partner PKCE/code/ID token/UserInfo in isolated Chrome contexts A/B.

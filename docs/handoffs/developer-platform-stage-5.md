# Developer Platform Stage 5 — frontend/SDK completion

Updated 2026-10-17. Canonical evidence and remaining tasks:
[backend handoff](../../../viora-BE/docs/handoffs/developer-platform-stage-5.md).

Tasks 1–28 implemented and verified locally; production/public-domain and native
verification remain separate release prerequisites.
New independent private package `packages/miniapp-sdk`: strict public-client config,
real OIDC library signature/PKCE/state/nonce/claims checks, transient transactions,
memory-only tokens, local logout and verified host bridge. SDK tests: 19 passed;
root TypeScript and existing Developer Portal/SSO tests: 32 passed.

Controlled real Chrome iframe HTTPS handshake/context/close verified with no console
warnings/errors. This is bridge evidence, not real OIDC browser/server E2E or native
runtime validation. At checkpoint 22 no app UI/runtime import was changed, no package was
published, and unrelated frontend edits were preserved. No production export rerun.

Task 24 adds the integrated `Đăng nhập ANKT` tab: explicit environment/type/scopes/
callback settings, accurate diagnostics/copy fields and secret-free snippets,
loading/error/retry and dirty navigation/create-discard/reset. Its BFF allows
configuration GET/PUT only; owner backend credential provisioning/rotation routes
are blocked. Production does not borrow Sandbox callbacks or grant publication.

Latest Developer/BFF/SSO tests: 34 passed. TypeScript and focused lint passed.
Actual React detail/panel components in an isolated local rendering fixture passed
save, empty Production defaults, create-discard/cancel, deliberate 503/retry and
320px/no-overflow. This is component behavior evidence, not live browser OIDC E2E.
Final production web export passed after all UI changes. Prior SDK/bridge evidence
remains unchanged.

Final Tasks 25–28: `packages/miniapp-sdk/examples/public` and `confidential` provide
actual public SDK/server-side OIDC flows, supported by the backend's independent
`tools/SsoE2EHost`. Real Chrome verified consent, repeat login, UserInfo, reload,
logout, revocation and reauthorization for both types; separate pairwise subjects
remain stable. Successful final pages have no console errors/warnings.

`npm run example:fixture -- GENERATED_DIRECTORY` starts both partner examples;
`npm run test:sso:e2e` runs real HTTPS public/confidential protocol/session checks
with the temporary CA configured. See the backend runbook for exact setup/cleanup.
The E2E HTTP driver supplements Chrome cookie/CSP checks. SDK unit tests: 23;
Developer/BFF 27 + first-party bootstrap 7; root TypeScript passed. Backend final:
329 passed/1 pre-existing skip, clean solution build. SPA NodeList iteration fixed
for the root TS DOM configuration; no new app runtime imports or dependencies.

[27-case security/browser report](../../../viora-BE/docs/testing/developer-platform-stage-5-security.md)
and [integration/key rotation/environment runbook](../../../viora-BE/docs/operations/developer-platform-stage-5.md)
complete the handoff. Fixture stopped and temporary issuer data removed.
No publication, deployment, production migration or commit.

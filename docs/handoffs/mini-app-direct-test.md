# Direct Mini App test

When `/sandbox/config` returns exactly HTTP 503 / SANDBOX_DISABLED, the owner
page retains app data and offers the registered HTTPS website in a separate tab.
SSO readiness comes from existing `/mini-apps/{appId}/sso`; configuration does not
prove an actual login or SDK connection. The partner still initiates OAuth and
the ANKT social session/consent remains independent of Developer authentication.

No backend API, runtime permission, cookie, evidence, DNS or Render configuration
changes. Enabled managed Sandbox keeps its existing flow. Other errors still
fail; no direct test is shown when owner lookup fails.

Files: sandbox-page.ts loader/URL validation, mini-app-direct-test.tsx view,
mini-app-sandbox.tsx integration, account-client.ts optional structured error code.
Spec/plan: docs/specs/mini-app-direct-test.md.

Local FE needs the updated bundle (reload or restart Metro); deployed FE needs
a rebuild. No dedicated Sandbox hostname is required for direct website testing.
Live SSO requires a configured issuer, ready Sandbox OAuth client and a partner
website implementing PKCE/callback. The UI fixture is not live SSO acceptance.

Verified: 23 focused tests (loader, SSO parser, transport, proxy/handler, CSP and
evidence rendering), TypeScript noEmit and changed-file ESLint passed. Browser
fixture verified at 375x667 with no horizontal overflow and a noopener/noreferrer
launch link. Live Render/partner login was not exercised.

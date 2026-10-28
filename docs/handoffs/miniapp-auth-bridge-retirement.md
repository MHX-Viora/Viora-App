# Mini App Auth Bridge frontend retirement

Date: 2026-10-26. No commit or deployment performed.

## Contracts
- SDK 0.2.0 private: root exports createAnktMiniApp, MiniAppAuthError and Host Bridge; bridge-auth subpath retained. No openid-client dependency.
- Account MiniAppReview reads appVersion from GET mini-apps/{appId}; version update sends requestId, concurrencyToken, versionName only.
- Integration PUT sends six website/profile/policy fields. No secret or callback configuration.
- Historical snapshot fields remain read-only parser input for stored review hash compatibility; no UI exposes them. Historical non-applicable protocol checks omitted from readiness UI.
- BFF no longer forwards sso, credentials, redirect-uris, production-credentials or legacy sandbox-test routes.

## UI and SDK
Seven horizontally scrollable tabs. Bridge integration shows public ID, launch URL, website origin, real domain status, local SDK install, automatic login example and copy feedback. Sandbox preview reports handshake state and errors. Removed first-party SSO login/bootstrap/return handling, OIDC SDK auth/popup modules and public/confidential examples. PKCE and one-time exchange remain in host-auth.ts.

## Verification
- TypeScript: npx tsc --noEmit passed.
- SDK: npm --prefix packages/miniapp-sdk test: 15 passed.
- Developer/BFF unit suite: 77 passed, zero skipped.
- Documentation suite: 14 passed. docs:check: 16 pages / 50 API operations. Static documentation build passed.
- Chrome Portal synthetic test: seven tabs, Copy Client ID, bridge metadata, no legacy calls, no console errors; no overflow at 320/768/1024/1440.
- Browser command: node features/developer/tests/auth-retirement.browser.mjs (requires ANKT_CONSOLE_PREVIEW_PORT=5496 node features/developer/tests/serve-console-ui.cjs).
- Actual identity/API auto-login E2E handled by backend AuthBridgeE2E fixture; synthetic Portal test does not prove real login.

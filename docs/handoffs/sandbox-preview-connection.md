# Sandbox preview connection diagnostics

2026-10-26. Local changes only; no deployment, database writes, or commits.

- Reproduced Portal timer overwriting launch failures with `HOST_UNAVAILABLE`.
- Preview now retains backend error codes, reports rejected client identity, and distinguishes a missing handshake from a stalled authentication exchange/profile acknowledgement.
- A message from the current iframe on a different origin reports `INVALID_ORIGIN`; source/origin authorization remains enforced by the host.
- Live read-only check: nghethuatso.vn uses SDK 0.3.1, hostOrigin `http://localhost:8081`, public client `app_4gz57ReY-lzgqe5iAS8_btcuuaNnbYkFb2kWdqQNQCo`. Actual Chrome iframe at that origin emitted `auth.login`. Live exchange/me CORS preflights and local Developer API health succeeded.
- Browser regression uses synthetic account/API data; proves diagnostics only. Run from viora: `node features/developer/tests/auth-bridge-preview.browser.mjs`. Covers launch failure, exchange timeout, connected session, and missing handshake. Host unit tests pass; changed-file ESLint passes.
- Full Developer suite: 76/77 passed. Existing CSP test assumes the Developer policy is `base.headers[0]`, but current base has another rule first. Policy generation assertions pass; no CSP files changed here.
- User confirmed exact Portal URL `http://localhost:8081/developers/console/apps/app_4gz57ReY-lzgqe5iAS8_btcuuaNnbYkFb2kWdqQNQCo/sandbox`; host and client match.
- Live website SDK and web bundle both use `Cache-Control: max-age=604800` (seven days). Earlier downloaded SDK 0.3.0 rejects localhost with INVALID_ORIGIN before emitting auth.login; 0.3.1 accepts it. Earlier bundle also used a placeholder host, with the same asset filename as the corrected bundle. Stale partner assets are a reproduced plausible cause, pending confirmation in the user's browser.
- Integration snippet/README now add SDK version query to the script URL. Upgrading requires replacing the file and changing its version query. This does not invalidate a partner's existing cached bundle or service worker.
- Actual user auto-login remains unverified: owned config/launch require the user's Developer session. User asked to retry with browser cache disabled. Partner website source is not in this workspace; no partner deployment performed. Do not claim actual login fixed from synthetic tests.

## User confirmation

User subsequently reported `Đã kết nối ANKT · ANKT Sandbox User (@ankt_sandbox_test) · sandbox`, followed by `Kết nối này chưa đăng nhập hoặc liên kết tài khoản Nghệ Thuật Số.` This confirms host SDK/profile success in the user's session; no independent assertion of a Nghệ Thuật Số login.

Partner source located read-only outside this workspace at `C:/Users/minec/Digital-Creative/Digital_Creative_App`. `services/ankt-miniapp.ts` calls only init/getUserInfo and returns projected profile state; `components/ankt/AnktConnectionStatus.web.tsx:38` intentionally renders the no-login message. It never establishes a partner application session. Existing partner backend AnktAuthService uses an older code/callback identity.login protocol, distinct from the current profile bridge. A secure bridge-to-partner login needs separate partner backend work; accepting browser-supplied user IDs would not establish trusted identity. No partner files changed.

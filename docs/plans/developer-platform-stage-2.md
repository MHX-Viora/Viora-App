> Historical architecture. Superseded by [Developer integrated into FE](../handoffs/developer-integrated-fe.md). The current feature runs inside the root Expo application.

# Developer Authentication — Stage 2

## Scope and decisions
Keep the approved shared origin and `/developers` basePath. Implement independent Developer accounts without changing ANKT Account/User auth. Stage 1 foundation is present and verified. Audit finds no shared email sender and no OAuth/OIDC provider: add configurable SMTP delivery; ANKT federation remains an explicit unavailable dependency, never JWT passthrough or email-based auto-linking.

## Architecture and boundaries
- .NET shared AppDbContext, new independent Developer account/session/token/identity/audit entities with UTC timestamps, unique normalized email and provider+subject, indexes/FKs. Additive reversible migration only; do not apply to configured production DB.
- ASP.NET Identity PasswordHasher, 12–128 character passwords, cryptographically random 256-bit opaque tokens stored as SHA256 hashes. Email/reset tokens single-use and expiring. No token logging.
- Portal BFF is an explicit allowlisted proxy. Backend accepts a dedicated DeveloperSession authorization scheme, never ANKT JWTs. Browser receives only a host-only HttpOnly/Secure/SameSite=Lax cookie scoped to /developers; no localStorage auth. Cookie session maximum 8h, remember maximum 30d, 8h idle renewed by refresh within absolute bound. Database revocation/status verification on every authenticated call.
- BFF writes require exact configured Origin, JSON and a custom header. No wildcard credentialed CORS, no arbitrary proxy targets, no forwarding ANKT cookies/Authorization. SSR session loading is no-store with no guest flash. Profile/console APIs enforce DeveloperActive server-side.
- Login uses generic failures, persistent account lockout plus IP rate limiting; neutral registration/recovery/resend responses and cooldowns. SMTP errors sanitized and audited; real email transport required. No public token-return/test-auth endpoint.
- SMTP sends after committed token creation. A delivery failure is not a fake success guarantee: neutral responses instruct users to resend, and operators receive sanitized failure logs. Production SMTP credentials remain external.
- Verification/reset links use URL fragments, consumed by an explicit POST, avoiding tokens in server access logs. Reset/change password revoke all sessions. Sensitive account changes require current password. No email changes in this stage.

## Ordered slices
1. Domain/contracts/model and focused failing security tests; inspect configured schema read-only and generate migration without applying it.
2. Password, token, email and session services; registration/verification/login/reset/profile/audit. Verify against isolated real SQL database and HTTP server.
3. Dedicated auth scheme, typed API validation/error mapping, IP policies; unavailable federation contract; verify unauthorized/wrong-scheme/CSRF/rate-limit/revocation paths.
4. BFF cookie/origin boundary, SSR protected routes/header, registration/login/verification/recovery/settings/dashboard forms with accessible inline states.
5. Build, tests and browser E2E with real backend/database and a local SMTP sink. No mocked authentication. Preserve pre-existing FE changes and record deployment/dependency limits.

## Commands
BE: `dotnet test Viora.Application.Tests/Viora.Application.Tests.csproj -m:1 -nr:false -p:UseSharedCompilation=false`; EF: `dotnet ef migrations add AddIndependentDeveloperAccounts --project Viora.Infrastructure --startup-project viora-BE`. Generate/review SQL before any production approval.
Portal: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:smoke`; E2E uses a disposable local database and SMTP sink, never the configured production database.

## Success criteria
Real registration → email verification → login → protected dashboard → persisted profile/security settings → password change → logout → login with new password. Test duplicates/invalid inputs, expired/consumed tokens, suspended/pending users, wrong credentials, refresh/logout/revocation, CSRF, unauthorized/wrong auth scheme, throttling and frontend error/loading/session restoration. No Mini App APIs or Stage 3 operations. Document unavailable federation and production migration/SMTP requirements accurately.

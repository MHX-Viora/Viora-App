> Historical architecture. Superseded by [Developer integrated into FE](developer-integrated-fe.md). The current feature runs inside the root Expo application.

# Developer Platform — Stage 2

## Result
Independent real Developer authentication at `/developers`, backed by shared ANKT BE/database. Registration, verification, login, password recovery/change, account profile and session management implemented. Existing ANKT auth and prior settings/notification changes preserved. No Mini App API or Stage 3 work.

## Frontend structure
- `developer-portal/src/components/auth-form.tsx`: real register/login/verify/forgot/reset forms with inline validation, loading/errors, password visibility/autocomplete, consent, resend cooldown and fragment-token handling.
- `account-settings.tsx`: persisted name/avatar, read-only verified email, current-password change, own session list/revocation/logout-all confirmation, linked account status/last-method protection.
- `account-menu.tsx`: authenticated avatar/dropdown/logout, public Console link, Console guide link, focus/periodic idle renewal. Header restores the account server-side with no guest flash.
- `src/lib/account-proxy.ts`, `account-client.ts`, `developer-session.ts`, `developer-cookie.ts`, `developer-types.ts`: allowlisted BFF, exact-origin/custom-header CSRF, bounded JSON, no ANKT credential forwarding, server-only cookie/session loading and typed DTO validation.
- `src/app/api/account/[...path]/route.ts`: sanitizes responses and removes raw session credentials before JSON reaches the browser.
- Console layout protects all routes by real server-side session validation; guest redirects retain the single `/developers` prefix. Backend outage renders an unavailable state rather than claiming logout. Overview is the requested empty state; Create Mini App is unavailable; arbitrary app detail IDs return 404.
- `src/proxy.ts`: fresh script CSP nonces for dynamic HTML. Existing metadata/sitemap retained; account/console routes noindex. HTML/account responses are private/no-store.
- `deploy/nginx-locations.conf`: same domain/path, trusted client-IP header overwritten by Nginx. Account settings/terms and public capability labels updated to current Stage 2 scope.

## Cookies and deployment
HTTPS uses `__Secure-ankt_developer`, HttpOnly/Secure/SameSite=Lax, host-only, Path=/developers. Local HTTP loopback uses a separate name. No localStorage tokens, no developer access/refresh JWT pair, no raw session credential in browser JSON. Remember-me only controls persistent cookie/hard lifetime; database revocation remains authoritative.

Production needs SITE_ORIGIN, ANKT_API_BASE_URL, ANKT_BFF_SHARED_SECRET matching BE DeveloperAuth__BffSharedSecret and an ingress-overwritten X-ANKT-Client-IP header. Anonymous quotas use signed client attribution; protected quotas use authenticated account IDs. Incorrect production ingress fails closed. Same-origin paths share a browser security boundary; both ANKT and portal must prevent XSS.

See `developer-portal/README.md` for local/build/test/deployment steps, API/route tables, SMTP variables, rollback and Stage 3 prerequisites. Backend migration: `20261015074801_AddIndependentDeveloperAccounts`; five additive Developer tables, purpose-combined action tokens, no old ANKT data changed. Configured DB schema was inspected READ ONLY; migration was not applied there.

## Verification
- Portal unit tests: 14 passed (including cookie security, origin/CSRF, API allowlist/credential isolation, input validation, signed ingress, MIME test-sink decoding and Stage 1 regression coverage).
- Production HTTP smoke: 3 passed, covering public SSR/SEO/CSP nonces, noindex auth forms, protected guest redirects, sitemap and health.
- Real E2E passed: register → receive actual SMTP verification → verify → login → protected dashboard → persist profile → change password → logout/login → SMTP reset → login/logout-all. Actual services and isolated SQLite, no fake authentication; tokens/passwords are not printed.
- Production Next build and strict TypeScript passed. Runtime npm audit and backend NuGet audit: zero reported vulnerabilities after patching the new mail dependency's transitive PKCS package.
- BE full suite: 83 passed, 1 pre-existing database-dependent audit skipped; model/DDL and reversible migration boundary checks passed.
- Chrome DevTools: real login and generic wrong-password error, form validation/focus, disabled loading state under Slow 3G, reload session restoration, no guest links after login, profile save, password change/re-login, avatar logout and logout-all confirmation/cancel. Final CSP build hydrates correctly with no browser console errors; authenticated Console has no overflow at 320/375/768/1024/1440px.
- No production data writes, migration application, deployment, secret edits, commit or push. Temporary integration processes/database are stopped/removed after checks.

## Explicit dependencies/limits
ANKT OAuth/OIDC provider does not exist: Continue with ANKT remains disabled and backend start/callback return 501. No automatic email matching, JWT passthrough or fake SSO. Organizations, Mini App creation, Sandbox, SDK, review/publishing are outside Stage 2.

Production SMTP deliverability, VPS routing/forwarded-IP trust, HTTPS cookies on the actual host, migration execution, PWA update activation and operational terms/retention approval require deployment verification. Synchronous SMTP has timing/retry limitations; an encrypted durable outbox is a future reliability option. Native ANKT app behavior is unchanged by Stage 2.

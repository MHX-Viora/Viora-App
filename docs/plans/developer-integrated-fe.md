# Integrate Developer into ANKT FE

## Objective and contract
Developer is a feature of the existing Expo FE, not a nested Next application. One root package, one `npm run web`, one web build. `/developers` and all nested public/auth/console URLs open directly on the same origin, without iframe, external-port redirect, or ANKT social-login requirements. Existing Stage 2 registration, verification, recovery, profile and session behavior remains real and isolated.

## Structure and style
Expo routes under `app/developers/`; web views, scoped styles and account state under `features/developer/`. Reuse the existing public page content and account forms. Native route offers the production web portal. Root `server/developer/` implements the existing same-origin HttpOnly cookie BFF, shared by Metro development middleware and root Vercel API function. No separate package/server command. Example: `getDeveloperPortalUrl(origin)` returns `${new URL(origin).origin}/developers`.

## Tasks and checks
1. Move the framework-independent cookie/proxy boundary into the root FE server module; prove CSRF, credential isolation, token stripping and cookies with Node HTTP tests.
2. Adapt existing views to Expo routes with a scoped developer shell and cookie-backed client session provider; retain all auth/account/public pages. Guest Console verifies server session before redirecting. No global ANKT stylesheet changes.
3. Add root Metro and Vercel routing for the BFF and health; use the existing FE API origin locally, explicit site origin and signed trusted ingress in production. No shared ANKT auth changes.
4. Verify direct `/developers`, registration/login, guest Console, navigation back to ANKT, unit/type/build checks and real SMTP E2E. Then remove the nested Next project and obsolete deployment/config references.

## Commands
Dev: `npm run web`; build: `npm run build:web`; typecheck: `npx tsc --noEmit`; boundary tests: `node --test server/developer/*.test.cjs`. Existing root tests remain applicable.

## Boundaries and risks
No production database migration, data reset, deployment, commit or secret changes. No browser-readable session tokens/localStorage. Browser writes require exact origin + custom header + JSON; browser ANKT cookies/Authorization never forwarded to BE. Session restoration and Console rely on actual backend responses. Root Vercel function requires deployment environment configuration; self-hosting must forward its BFF routes to the documented root handler. Existing SPA web output is retained; search deep links work, while server-rendered search metadata would require a separate rendering project decision.

## Acceptance
No `developer-portal` package/runtime, no Next dependency, no redirect to port 3100; all existing Stage 2 screens reachable through the same Expo FE and build. All focused tests pass; production rollout remains separate.

## Completed
All four tasks implemented and verified. Source from the retired nested project was retained as a reversible backup outside the FE in workspace diagnostics. Current verification/configuration is recorded in `docs/handoffs/developer-integrated-fe.md`.

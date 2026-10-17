# Developer integrated into ANKT FE

Supersedes the separate Next architecture and port-3100 workaround in Stage 1/2 notes. Developer now belongs to the root Expo FE, with one package, dependency tree, `npm run web` and `npm run build:web`.

## Routes and source
- `app/developers/index.tsx`, `[...path].tsx` expose the root landing, docs, getting-started, policies, contact, register, login, verify-email, forgot/reset, console, console/settings and console/apps paths on the current origin. Invalid Developer paths show the feature's not-found state.
- `features/developer/` reuses the public content and real account forms, adapting navigation to Expo Router. The web feature has its own header/footer and scoped CSS. Main ANKT styles/auth remain separate. Native offers the existing production web pages.
- Root ANKT session guard permits the Developer namespace without requiring a social account. The Console's own provider validates real Developer cookies with BE; no protected data is bundled or authorized by the client alone.
- `utils/developer-portal.ts` preserves the current origin, including localhost:8081. No iframe, embedded site, Next runtime or different-port redirect.

## API and security
`server/developer/handler.cjs` serves `/developers/api/account/*` and `/developers/api/health`. `metro.config.js` mounts it inside the existing development server; `api/developer.js` mounts the same handler in the root Vercel deployment. The allowlisted proxy, cookie policy and health check were migrated from the previous implementation, retaining the existing BE contract.

Cookies remain host-only, HttpOnly, Path=/developers, SameSite=Lax and Secure on HTTPS. Raw session identifiers stay server-side and are removed from browser JSON. Anonymous cookie checks return 401; revoked cookies are cleared. Bodyless BE 401/429 errors are normalized without changing status. Writes require exact origin, JSON and the custom developer header, with a 16KiB body limit. ANKT cookies/Authorization are never forwarded.

Session context updates immediately after login/profile writes, reset/change/logout and revoked-session errors. Generation guards prevent older auth/me responses from restoring stale account state. Same-origin paths share a browser security boundary; account ownership and authorization remain enforced by the existing BE.

## Local run
1. Configure the existing root FE `.env` normally. The BFF uses server-only `ANKT_API_BASE_URL`, falling back to existing `EXPO_PUBLIC_API_URL`; empty `DEVELOPER_SITE_ORIGIN` derives the loopback origin during development.
2. Run the existing BE with Developer SMTP configured as documented in the BE repository. No production migration is performed by the frontend.
3. From root FE: `npm run web`; open `http://localhost:8081/developers`.

For isolated real SMTP integration checks, run the BE `tools/DeveloperE2EHost` (disposable SQLite), start Expo with process-only `ANKT_API_BASE_URL=http://127.0.0.1:5318` and `DEVELOPER_SITE_ORIGIN=http://localhost:8081`, then `npm run test:developer:e2e`. The test owns a loopback SMTP sink on port2526. The BE fixture's email URL still uses its older port3100; API E2E extracts the actual fragment token and submits it on8081, never uses production data. Configure the actual BE PortalUrl to the real FE /developers URL for normal emails.

## Production
Build from the FE root with the existing command. Deploy the root FE and `api/developer.js` together on Vercel; do not deploy a Developer child project. Rewrites route only Developer API paths to that function and page paths to the existing SPA. Configure server-only `DEVELOPER_SITE_ORIGIN=https://mxh.ankt.vn`, actual `ANKT_API_BASE_URL`, and `ANKT_BFF_SHARED_SECRET` matching BE `DeveloperAuth__BffSharedSecret`. SITE_ORIGIN is accepted for compatibility. Existing BE `DeveloperAuth__PortalUrl` remains `https://mxh.ankt.vn/developers`.

The Vercel handler obtains the platform's overwritten `x-vercel-forwarded-for` IP only when running with VERCEL=1, then signs IP/time/method/path to BE. Client-supplied X-ANKT-Client-IP is discarded. [Vercel request-header reference](https://vercel.com/docs/headers/request-headers). Wrong/missing production origin/key/IP fails closed. A self-hosted static deployment must also host the root Node handler or provide an equivalent server adapter; a static-only file upload cannot execute the account BFF.

Developer path headers include no-store, frame denial, nosniff, referrer/permissions policy and CSP (scripts self, inline styles for React Native Web). Existing Expo export emits external scripts; production build verification checks this assumption. These deployment headers are configured, not applied to production in this task.

## Verification and limits
- `npm run test:developer`: 17 passed, including origin rejection, token stripping, production secure cookies/IP signing, Vercel rewrite, immediate UI invalidation after reset and worker isolation.
- Root strict TypeScript and focused ESLint passed with zero errors/warnings.
- Root Expo production export passed; Developer CSS/assets, robots and sitemap are included. Export uses external scripts only, matching the configured production CSP.
- Real SMTP/BFF E2E passed on the same Expo port: register/duplicate/verify/single-use/login/profile/sessions/change/reset/logout-all. Uses isolated SQLite, not the configured database.
- Chrome verified direct public/auth/Console URLs on8081, actual account login and reload restoration, saved profile, logout then guest Console redirect, and the existing ANKT login page after leaving Developer. No iframe or port change. Mobile375px has no horizontal overflow. Development console includes expected anonymous401 responses and the existing RN Web shadow-style deprecation warning.
- Fresh-context security review completed three cycles; confirmed findings (bodyless errors/config compatibility/stale reset state) were corrected, with no additional concrete findings in the final cycle.
- Root dependency installation reported 50 advisories (18 moderate,32 high); no repo-wide dependency remediation was attempted. ANKT OAuth/OIDC remains unavailable; no Stage3 business logic added.

Existing single-page web output is retained. Direct Developer URLs and client-side title/description/canonical/noindex metadata work; server-rendered public HTML/search previews from the old Next design are not part of this SPA build. Unknown Developer URLs render a not-found screen with noindex, but the existing SPA fallback serves HTTP200. Search indexing remains dependent on the crawler executing the app.

No production migration, data reset, deployment, commit or secret-file edits.

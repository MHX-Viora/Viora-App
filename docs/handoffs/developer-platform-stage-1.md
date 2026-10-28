> Historical architecture. Superseded by [Developer integrated into FE](developer-integrated-fe.md). The current feature runs inside the root Expo application.

# ANKT Developer Platform — Stage 1

## Decision and layout
- User chose `https://mxh.ankt.vn/developers`, superseding the proposed developer subdomain.
- Independent Next.js 16.4.1 / React 19.3.1 / strict TypeScript package: `developer-portal/`. Its own dependencies/lockfile, basePath, server, pre-rendered pages and build. Root Expo TypeScript/lint exclude this directory.
- Public home/docs/getting-started/policies/contact, header/footer, FAQ, planned-feature roadmap, canonical/Open Graph, sitemap/robots. Login/register/console are honest unavailable placeholders with noindex, no forms/sessions/private data.
- Profile Settings → ANKT Developer opens the current web origin `/developers`, or production URL on mobile. Linking failures show an error toast.
- Existing pending settings/theme/notification fixes are preserved.

## API and cache isolation
- Shared .NET backend addition: public `GET /api/developer/health`, no database use. Portal `/developers/api/health` proxies only the configured server-side origin, no credentials/redirects, five-second timeout, validated payload, sanitized 503 errors.
- `ANKT_API_BASE_URL` runtime configuration; `SITE_ORIGIN` is required for production SEO/build. See `.env.example`.
- Root ANKT service worker now bypasses exactly `/developers` and `/developers/*`; shell cache v2 retires potentially mixed documents. VM tests reproduce the old cache contamination and preserve existing ANKT navigation behavior.

## Deployment boundary
- `developer-portal/README.md` contains local/build/staging/Ubuntu instructions, route table, Nginx/systemd templates and rollback. Merge only the two portal locations into the existing ANKT HTTPS server and preserve the full prefix.
- Existing Expo workflow is unchanged. Deploy/activate the updated ANKT worker before exposing the portal. Merge portal directives into origin-root robots.txt; the nested robots URL alone is insufficient.
- No commit, push, production Nginx/SSL changes, deployment or database writes performed.

## Verification
- Portal unit tests: 7; HTTP production smoke checks: 3. Covers origin/basePath, API validation/failures, native/web menu destinations, service-worker cache isolation, public/private route HTML/SEO/status.
- Portal strict TypeScript and optimized production build; Expo strict TypeScript, lint and web export; existing notification/profile/theme tests: 19 passed.
- BE suite: 64 passed, 1 existing database-dependent audit skipped. Anonymous health HTTP test additionally passed with fallback authorization.
- Chrome DevTools used an isolated local browser and the real .NET endpoint in a minimal test host (no production DB). No horizontal overflow at 320/375/768/1024/1440px; final browser console has no errors. Checked account link/navigation/noindex, FAQ toggle, canonical tags, keyboard skip link and retry while stopping/restarting the upstream endpoint. API failure shows the expected message; retry restores success. Temporary test processes are stopped after verification.
- Production Nginx/TLS, existing installed PWA update activation, native device launching and real account flows still require deployment/device verification.

## Stage 2 prerequisites
Approve real authentication/session/CSRF and authorization design, organization/account model and migrations before enabling console operations. Sharing an origin shares browser storage/cookie boundaries. No Mini App business logic is implemented in Stage 1.

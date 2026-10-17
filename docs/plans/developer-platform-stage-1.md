> Historical architecture. Superseded by [Developer integrated into FE](../handoffs/developer-integrated-fe.md). The current feature runs inside the root Expo application.

# ANKT Developer Platform — Stage 1

## Agreed scope
User selected the existing ANKT origin: **https://mxh.ankt.vn/developers**, replacing the attachment's proposed subdomain. Build an independent frontend inside `developer-portal/`, sharing the existing .NET 8 API and database. No new database entities, migrations, authentication, developer registration, Mini App business logic or production deployment.

## Audit
- Existing Expo Router web app is deployed at mxh.ankt.vn; its root layout redirects anonymous visitors to login.
- Existing API origin is api.mxh.ankt.vn. Controllers use ASP.NET Core authorization, MediatR and the shared AppDbContext; JWT, exact-origin CORS and centralized exception handling already exist.
- Previous Mini App runtime was removed. Historical migrations and removal tests must remain. Only a new public health endpoint is required now.
- The existing frontend workflow exports Expo to dist. Keep that deployment intact; route /developers and /developers/* to a separate Next.js process through Nginx.
- Reuse the ANKT logo, light surfaces and cyan brand. Preserve pending settings/notification changes.

## Design and commands
Next.js App Router, strict TypeScript, semantic CSS tokens. Use Next Link for internal routes with build-time basePath=/developers. Server-render public content and metadata; noindex account and console placeholders. Example: `export const metadata = pageMetadata("Tài liệu", "/docs", "Hướng dẫn tích hợp ANKT.");`.

From developer-portal: `npm ci`, `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, `npm start`. API health uses a server-side environment-configured upstream, bounded timeout, schema validation and sanitized errors. Never forward user credentials.

## Ordered implementation
1. Add public GET /api/developer/health with contract and anonymous HTTP test. No database access.
2. Create independent frontend package/config/env examples; implement shared header/footer and home/docs/getting-started pages with canonical/OG/sitemap.
3. Add unavailable login/register and console routes with noindex; connect health indicator with retry/loading/error handling. No fake session or forms.
4. Add Profile Settings → ANKT Developer external link that works on web/mobile.
5. Add Ubuntu Nginx/systemd templates and local/staging/production instructions. Review current server config before applying them; preserve existing routes and root robots.txt.
6. Verify API tests, portal tests/typecheck/build, Expo typecheck/lint and browser routes, mobile layout, navigation, health success/failure. Record handoff and limitations.

## Boundaries and acceptance
- Always: minimal changes, no secrets, deterministic focused tests, honest planned feature labels.
- Never: alter existing data, restore retired platform code, change production routing/SSL, or start Stage 2.
- Must: public pages reachable without ANKT login, all portal URLs/assets stay under /developers, existing ANKT login/register remain separate, health returns status=ok/service=ankt-developer, console exposes no account data.
- Stage 2 requires an approved real authentication/authorization contract before console functionality can be enabled.

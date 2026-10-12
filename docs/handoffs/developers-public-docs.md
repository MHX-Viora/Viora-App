# ANKT Developers — public documentation

## Scope and status
- User chose documentation only after removing Developer/Mini App code and tables. This feature does not restore backend endpoints, SDK, entities, credentials, database tables or Admin management.
- `/developers`, `/developers/docs` and the 11 specified articles are public (13 URLs total). Registration and the five Console destinations use existing ANKT login and show an unavailable screen after authentication.
- Documentation labels platform operations as unavailable. Partner website setup and OIDC guidance describe preparation, not a working ANKT integration contract.

## Implementation
- Versioned `features/developers/content.mjs` drives native rendering, Expo Web HTML, static generation, navigation, automatic TOC and accent-insensitive full-text search. Search highlights use DOM text nodes, never user-provided HTML.
- `render.mjs` escapes repository content and emits per-route title, description, canonical, OG, Vietnamese semantic HTML and JSON-LD. It validates paths and anchors before generation.
- `scripts/build-developers-docs.mjs` runs after Expo export in the same dist. `web.output=single` stays unchanged for social/auth routes. No new dependency or separate frontend project.
- Public static pages load only CSS and small local documentation modules; they do not load the social bundle or request an API/JWT. SPA public routes bypass session refresh and auth redirect. Stale async auth checks are cancelled on navigation.
- Account menu and Utilities link to Developers. Static header starts anonymous; a display-only `ankt.public-profile-hint` written by existing session save/update/logout can show an initial avatar. It contains only a bounded display name; no identifier or credentials, and never grants access. Sessions predating this change acquire the hint on their next session save/refresh. Console always checks the actual session.
- Docs respect stored app light/dark mode when no docs preference exists, with a separate local reading preference. Native screens use the existing theme provider.
- `safeDeveloperReturn` accepts only the six protected route forms and constrained app IDs, rejecting external URLs, queries, fragments, encoded traversal and arrays. Email/password, Google login, profile completion and account signup preserve the allowed destination.

## Build and deployment
```powershell
npm run test:developers
npx tsc --noEmit
npm run build:web
```
The existing VPS workflow now generates docs after export and CI checks documentation. Deploy **all** of dist, including `developers/`, `developers-assets/`, `sitemap-developers.xml` and robots.txt.

Review and merge `docs/deployment/developers-nginx.conf` into the existing mxh.ankt.vn server block. Keep its current root, social SPA fallback, API proxies and security headers. Private routes serve the SPA with X-Robots-Tag noindex; unknown docs return 404. Explicit `.mjs` MIME is required for browsers. Run `nginx -t` before the operator reloads Nginx. No DNS, production configuration, push or deployment was performed in this task.

Only documentation appears in sitemap-developers.xml. A dedicated sitemap avoids replacing another site's sitemap. The generator preserves existing robots content and replaces its own marked block on repeated runs. If production has a different sitemap index, the operator can add this sitemap to that index.

## Validation
- 21 Node tests: search/ranking/accent folding, route boundaries and malicious return URLs, escaped HTML, all 13 document SEO contracts/anchors/JSON-LD, unavailable SDK/API state and public hint credential exclusion.
- Full TypeScript check, scoped ESLint, Expo web export and static generation.
- Chrome: public direct URL and reload; static document assets only; search `dang ky developer` ranks registration first and highlights matches; theme persists between documents; SSO copy reports success; TOC anchor scrolls; mobile menu opens and Escape closes/focuses trigger; 320px and 390px viewports have no page overflow and code scrolls independently at 390px.
- HTTP/build checks: all 13 exported HTML documents served unchanged; 5 local documentation assets and .mjs MIME; public sitemap/robots; unknown documentation 404; protected routes have no generated document HTML.
- Chrome: `/developers/console/apps/fixture` redirects to `/login?returnUrl=%2Fdevelopers%2Fconsole%2Fapps%2Ffixture`; public security document also renders through Expo SPA without a login redirect or console errors.
- Real account login/Google provider, authenticated Console and production Nginx were not exercised. Safe destination handling and unavailable route wiring were checked locally; no test created accounts or database data. Native rendering was type-checked, not run on a device.
- Chrome mobile screenshot capture stalled; DOM/viewport inspection and desktop visual inspection were used instead.

## References
- [Expo web export](https://docs.expo.dev/guides/publishing-websites/) and [static rendering](https://docs.expo.dev/router/web/static-rendering/).
- [Nginx try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files).
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0-final.html), [PKCE RFC 7636](https://www.rfc-editor.org/info/rfc7636/) and [ASP.NET OIDC authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication).

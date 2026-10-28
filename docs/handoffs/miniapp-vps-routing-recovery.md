# Mini App catalog / Developer VPS recovery — 2026-10-28

## Live observations
- `https://mxh.ankt.vn/developers/` and `/developers` return nginx 403.
- `/developers/brand.png` returns 200. `/developers/docs` returns the Expo SPA.
- Current public Expo bundle uses `https://api.mxh.ankt.vn` (33 occurrences),
  with no Render API origin. It includes the Mini App catalog client.
- `https://api.mxh.ankt.vn/api/mini-apps?page=1&pageSize=20` returns empty 404.
- Same path on `https://viora-back-end-xmco.onrender.com` returns JSON 200,
  total 1. The services have different deployments/configuration and may have
  different databases. Render is not an automatic production fallback.
- Local ignored FE `.env` points to Render. Changing it does not change an
  already exported/deployed Expo bundle.
- API `/health` and `/api/featured-brands` return 200; this is not total API downtime.

## Fix prepared
`scripts/prepare-vps-web.cjs dist` copies the bundled root HTML entry into
`dist/developers/index.html`, keeping existing assets. This addresses the normal
Nginx `try_files $uri $uri/ /index.html` directory-index collision caused by
`public/developers/brand.png`. Actual VPS configuration could not be inspected:
SSH `tino-vps` rejected authentication. A custom deny/location rule remains possible.

Frontend deploy runs preparation after Expo export, verifies the entry exists,
and checks `/developers/` plus the public catalog before reporting success.
Backend deploy also checks the catalog, rather than treating Swagger as sufficient.

## VPS actions still required
1. Inspect Nginx error log/location for `/developers/` to confirm directory-index
   failure. In `/var/www/viora/frontend`, use the new preparation step on a valid
   export (or redeploy the changed workflow); verify `dist/developers/index.html`.
2. Inspect the running backend container, not only repository `.env`:
   `cd /var/www/viora && docker compose exec -T viora-api printenv MiniAppAuth__Enabled`.
   Both `MiniAppRuntime:Enabled` and `MiniAppAuth:Enabled` disabled cause the public
   catalog endpoints not to be mapped. The local BE enables Auth Bridge, but the
   Docker image intentionally excludes `.env` and local appsettings.
3. Supply the complete intended MiniAppAuth configuration through Compose runtime
   environment; ensure the deployed version and migrations support it. Merely editing
   a host `.env` does not inject arbitrary keys into a container. Recreate the
   container after reviewing configuration. Do not enable a flag without its required
   origin/key/schema settings. Do not switch production to Render to hide this error.
4. Verify catalog returns JSON 200 and browser can load a Mini App. Then verify the
   Developer BFF routes separately; static entry success does not prove login works.

## Validation / limits
Five entry regression tests and changed-script ESLint pass. No secrets printed,
production configuration changed, deployment triggered, or commit created.
VPS/Compose configuration and database contents remain unverified due to SSH access.

# Developer VPS session check

- Confirmed public `/developers/api/account/auth/me` and `/developers/api/health`
  return the Expo SPA HTML with status 200. Header displays the unavailable-state
  link, not a hanging auth request. Static Nginx cannot run the Vercel BFF adapter.
- New `server/developer/serve.cjs` runs the existing BFF handler on 127.0.0.1:4319.
  Requires exact HTTPS site/API origins and production BFF signing key.
- Existing handler now returns JSON 401 locally for guest auth/me (no BE request).
  Optional nginx attribution trusts X-Real-IP only from loopback with an explicit
  env flag; the supplied Nginx snippet overwrites that header.
- `deploy/viora-developer-bff.service` + `deploy/developer-api.nginx.conf` provide
  the runtime and API location. See `docs/operations/developer-bff-vps.md` for setup.
- FE deploy verifies the guest session API returns JSON 401, not static HTML.
- 19 local HTTP/BFF tests pass, including cookie translation, no-store, upstream
  errors and signed proxy attribution. No production config/service was changed.

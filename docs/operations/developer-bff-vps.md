# Developer session unavailable on the VPS

Observed 2026-10-28: `/developers/api/account/auth/me` and `/developers/api/health`
return 200 `text/html` (SPA fallback), not account API JSON. The header's
"Kiểm tra phiên đăng nhập" link is the unavailable state, not a pending request.
Static Expo hosting alone cannot execute `api/developer.js` (the Vercel adapter).

## Simpler setup: use the existing Docker Compose (Linux VPS)

Use `deploy/docker-compose.developer-bff.yml` as a template: copy its developer-bff
service under `services` in `/var/www/viora/docker-compose.yml`, leaving viora-api
and volumes unchanged. It uses the official Node 22 image and existing FE source;
no Node installation, npm install, Dockerfile or systemd unit is required.
The host-network service still binds only 127.0.0.1:4319. It is for the Linux VPS,
not a Docker Desktop portability configuration. Do not run it alongside the
systemd BFF on the same port.

Set `ANKT_BFF_SHARED_SECRET` in FE env to exactly match BE
`DeveloperAuth__BffSharedSecret` (at least 32 random characters). After saving,
validate Compose and start `developer-bff`; recreate `viora-api` if its env changed:

```bash
cd /var/www/viora
sudo docker compose config --quiet && sudo docker compose up -d developer-bff
sudo docker compose logs --tail=30 developer-bff
```

Insert the same `deploy/developer-api.nginx.conf` location into the existing HTTPS
mxh.ankt.vn server, then `sudo nginx -t && sudo systemctl reload nginx`.
The guest curl checks below must return JSON 401. When FE source or env changes,
use `sudo docker compose up -d --force-recreate developer-bff`.

## Alternative: systemd runtime / deployment
`server/developer/serve.cjs` wraps the existing handler on loopback port 4319. It
preserves existing HttpOnly cookies, CSRF/origin validation, authorization and
private/no-store responses. Do not route these paths directly to the .NET API:
the BFF translates the Developer cookie to server-side authorization.

In FE host `/var/www/viora/frontend/.env`, configure server-only values:

```dotenv
DEVELOPER_SITE_ORIGIN=https://mxh.ankt.vn
ANKT_API_BASE_URL=https://api.mxh.ankt.vn
ANKT_BFF_SHARED_SECRET=<server-only-random-value-at-least-32-characters>
```

Production BFF requires signing: set exactly the same random value in BE
`DeveloperAuth__BffSharedSecret`, then recreate the Viora BE container to load it.
Generate a value with `openssl rand -hex 32` and transfer it only to these two
server env files. This is a shared service key, not a per-app Client Secret.
The supplied unit trusts X-Real-IP only from the loopback nginx peer; the nginx
snippet overwrites it with the actual remote address for signed rate attribution.
Never prefix these values/credentials with EXPO_PUBLIC. Do not return .env files
from Nginx. Existing other frontend settings can remain.

1. Update the FE source to include the server entry and deployment files. Confirm
   Node 22 is installed (`node --version`, `command -v node`). If its executable is
   not `/usr/bin/node`, adjust ExecStart in the supplied unit to the actual path.
   `www-data` needs read/traverse access to source; systemd reads EnvironmentFile.
2. Install the dedicated unit, without restarting unrelated backend services:

   ```bash
   sudo cp /var/www/viora/frontend/deploy/viora-developer-bff.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now viora-developer-bff
   sudo systemctl status viora-developer-bff --no-pager
   ```

3. Insert `deploy/developer-api.nginx.conf` inside the existing HTTPS `server`
   block for `mxh.ankt.vn`. Keep the existing static root and other locations.
   This prefix must reach Node before SPA fallback; preserve the full URI.
   Run `sudo nginx -t && sudo systemctl reload nginx`.
4. Verify without an account cookie:

   ```bash
   curl -i -H 'X-ANKT-Developer: 1' http://127.0.0.1:4319/developers/api/account/auth/me
   curl -i -H 'X-ANKT-Developer: 1' https://mxh.ankt.vn/developers/api/account/auth/me
   ```

   Both should return JSON 401 immediately. Signed-in sessions should return
   validated account JSON 200. HTML 200 means Nginx is still falling back to SPA;
   502 means Node is not listening; check `journalctl -u viora-developer-bff`.
5. Restart this Node unit when FE server-side code or its env changes. A static
   Expo rebuild or an nginx reload does not restart Node. Existing CI checks the
   public Developer API response but does not install systemd/Nginx automatically.

## Validation / limits
Local HTTP tests cover missing-cookie JSON 401 without any upstream request,
cookie-to-authorization forwarding, no-store, and unknown-route JSON 404.
Existing handler/BFF tests cover login/refresh/logout/CSRF behavior. No production
service or nginx configuration was changed by the coding agent.

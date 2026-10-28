# Client Secret auto-display — 2026-10-27

## Final user-directed behavior

The user explicitly selected direct FE assignment for Nghệ Thuật Số, acknowledging
that display masking is not encryption. Its exact registered App ID uses
EXPO_PUBLIC_NTS_SANDBOX_CLIENT_SECRET / EXPO_PUBLIC_NTS_PRODUCTION_CLIENT_SECRET
from the ignored FE .env and skips the reveal API entirely, including when values
are missing. Raw credentials are not committed. These values are public in the
compiled FE bundle by design, not protected by owner-only API authorization.
Other apps retain the authenticated owner API flow below and cannot use the NTS
values. UI renders code + Copy Client Secret directly below Client ID, matching
the Client ID display/copy pattern. Environment selector remains.

Browser regression additionally verifies both direct values, copy, zero reveal
requests for this app and no cross-app disclosure. Restart Metro to load updated
public .env build values; hosted frontend builds need the same two variables.

## Earlier owner-API behavior and backend configuration

The owner integration control loads the selected environment's credential on mount
and environment changes, showing a read-only text field and Copy. No reveal/hide
button or 60-second timer. Failed loads have an explicit retry. App/environment
changes, pagehide and unmount invalidate old responses; bfcache restoration reloads.
No new API, permission, public credentials or browser persistence.

Root cause of PARTNER_SECRET_UNAVAILABLE is separate: server provisioning has
hashes but needs original SandboxSecret/ProductionSecret under the same existing
partner label. Supplied secret/hash pairs were verified without logging values.
A private import file was prepared in the OS temporary directory; it is outside
the repository and must never be copied into public Expo variables or Git.
Per the user's local-backend selection, the two plaintext settings were added to
the ignored `viora-BE/.env` under the existing Nts label after verifying its App ID
and both hash values. No existing hash was changed. No production configuration
change or deployment was performed.

Connectivity remains separate: `viora/.env` still targets Render, and no running
ANKT backend process or HTTP listener at the configured local default :5149 was
found. Do not silently switch the frontend to a dead local endpoint. Confirm the
intended running backend origin before changing the API target/restarting it.

Browser regression passed with synthetic credentials: automatic load/copy,
environment/app separation, late response rejection, visibility past 60 seconds,
denied access, retry and pagehide. See client-secret.browser.mjs.
Frontend typecheck and changed-component ESLint passed. Eleven existing backend
credential-reveal tests passed. Real credentials were never used in browser tests.

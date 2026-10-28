# Sandbox preview cache refresh — 2026-10-27

- Fresh live NTS HTML now serves bundle `index-d30556329490858b4917e3f728e13303.js`, SDK 0.4.0 and `hostOrigin: "http://localhost:8081"`. NTS API rejects a malformed code with 401 instead of the former Origin 403. This is not a real login test.
- Reproduced in the same Chrome profile: opening the bare production `/` reused old HTML pointing at bundle `index-00e3539aa4f85b25ff697e87f7be6ed3.js` and SDK 0.3.1. A fresh query loaded current SDK/build. The user's screenshot contains the old profile-only message.
- `MiniAppAuthBridgePreview` now appends a fresh `__ankt_preview` UUID on each launch/reopen. Keeps the registered path, other query parameters, fragment and verified origin. The value is only a cache key, never an identity or environment selector.
- Browser regression failed before the fix, passed after it; covers fresh preview URL, retained parameters/origin, existing launch failure, exchange timeout, connected acknowledgement and missing handshake. Uses synthetic auth data, not the user's Developer session.
- Reload the local Portal and reopen Sandbox. No NTS frontend rebuild is required for this ANKT Portal change. Live end-to-end partner login still needs the user's authenticated Developer session and valid server credentials.

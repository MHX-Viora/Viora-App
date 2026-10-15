# ANKT production API/environment audit — 2026-10-07

## Confirmed production failure

- Frontend: `https://mxh.ankt.vn`, bundle `index-31761aebc98497978285b1b203c3a4f1.js`.
- Browser feed requests target `https://api.mxh.ankt.vn`.
- The same public bundle still embeds `https://api.tvphapluat.com.vn` in friends, chat, device-token registration, calls, account and other services. That domain belongs to a different project.
- Local source consistently reads `process.env.EXPO_PUBLIC_API_URL`; it does not hardcode the other project's API.
- Mixed build-time environment values are confirmed. Stale Metro transform cache is the likely cause; the exact VPS cache state was not inspected.

## Changes

- Local ignored `.env`: API URL changed from Render to `https://api.mxh.ankt.vn`.
- VPS workflow exports with `npx expo export --platform web --clear`.
- `scripts/verify-production-api.mjs` checks exported JavaScript before Nginx reload: rejects the other project's API and the old Render origin; requires the ANKT API origin. It never prints bundle contents or credentials.
- No production deployment performed.

## Environment assessment

| Setting | Assessment |
| --- | --- |
| `EXPO_PUBLIC_API_URL=https://api.mxh.ankt.vn` | Correct; must be present at export time. |
| `Cors__AllowedOrigins__4=https://mxh.ankt.vn` | Correct; verified live on ANKT API. |
| Firebase Web project/app/sender IDs | Consistent with the supplied backend service-account project. |
| `EXPO_PUBLIC_FIREBASE_WEB_AUTH_DOMAIN=mxh.ankt.vn` | Domain serves the Firebase auth helper at `/__/auth/handler`; complete Google login still requires an authenticated test. |
| `EXPO_PUBLIC_FIREBASE_WEB_VAPID_KEY` | Missing from supplied FE env and local env; required by current web-push registration code. Obtain the public key from Firebase Project settings > Cloud Messaging > Web Push certificates. |
| `Firebase__ServiceAccountJsonBase64` | Decodes to service-account JSON for `com-quyentrinh-viora`, with a private key. Format/project validated; credentials were not exercised against FCM. |
| `Wallet__BankAccountEncryptionKey` | Valid Base64 encoding of 32 bytes. |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` on backend | Frontend/native setting; does not configure backend CORS or chat. |
| payOS return/cancel URLs | Supplied URLs use `ankt.vn`; the app route is on `mxh.ankt.vn`. Confirm intended routing; suggested values below. |
| `PAYOS_WEBHOOK_URL` | Supplied URL uses `ankt.vn`; controller lives on the API. This variable is not referenced by current payment service, so changing it alone does not register the webhook in payOS. |

Suggested payOS URLs for this deployment, subject to the payment-provider registration:

```dotenv
PAYOS_RETURN_URL=https://mxh.ankt.vn/wallet/deposit?status=return
PAYOS_CANCEL_URL=https://mxh.ankt.vn/wallet/deposit?status=cancelled
PAYOS_WEBHOOK_URL=https://api.mxh.ankt.vn/api/payments/payos/webhook
```

## Verification

- ANKT API `/health`: HTTP 200, healthy.
- Six OPTIONS checks: conversation list, private-conversation creation, notifications, friendship deletion, follow and realtime negotiation. All return HTTP 204 with exact ANKT frontend origin and credentials allowed.
- Unauthenticated notifications: HTTP 401 with correct CORS headers, rather than browser CORS rejection.
- Frontend existing test suites: 37 passed, including profile messaging, unfollow, notification listing/read/retry and social banners.
- Frontend TypeScript and Expo lint passed.
- Backend test suite: 56 passed, 1 skipped (PostgreSQL-dependent test).
- Export guard verified against mixed-origin, correct-origin and missing-origin fixtures.
- Clean Expo Web export passed; exported JavaScript passes the ANKT origin guard with no obsolete API origins.
- Production browser opens login; authenticated end-to-end chat/send/receive, push, notification read and relationship actions remain pending two test accounts.
- Native device push and Android/iOS behavior were not exercised.

## VPS recovery

In `/var/www/viora/frontend`, ensure the frontend environment uses the ANKT API and includes the Firebase Web VAPID public key, then export and verify:

```bash
npx expo export --platform web --clear
node scripts/verify-production-api.mjs dist
```

After publishing the verified build, reload the frontend and inspect actual request URLs. Do not change the other project's backend CORS to accommodate this app.

References: [Expo environment inlining](https://docs.expo.dev/guides/environment-variables/), [Firebase custom auth domain helpers](https://firebase.google.com/docs/auth/web/redirect-best-practices).

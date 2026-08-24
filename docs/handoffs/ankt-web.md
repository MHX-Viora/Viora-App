# ANKT Web handoff

## Implemented

- Web-safe platform bootstrap and notification/call adapters; native implementations remain unchanged.
- Per-tab Web session persistence through `sessionStorage`; the access token is not retained in persistent `localStorage`.
- Responsive breakpoints, bounded content layouts, five-item desktop header, unread badges, and mobile tab preservation.
- Desktop Feed, bounded 9:16 Reels, Notifications, Profile, and URL-driven Chat master-detail layouts.
- Expo SPA export (`web.output: single`) with the existing Vercel direct-route rewrite.
- Environment-driven credentialed backend CORS with normalized exact origins and no wildcard.

## Production configuration

- Frontend: set `EXPO_PUBLIC_API_URL` to the HTTPS API origin.
- Backend: set exact origins as indexed variables, for example `Cors__AllowedOrigins__0=https://your-web-origin.example` and additional entries with increasing indexes.
- When any backend CORS origins are configured, development defaults are excluded.

## Verification

- Frontend unit tests: 48 passing at the responsive-chat/security checkpoint.
- TypeScript and Expo lint: passing.
- Expo production SPA export: passing; browser render reaches `/login` without the prior native-module or hydration crash.
- Backend suite: 24 passing (including 2 CORS cases); backend build: passing with zero warnings/errors.
- Production dependency audit: zero known vulnerabilities at the configured high-severity gate.

## Remaining launch blockers

- Supply the final Web origin and configure it in backend deployment secrets/environment.
- Supply an approved Firebase Web App configuration/SDK decision before enabling Google login on Web; native Google login remains intact.
- Rotate exposed backend credentials and remove real values from tracked configuration/history. Values are intentionally not repeated here.
- Run authenticated browser regression (feed actions, uploads, realtime chat, direct conversation URLs) with a non-production test account.
- Remove existing React Native Web `useNativeDriver` fallback warnings from animated skeletons/components before the final console-clean gate.
- Run Android regression; iOS remains unverified without an iOS build environment.

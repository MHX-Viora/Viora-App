> Historical architecture. Superseded by [Developer integrated into FE](developer-integrated-fe.md). The current feature runs inside the root Expo application.

# Developer local routing fix

- Symptom: `http://localhost:8081/developers` rendered Expo's Unmatched Route page.
- Cause: settings reused Expo's origin although the independent Next portal listens on port 3100. Next was also not running locally.
- Fix: loopback origins resolve to port 3100 in `utils/developer-portal.ts`; deployed origins and native production URL remain unchanged. `app/developers.tsx` redirects local web visits to Next, with a manual link fallback. The Expo session guard skips this external-portal entry point so guests can open it.
- Run: keep Expo running separately; run `npm run dev` inside `developer-portal`. Configure its `.env.local` from `.env.example`, including `SITE_ORIGIN=http://localhost:3100` and the actual `ANKT_API_BASE_URL`.
- Verified: regression first failed against the old link; all 14 portal unit tests and root `tsc --noEmit` passed after the fix. Chrome navigated from port 8081 to port 3100 and rendered the portal. Health returned 503 because no local backend origin was configured; this is separate from routing.
- No database changes or backend edits. No commit/deployment performed.

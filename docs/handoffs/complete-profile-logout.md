# Complete Profile logout handoff

## Delivered
- Added a neutral `Thoát` header action and accessible confirmation modal on
  Complete Profile. Cancel preserves all screen-local form data; confirm is
  single-flight and shows a loading state.
- Shared `logout()` now owns Google/Firebase sign-out and SecureStore session
  deletion in `finally`, including token-read, network, and server-error paths.
- Complete Profile stops realtime, dismisses the Expo Router stack, and replaces
  it with `/login`. The existing Profile logout keeps its push-token unregister
  step and reuses the same auth cleanup.
- FCM device identity/token storage and backend profile APIs were not changed.

## Verification
- `node features/auth/complete-profile-logout.test.mjs`
- `npm test`
- `npx tsc --noEmit`
- `npm run lint`

## Manual checks recommended
- On Android/iOS: Google account A (no profile) → Thoát → account B.
- Disable network before confirming logout and verify Login still opens.
- From Login, press hardware Back and confirm Complete Profile does not return.

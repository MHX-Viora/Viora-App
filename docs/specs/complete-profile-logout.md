# Spec: Logout from profile completion

## Objective
Let a signed-in user whose account has no profile leave `complete-profile`, fully
clear the current authentication session, and return to a clean Login stack so a
different account can sign in.

## Tech stack and commands
- Expo Router 6, React Native 0.81, TypeScript, Expo SecureStore.
- Google identity: `@react-native-google-signin/google-signin` and
  `@react-native-firebase/auth`.
- Test: `npm test`; typecheck: `npx tsc --noEmit`; lint: `npm run lint`.

## Project structure and style
- Keep `app/complete-profile.tsx` as a thin route.
- Put screen behavior and themed UI in `features/auth/complete-profile-screen.tsx`.
- Reuse `services/auth.service.ts#logout`; local session persistence remains in
  `stores/session-store.ts`.
- Use existing theme tokens, safe-area, keyboard avoidance, and scroll handling.

## Testing strategy
- Add a focused source-level regression test matching the repository's current
  Node test pattern.
- Verify server failure still reaches local session and Google cleanup.
- Verify the Complete Profile UI has the required confirmation copy, duplicate
  action guard, and an Expo Router stack reset before replacing with Login.
- Run the full app test command, TypeScript, and ESLint.

## Boundaries
- Always: reuse the shared logout service; clear `viora.session`; sign out Google
  and Firebase; preserve the existing profile submission flow.
- Ask first: backend/API changes, dependencies, or notification architecture changes.
- Never: create/update a profile during logout; delete FCM device identity/token
  from the incomplete-profile flow; navigate to Login while preserving the old stack.

## Success criteria
- Complete Profile shows a secondary `Thoát` action in its header.
- `Thoát` opens the specified confirmation with `Ở lại` and `Đăng xuất`.
- `Ở lại` closes the dialog without unmounting the screen or clearing form state.
- `Đăng xuất` is guarded against repeated presses and shows a loading state.
- Logout attempts the server call, but always clears the local session and both
  Google/Firebase identity sessions even when the request fails.
- Navigation dismisses the previous stack only when one exists, then replaces the
  current route with `/login` without dispatching an unhandled `POP_TO_TOP`.
- Returning from Login cannot reveal the previous Complete Profile screen.
- Existing profile completion still creates the profile and routes to Home.

## Open questions
- None. The supplied request and current repository architecture determine the flow.

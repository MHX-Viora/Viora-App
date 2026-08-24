# Implementation Plan: Logout from profile completion

## Architecture decisions
- Make the existing `logout()` the single owner of local session and provider cleanup.
  Callers may add feature-specific cleanup such as unregistering an already-registered
  push token, but must not duplicate auth-session deletion.
- Use a screen-local modal because this confirmation needs async loading/disabled
  behavior not supported by the generic informational `AuthAlert`.
- Guard `dismissAll()` with `canDismiss()` before `replace("/login")`, because
  Complete Profile can be the root route and cannot handle `POP_TO_TOP`.

## Tasks

### Task 1: Guard shared logout cleanup
- Acceptance: `logout()` clears SecureStore and Google/Firebase state from `finally`,
  including when the server request fails.
- Verify: focused regression test and TypeScript.
- Files: `services/auth.service.ts`, `features/auth/complete-profile-logout.test.mjs`.

### Task 2: Add the Complete Profile exit slice
- Acceptance: header action, exact confirmation content, form-preserving cancel,
  single-flight logout, loading state, and stack reset are present.
- Verify: focused regression test, TypeScript, ESLint.
- Files: `features/auth/complete-profile-screen.tsx`,
  `features/auth/complete-profile-logout-dialog.tsx`.
- Dependency: Task 1.

### Task 3: Remove obsolete caller duplication
- Acceptance: existing Profile logout still unregisters its device push token and
  stops realtime, while shared `logout()` owns session deletion.
- Verify: TypeScript and full app tests.
- Files: `features/profile/profile-screen.tsx`.
- Dependency: Task 1.

## Checkpoint
- Full `npm test`, `npx tsc --noEmit`, and `npm run lint` pass.
- Diff review confirms no backend, dependency, or FCM storage changes.

## Risks and mitigations
- Server logout can fail offline: cleanup is in `finally`; UI still reaches Login.
- Google account A can remain selected: shared logout calls both Firebase sign-out and
  native Google sign-out.
- Expo history can retain Complete Profile: dismiss all stack entries before replace.
- Rapid taps can race: a ref guard is set synchronously before awaiting any work.

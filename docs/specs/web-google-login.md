# Spec: Google login on Web

## Objective

Enable Google login in the Expo Web build without changing the existing Android/iOS Google login implementation. Web authenticates through Firebase Auth, sends the resulting Firebase ID token to the existing ANKT Google-login endpoint, and then follows the existing session flow.

## Tech stack

- Expo Router and React Native Web
- Firebase JavaScript SDK, isolated in a `.web.ts` platform adapter
- Existing `POST /api/accounts/google-login` contract
- Existing native `services/google-auth.service.ts` remains unchanged

## Commands

- Test: `npm test`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web build: `npx expo export --platform web`
- Dependency audit: `npm audit --omit=dev`

## Project structure

- `services/google-auth.service.ts`: existing native implementation
- `services/google-auth.service.web.ts`: Web-only Firebase popup implementation
- `.env.example`: required public Firebase Web configuration names
- `services/google-auth-web.test.mjs`: platform-isolation and token-flow regression tests

## Code style

```ts
const credential = await signInWithPopup(auth, new GoogleAuthProvider());
return getIdToken(credential.user, true);
```

Use platform files instead of branching inside the shared login screen. Validate configuration before opening the popup and never log identity tokens.

## Testing strategy

- Assert the Web adapter imports only the Firebase JavaScript SDK.
- Assert the native adapter is not modified by the Web implementation.
- Assert popup cancellation returns `null`, while configuration and provider failures remain actionable errors.
- Run the full frontend suite, type check, lint, Web export, and dependency audit.

## Boundaries

- Always: use the existing backend endpoint and existing session persistence.
- Ask first: backend contract, CORS policy, or native authentication changes.
- Never: place private keys/client secrets in the Web bundle, log tokens, or silently fall back to native SDKs on Web.

## Success criteria

- Clicking “Tiếp tục với Google” on Web opens Firebase Google sign-in.
- A successful popup yields a Firebase ID token accepted by the current backend.
- Cancelling the popup leaves the user on the login page without an error.
- Android/iOS continue resolving the existing native service file unchanged.
- Missing Web configuration produces a clear setup message.

## Open questions

- Deployment origins must be supplied by the owner for Firebase Authorized Domains and backend CORS.

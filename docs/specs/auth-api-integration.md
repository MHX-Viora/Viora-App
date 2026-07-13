# Spec: Auth API integration

## Objective
Connect register, login, and first-profile screens to backend APIs. Persist authenticated session securely, route users without a profile to onboarding, and show success/error feedback.

## Tech stack and commands
- Expo Router, React Native, TypeScript, native `fetch`, Expo SecureStore.
- Verify: `npm run lint`, `npx tsc --noEmit`.

## Structure and style
- `services/auth.service.ts`: named `register`, `login`, and `refreshToken` fetch functions.
- `services/user.service.ts`: named `createProfile` and `updateProfile` fetch functions.
- Screens import service functions and never call `fetch` directly.
- Service code stays explicit and beginner-friendly: short functions, shared JSON/error parsing only, and comments explain only non-obvious behavior.
- `stores/`: session persistence API.
- `features/auth/`: controlled forms, validation, loading, feedback, navigation.
- Host comes from `EXPO_PUBLIC_API_URL`; `.env` stays local, `.env.example` documents config.

## API contract
- `POST /api/accounts/register`: `{ identifier, password }` -> `{ message }`.
- `POST /api/accounts/login`: `{ identifier, password }` -> `{ status, accessToken, user }`.
- `POST /api/accounts/refresh-token`: refresh cookie -> `{ accessToken }`.
- `POST /api/users/profile`: bearer token + `{ displayName, avatarUrl, coverUrl, gender }` -> `User`.
- `PATCH /api/users/profile`: bearer token + profile fields -> updated `User`.
- Any non-2xx or payload with `status: 0` becomes a user-facing error. ASP.NET validation `errors` is flattened when `message` is absent.
- Gender mapping: Nam = 0, Nữ = 1, Khác = 2.
- Protected APIs retry once on `401`: refresh cookie -> save the new access token -> resend with the new bearer token.
- The refresh endpoint never retries itself, preventing an infinite refresh loop.

## Testing strategy
- Typecheck, lint, and Expo web export verify the final source after temporary tests are removed.
- Typecheck and lint cover screen/service integration.
- Browser runtime check covers rendering and console; live API success depends on configured reachable host.

## Boundaries
- Always: trim identifier/name, require password length 8-128, prevent duplicate submits, never log tokens/passwords.
- Ask first: backend contract changes or file-upload service addition.
- Never: commit real host credentials/token or store token in web localStorage.

## Success criteria
- Registration accepts email or phone and reports backend success/error.
- Login persists token and user; `user === null` routes to `/complete-profile`, otherwise `/`.
- Profile sends avatar/cover URI, name, gender with bearer token; returned user replaces stored user, then routes home.
- A profile request receiving `401` refreshes the token, persists it, and retries exactly once.
- Missing config, malformed responses, HTTP failures, and network failures show readable errors.
- Auth feedback uses one accessible in-app modal with info, success, and error states; action callbacks run only after the user presses the action button.

## Assumptions
- `status === 1` means success and `status === 0` means failure.
- Image picker URI is accepted as the API URL string; no upload endpoint was supplied.

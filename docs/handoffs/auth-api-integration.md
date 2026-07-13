# Auth API integration handoff

## Delivered
- Host config via ignored `.env` and committed `.env.example` (`EXPO_PUBLIC_API_URL`).
- Each service function follows the direct `async`/`await` fetch structure used by the project.
- `auth.service.ts` owns register/login/refresh-token; `user.service.ts` owns profile APIs.
- `authenticated-fetch.ts` retries protected requests once after `401`, then persists the refreshed access token.
- `api-response.ts` contains the only shared parsing/error helpers; the separate type-guard file was removed to keep the service layer small.
- Normalized HTTP, `{ status: 0, message }`, ASP.NET validation, malformed response, and network errors.
- Secure native session persistence with Expo SecureStore; web uses memory only to avoid browser-readable token storage.
- Register/login/profile screens now validate, prevent duplicate submit, show a themed success/error/info modal, persist session/user, and route by nullable user.

## Verify
- `npx tsc --noEmit`
- `npm run lint`
- `npx expo export --platform web`

Temporary auth/session tests passed 11/11 before removal, as requested.

## Integration notes
- Replace `http://localhost:5000` in local `.env` with the reachable backend host. Android emulator commonly needs `10.0.2.2` instead of `localhost`.
- Profile currently sends local picker URIs as `avatarUrl`/`coverUrl`, matching supplied string contract. Add an upload service first if backend requires public URLs.
- Register request field `identifier` is inferred from email-or-phone behavior and login contract; confirm against backend DTO.
- Audit reports 14 moderate transitive Expo toolchain advisories; available automatic fix upgrades Expo to 57 and was intentionally not applied.

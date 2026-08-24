# Web Google login handoff

## Implementation

- Web resolves `services/google-auth.service.web.ts`; Android/iOS continue resolving the unchanged native `services/google-auth.service.ts`.
- Web uses Firebase `signInWithPopup`, keeps the Firebase session in memory, retrieves a fresh Firebase ID token, and sends it through the existing login screen/API flow.
- Popup cancellation returns `null`; setup, domain, popup-blocking, and network failures return user-facing Vietnamese messages.
- Firebase is now an explicit production dependency.

## Required owner setup

1. In Firebase project `com-quyentrinh-viora`, register a Web app if one does not already exist.
2. Copy the Web app configuration into deployment/local environment variables listed in `.env.example`.
3. In Firebase Authentication, enable the Google provider and choose a project support email.
4. Add `localhost` for local development and every deployed Web hostname under Authentication > Settings > Authorized domains.
5. Add every deployed Web origin to backend `Cors__AllowedOrigins__N` and redeploy the API.
6. Confirm Firebase Admin on the backend uses a service account from the same Firebase project.
7. Rebuild/redeploy the Web bundle after setting `EXPO_PUBLIC_*` values.

## Verification

- 109 tests pass.
- TypeScript and Expo lint pass.
- Production Web export passes.
- Native Google-auth service has no diff.
- `npm audit --omit=dev` reports pre-existing Expo/Metro/toolchain findings: 13 high and 12 moderate. No automatic fix was applied because the complete fix proposes a breaking Expo upgrade.

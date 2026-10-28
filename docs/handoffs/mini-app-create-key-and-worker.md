# Mini App creation: encryption configuration and legacy worker

- The API returns `CREDENTIALS_UNAVAILABLE` (503) when the active MiniApps encryption key is missing or invalid. Encryption requires a version and a Base64-encoded 32-byte key.
- Added a cryptographically random, uniquely versioned key to the private backend `.env`; no secret values are recorded here. Added the required variable names and key retention guidance to backend `.env.example`.
- The frontend currently uses the hosted backend. Local `.env` changes do not update Render. Copy the two new `MiniApps__ActiveKeyVersion` / `MiniApps__EncryptionKeys__<version>` entries into the backend Render Environment and redeploy. Retain all older key versions needed to decrypt existing credentials. Never place these keys in frontend configuration.
- The screenshot also shows a legacy `/sw.js` controller failing to clone consumed responses. Added a narrow migration to activate the existing `/firebase-messaging-sw.js` replacement for that controller only, without clearing storage or reloading the page. Normal worker update policy remains in place.
- Validation: 18 MiniAppService/MiniAppApi backend tests passed; 5 worker tests passed; frontend TypeScript and targeted ESLint passed.
- Limits: Render environment has not been updated through this workspace. Hosted creation and browser takeover of an actual installed legacy worker still require runtime verification after deployment. No account or Mini App was created for testing.

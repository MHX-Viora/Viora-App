# Account, incoming-call, and QR polish

## Scope

- Hide every public account-style badge (including Journalist) while preserving stored account-style data and backend behavior.
- Google sign-in must never replace an existing profile display name with its email address. New Google users may use the verified Google name only as an initial suggestion/fallback.
- On Android, an incoming call received while the app is backgrounded or the phone is locked must use the dedicated call channel, ringtone, vibration, and full-screen incoming-call entry point. Foreground calls continue to use the in-app incoming-call host.
- Both profile and group QR scanners must allow selecting an image from the device. Selected images remain local and decoded QR data goes through the same validation as camera scans.

## Acceptance criteria

1. No account-style label is rendered on feed, profile, or article screens.
2. Linking/signing in with Google preserves a non-empty existing display name.
3. Play-distributed Android builds declare and request the required full-screen-call capability and display incoming calls on the call channel with sound/vibration.
4. Profile and group scanner screens expose an accessible `Chọn ảnh QR` action, handle cancellation, invalid images, and valid QR images.
5. Focused automated tests, TypeScript checks, and relevant backend tests pass.

## Out of scope

- Removing AccountStyle from the database/API.
- Changing profile names that were already saved as an email by users or old releases.
- Uploading gallery images to the server.

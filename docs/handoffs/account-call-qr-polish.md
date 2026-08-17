# Account, incoming-call, and QR polish handoff

## Delivered

- Public account-style badges were removed from feed cards, profile overviews, and article readers. AccountStyle data remains unchanged.
- Google identity verification now carries the verified `name` claim. Login repairs only the legacy case where `User.DisplayName` equals the account email; all other existing names are preserved. The repaired value is capped at the database limit of 100 characters.
- Android background incoming-call notifications now always include Notifee's full-screen action. The old `AppState` check was unsafe in headless background tasks and could downgrade a call to a regular notification.
- Profile and group QR scanners now decode a QR from a locally selected image via `expo-image-picker` and `expo-camera`. Existing target validation and navigation are reused.

## Verification

- `npm test`: pass
- `npx tsc --noEmit`: pass
- `npm run lint`: pass
- `dotnet build Viora.Application.Tests/Viora.Application.Tests.csproj --no-restore -p:UseSharedCompilation=false -nodeReuse:false -m:1`: pass
- Focused `GoogleLoginServiceTests`: 6/6 pass. This workspace requires `-m:1` because parallel MSBuild project-reference evaluation fails without diagnostics.

## Device verification

- Install a new Play test build because the call/native changes are compiled into the AAB.
- On Android, allow notifications and ensure the `Cuộc gọi đến` channel has sound, vibration, and pop-on-screen enabled.
- Test with the recipient app backgrounded and with the screen locked.

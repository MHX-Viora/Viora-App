# Spec: Rich chat notifications

## Objective

Show polished Android chat notifications with the correct private/group title,
circular sender or conversation avatar, and attachment-aware preview using the
native messaging notification style.

## Tech stack

- Expo 54 / React Native 0.81
- Notifee 9.1
- Firebase Cloud Messaging
- ASP.NET Core backend with Firebase Admin SDK

## Commands

- Client test: `node --experimental-strip-types services/chat-push-notification.test.mjs`
- Client type-check: `npx tsc --noEmit`
- Client lint: `npm run lint`
- Backend test: `dotnet test Viora.Infrastructure/Viora.Infrastructure.Tests/Viora.Infrastructure.Tests.csproj`

## Project structure

- `viora/services/`: FCM receipt and native notification rendering
- `viora-BE/Viora.Application/Chat/`: chat push payload creation
- `viora-BE/Viora.Infrastructure/Realtime/`: Firebase transport

## Code style

Keep payload mapping pure and independently testable. Native display functions
consume the mapped model and do not fetch user data in a background handler.

## Testing strategy

- Unit-test chat payload mapping, including missing avatar/content fallbacks.
- Contract-test Android chat pushes as data-only messages.
- Run client type-check/lint and backend notification tests.
- Verify on a physical Android device with the app backgrounded.

## Boundaries

- Always: use HTTPS avatar URLs when available and retain navigation IDs.
- Ask first: add direct-reply/read actions or notification history grouping.
- Never: download credentials or include authentication data in FCM payloads.

## Success criteria

- Android notification shows sender name and avatar beside the message.
- Group notifications show the group name/avatar and identify the sender.
- Image, video, audio, and file messages use readable preview labels.
- Tapping opens the correct conversation.
- Background delivery does not create a duplicate Firebase default notification.
- Missing/broken avatars fall back safely to a generated person icon.
- Existing call and general-notification flows remain unchanged.

## Open questions

- iOS rich-avatar support is deferred; iOS keeps the standard notification.
- Reply/read action buttons are deferred.

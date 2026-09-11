# Spec: Chat attachment downloads

## Objective

Allow users to download an individual image, video, document, or audio file from a chat message and from the conversation's shared-content manager.

## Commands

- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Android build: `cd android; .\gradlew.bat app:assembleDebug -x lint -x test`

## Project Structure

- `services/chat-attachment-download.service.ts`: platform-aware download/export behavior.
- `features/chat/chat-screen.tsx`: download action for an individual sent attachment.
- `features/chat/conversation-attachments-screen.tsx`: long-press selection and download action.
- Colocated `.test.mjs` files: download and interaction regression coverage.

## Code Style

Follow the existing React Native hooks, themed styles, Vietnamese labels, app toast errors, and one-attachment-per-message behavior. Keep platform-specific file handling behind one service function.

## Testing Strategy

- Unit-test filename sanitization, platform routing, success, and failure outcomes.
- Source-level UI guards verify that chat actions and shared-content long press target exactly one attachment.
- Run the existing full test suite, TypeScript, lint, and Android debug build.

## Boundaries

- Always: preserve attachment opening/playback, show progress/error feedback, and download only the selected attachment.
- Ask first: add the Expo file-system dependency needed for reliable iOS saving (approved).
- Never: refetch messages, mutate attachment records, or bundle multiple files into one download action.

## Success Criteria

- Images, videos, documents, and audio can each be downloaded from chat.
- Long-pressing one shared-content item reveals a download action for only that item.
- Web triggers a browser download; Android saves directly to Downloads without opening a share sheet. iOS asks for a destination folder and saves directly there.
- The selected attachment displays an in-place “Đang tải xuống...” overlay until the download completes or fails.
- A clear success or failure message is shown, and repeated taps cannot start duplicate downloads for the same selection.
- Existing chat behavior and verification commands remain green.

## Open Questions

None. Direct `expo-file-system ~19.0.24` dependency was approved.

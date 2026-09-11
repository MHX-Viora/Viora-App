# Handoff: Chat attachment downloads

## Delivered

- Web downloads remote chat attachments with a Blob and browser download action.
- Android saves directly to the public Downloads folder; iOS asks for a destination folder and saves there.
- Chat long press targets one attachment and adds a download icon to its action menu.
- Shared content long press opens a bounded action sheet for the selected item.
- The exact image, video, document, or audio row shows an in-place “Đang tải xuống...” overlay until completion.
- Safe filenames, duplicate-tap guards, and Vietnamese success/error feedback are included.

## Files

- `services/chat-attachment-download.service.ts`
- `utils/chat-attachment-download.ts`
- `features/chat/chat-screen.tsx`
- `features/chat/conversation-attachments-screen.tsx`
- `android/app/src/main/java/com/ankt/app/downloads/ChatAttachmentDownloadModule.kt`
- Related `.test.mjs`, dependency, spec, and plan files.

## Verification

- `npm test`: 209 passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- Android `app:assembleDebug`: passed.
- Debug APK installed and launched on device `3044529636001A2`.

# Plan: Chat attachment downloads

1. [x] Add focused failing tests for filename handling, platform download behavior, and single-item UI actions.
2. [x] Add a small platform-aware attachment download service and make the focused tests pass.
3. [x] Add download to the chat message action menu without changing open/play/reply/recall/forward behavior.
4. [x] Add long-press selection and a download action sheet to shared content for media, documents, and audio.
5. [x] Run focused tests, full tests, TypeScript, lint, Android build, then review the final diff.
6. [x] Replace native sharing with direct device saving and expose completion from Android Download Manager.
7. [x] Display an in-place downloading overlay on the exact chat/shared-content attachment, then rerun verification.

## Risks

- Remote URLs may omit extensions or reject requests; derive a safe fallback filename and surface failures.
- Native save behavior differs by OS; use Android Download Manager and the iOS directory picker.
- Long press can conflict with audio playback or media opening; bind it separately and keep normal press unchanged.

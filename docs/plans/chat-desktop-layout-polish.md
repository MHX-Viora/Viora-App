# Implementation plan: Chat desktop layout polish

## Task 1: Lock layout behavior with tests

- Acceptance: tests describe desktop settings split, compact standalone settings, full-width desktop split, and hidden message scrollbar.
- Verify: targeted test fails before implementation.
- Files: `features/chat/responsive-chat-layout.test.mjs`.

## Task 2: Reuse the desktop chat shell for settings

- Acceptance: desktop settings shows list left/settings right with the desktop header; compact/native behavior is unchanged.
- Verify: targeted tests and typecheck pass.
- Files: `features/chat/responsive-chat-layout.ts`, `features/chat/responsive-chat-screen.tsx`, `app/chat/settings/[conversationId].tsx`.

## Task 3: Apply full-width and scrollbar polish

- Acceptance: desktop split has no large-desktop width cap; message list scrollbar is hidden while scrolling remains enabled.
- Verify: full tests, lint, Web export, and responsive browser check when runtime is available.
- Files: `features/chat/responsive-chat-screen.tsx`, `features/chat/chat-screen.tsx`.

## Risks

- Route back behavior must still return from settings to the active conversation.
- Existing uncommitted Web work is preserved; edits stay limited to the files above.

## Follow-up: contextual room settings

### Task 4: Desktop room popover

- Acceptance: long press anchors a fixed-width action popover beside the sidebar; mobile retains the bottom sheet.
- Verify: layout helper tests cover top/bottom clamping and compact fallback.
- Files: `features/chat/responsive-chat-layout.ts`, `features/chat/conversations-screen.tsx`, layout tests.

### Task 5: Wide desktop settings rail

- Acceptance: wide desktop renders list, current room, and a bounded settings rail; narrower desktop remains list/settings.
- Verify: responsive mode tests, full tests, typecheck, lint, and Web export.
- Files: `features/chat/responsive-chat-layout.ts`, `features/chat/responsive-chat-screen.tsx`, layout tests.

### Task 6: Center conversation-settings subpages

- Acceptance: attachments, links, members, search, and report routes share one bounded desktop width and remain full-width on mobile/native.
- Verify: route-source regression test, full tests, typecheck, lint, and Web export.
- Files: settings route modules, `theme/layout.ts`, responsive chat layout tests.

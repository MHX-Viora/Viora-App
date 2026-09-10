# Implementation plan: Message composer redesign

## Task 1: Lock multiline sizing behavior

- Acceptance: tests define 44px minimum, 116px maximum, shrink behavior, and internal scrolling at the cap.
- Verify: targeted test fails before implementation and passes afterward.
- Files: `features/chat/message-composer-layout.test.mjs`, `scripts/test.mjs`.

## Task 2: Implement bounded shared input sizing

- Acceptance: native/Web input uses controlled height, `onContentSizeChange`, `scrollEnabled`, and resets after send.
- Verify: targeted tests and typecheck pass.
- Files: `features/chat/message-composer-layout.ts`, `features/chat/chat-screen.tsx`.

## Task 3: Apply the cohesive composer visual system

- Acceptance: attachment/sticker buttons are neutral and consistent, plus/sticker icons are clear, actions are bottom-aligned, send states are polished, and existing handlers remain wired.
- Verify: source checks, lint, Web export, and runtime visual inspection when available.
- Files: `features/chat/chat-screen.tsx`.

## Checkpoint

- Full tests, typecheck, lint, and Web export pass.
- Diff contains no API, service, model, database, navigation, or realtime changes.

## Risks

- React Native reports content size differently across platforms; the shared clamp treats non-finite/invalid values safely.
- The existing composer is large; changes stay localized to state, input props, tool markup, and composer styles.

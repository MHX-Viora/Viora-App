# Spec: Create short-video post

## Objective
Connect the Reels create action to a TikTok-inspired two-step full-screen flow: a dark capture-style stage for selecting and previewing one video, followed by a focused metadata/publish step.

## Tech Stack and Commands
- Expo, React Native, TypeScript, existing `expo-image-picker`; no new dependencies.
- Verify: `npx tsc --noEmit` and `npm run lint`.

## Structure and Style
- Creation UI and local video preview belong in `components/reels`; picker and feed mutation remain in `features/reels/screens`.
- Reuse theme tokens, accessible controls, and the existing `Reel` contract.

## Testing Strategy
- Type-check and lint. Manually verify permission denial, cancel selection, validation, submit, close/reset, and playback of the new local video because no test runner is configured.

## Boundaries
- Always: require a selected video, pause background playback while creating, reset draft on close.
- Ask first: server upload, compression, editing, camera capture, or new dependencies.
- Never: add a draft without a valid video URI or mutate imported seed data.

## Success Criteria
- The plus button opens a dark, camera-style selection screen with a prominent capture control and gallery action.
- A selected video previews in place; the user then advances to enter caption/hashtags.
- Publish stays disabled until a video is selected.
- Publishing prepends the new video and returns to Reels.

## Open Questions
- None; persistence and upload are intentionally outside this local prototype.

# Spec: Create short-video post

## Objective
Connect the Reels create action to a futuristic two-step full-screen flow: users can record a video with the device camera or select one from the library, then add metadata and publish it.

## Tech Stack and Commands
- Expo 54, React Native, TypeScript, existing `expo-camera`, `expo-image-picker`, and `expo-video`; no new dependencies.
- Verify: `npx tsc --noEmit` and `npm run lint`.

## Structure and Style
- Camera capture and local video preview belong in `components/reels`; picker and feed mutation remain in `features/reels/screens`.
- Reuse theme tokens, accessible controls, and the existing `Reel` contract.

## Testing Strategy
- Type-check and lint. Manually verify camera/microphone permission denial, recording start/stop, three-minute auto-stop, timer, camera flip, torch, library selection, submit, close/reset, and local playback because no test runner is configured.

## Boundaries
- Always: require a selected video, request camera and microphone permissions at the boundary, stop recording before unmounting, pause background playback while creating, reset draft on close.
- Ask first: video filters rendered into the exported file, audio mixing, compression, or new dependencies.
- Never: add a draft without a valid video URI or mutate imported seed data.

## Success Criteria
- The plus button opens a dark, camera-style selection screen with a prominent capture control and gallery action.
- With permission, the live camera can record up to three minutes with working flip-camera, torch, and timer controls.
- A selected video previews in place; the user then advances to enter caption/hashtags.
- Publish stays disabled until a video is selected.
- Publishing prepends the new video and returns to Reels.

## Open Questions
- Rendered beauty/effect filters and external audio mixing remain outside this increment.

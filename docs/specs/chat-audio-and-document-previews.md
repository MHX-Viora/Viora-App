# Spec: Chat audio and document previews

## Objective

Make pending documents and recordings look like their sent-message cards, allow a completed recording to be played before sending, and make recorded audio upload/play reliably on Web, Android, and iOS.

## Commands

- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web: `npx expo start --web`

## Project Structure

- `features/chat/chat-screen.tsx`: recording lifecycle and sent audio playback.
- `components/chat/pending-attachment-preview.tsx`: pending attachment cards and recording playback.
- `utils/chat-recording.ts`: platform-specific recording metadata.
- Colocated `.test.mjs` files: regression coverage.

## Code Style

Keep existing React Native hooks, theme tokens, immutable attachment updates, and accessible `Pressable` controls. Use one attachment model across pending, optimistic, and uploaded states.

## Testing Strategy

Unit-test recording metadata and guard Web Blob-to-File conversion, playback reset/replay, and pending document/audio controls. Verify the full test suite, TypeScript, lint, and the authenticated browser flow when available.

## Boundaries

- Always: keep one attachment per outgoing message and preserve image/video behavior.
- Ask first: backend contract changes or new media dependencies.
- Never: auto-send a recording when recording stops or autoplay audio.

## Success Criteria

- Pending documents show their file name in a sent-style card.
- Pending recordings show duration and working play/pause before send.
- Web recordings upload as a real `audio/webm` file.
- Native recordings use broadly playable MPEG-4 AAC metadata.
- Sent audio resets playback mode and can replay after reaching the end.
- Existing tests, TypeScript, and lint pass.

## Open Questions

None. The existing attachment upload and message contracts remain unchanged.

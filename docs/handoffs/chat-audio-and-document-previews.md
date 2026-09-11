# Handoff: Chat audio and document previews

## Delivered

- Pending documents render as horizontal cards with their real file names.
- Pending audio renders with play/pause, waveform, duration, and removal controls.
- Recorded Web audio is uploaded as a real `audio/webm` `File`; Android/iOS use MPEG-4 AAC `.m4a` metadata.
- Chat and shared-attachment audio reset the app playback mode and replay from zero after completion.

## Main files

- `components/chat/pending-attachment-preview.tsx`
- `features/chat/chat-screen.tsx`
- `features/chat/conversation-attachments-screen.tsx`
- `utils/chat-recording.ts`
- `utils/chat-audio-playback.ts`

## Verification

- `npm test`: 216 passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- Chrome supports the selected WebM record/play path and preserves the WebM `File` in multipart data.
- Authenticated chat UI could not be exercised in the local browser because the available session was logged out; localhost also showed the pre-existing backend feed CORS error.

# Live basic emoji

- Objective: replace the Live viewer's sticker picker with common Unicode emoji.
- Acceptance: the smile button opens an emoji grid on desktop and mobile; selecting an emoji appends it to the current comment draft without sending; Send uses the existing realtime comment path.
- Structure: localized changes in `features/live/live-viewer-screen.tsx`; retain sticker rendering for incoming comments.
- Style: existing React Native `Pressable`, `Text`, and `StyleSheet` patterns; `setDraft((current) => current + emoji)` preserves typed text.
- Verify: `npx tsc --noEmit`; `npx eslint features/live/live-viewer-screen.tsx`; browser interaction when a Live session is accessible.
- Boundaries: no new dependencies, backend changes, or changes to shared sticker packs. Opening, closing, and picking emoji must not send a comment.

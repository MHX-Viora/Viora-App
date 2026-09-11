# Message composer redesign handoff

## Delivered

- Refreshed the shared Expo native/Web composer; no platform duplicate was added.
- Unified attachment, sticker, input, and send controls in one 46px initial-height surface with 44px touch targets.
- Replaced the tools glyph with a plus icon and normalized neutral, hover, pressed, active, disabled, and tooltip states.
- Prevented attachment/sticker controls from shrinking out of the native row and increased their resting-state contrast.
- Added a transparent outside-press layer so either open panel closes when the user taps the conversation area.
- Split the picker presentation into Camera, Image, Video, Document, Audio, and the existing Location action while retaining the existing picker/upload handlers.
- Capped multiline input at 116px with internal scrolling and reset/shrink behavior.

## Contracts preserved

- `send`, `sendSticker`, `takePhoto`, `pickMedia`, `pickFiles`, `toggleRecording`, and `shareLocation` remain the action entry points.
- `sendChatMessage`, payload shapes, attachment models, realtime subscriptions, reply behavior, navigation, and backend code were not changed.
- No edit-message flow exists in this screen, so none was introduced.

## Verification

- `npm test`: 189/189 passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npx expo export --platform web`: passed.
- `npx expo export --platform android`: passed.
- Verified on a connected 1080x2408 Android device: attachment/sticker buttons render, the attachment panel opens, and tapping the message area dismisses it.
- Local Web shell loaded, but composer visual inspection requires an authenticated session; the unauthenticated build redirects to `/login`.

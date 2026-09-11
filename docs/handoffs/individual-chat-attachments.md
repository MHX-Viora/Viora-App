# Handoff: Individual chat attachments

## Result

- Composer text is sent first as a standalone message.
- Every selected image, video, audio, or document is sent afterward as a standalone message in selection order.
- Each optimistic message independently resolves to `sent` or `failed`.
- Reply metadata is applied only to the first generated message.
- Existing single-message, sticker, and location flows remain unchanged.

## Verification

- `npm test`: 203 passing.
- `npx tsc --noEmit`: passing.
- `npm run lint`: passing.

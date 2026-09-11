# Spec: Individual chat attachments

## Objective

Send every selected image, video, audio, or document as its own chat message so reply, forward, and recall affect only the selected attachment.

## Commands

- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`

## Project Structure

- `features/chat/chat-screen.tsx`: optimistic send flow and UI state.
- `features/chat/chat-send-units.ts`: pure attachment-to-message splitting rule.
- Colocated `.test.mjs` files: regression coverage.

## Code Style

Keep the existing React Native patterns and immutable state updates. Each send unit must contain at most one attachment.

## Testing Strategy

Unit-test the splitting rule and add a source-level integration guard for independent optimistic/server messages.

## Boundaries

- Always: preserve attachment order, realtime delivery, and single text/sticker/location sends.
- Ask first: backend contract or database changes.
- Never: group multiple selected files into one newly-created message.

## Success Criteria

- Two or more selected files produce the same number of independently actionable messages.
- Composer text is a separate message before all attachment messages.
- Each send result independently becomes `sent` or `failed`.
- Existing chat tests, TypeScript, and lint pass.

## Open Questions

None. Existing `POST /api/chat/messages` supports a one-attachment payload.

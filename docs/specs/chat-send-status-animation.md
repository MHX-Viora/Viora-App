# Spec: Chat send-status animation

## Objective

Show the outgoing message status on the same metadata row as its timestamp. Animate the pending label in and fade it out after the server confirms delivery, without moving the timestamp.

## Tech Stack

- React Native / React Native Web
- `Animated` from React Native
- Existing optimistic `ChatMessage.sendStatus` state

## Commands

- Focused test: `node --experimental-strip-types features/chat/chat-send-status.test.mjs`
- Full test: `npm test`
- Type-check: `npx tsc --noEmit`
- Lint: `npm run lint`

## Project Structure and Style

- Keep the presentation in `features/chat/chat-screen.tsx`.
- Keep the optional render identity in `types/chat.ts`.
- Use existing theme colors and spacing tokens.

## Testing Strategy

- Add a focused source regression test for inline metadata, animation, and stable optimistic render identity.
- Run the complete frontend checks after the focused test passes.

## Boundaries

- Always: preserve send, retry, realtime, attachment, and timestamp behavior.
- Ask first: changing API payloads or adding dependencies.
- Never: fake successful delivery or hide failed-send status.

## Success Criteria

- `Đang gửi…` and the timestamp share one row.
- The status animates in and fades out after `sendStatus` becomes `sent`.
- The timestamp remains right-aligned while the status disappears.
- Optimistic and confirmed forms of a message keep one React render identity.
- A realtime confirmation from the current user is reconciled with the pending
  message and never appears as a second bubble.

## Open Questions

- None.

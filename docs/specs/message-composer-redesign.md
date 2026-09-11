# Spec: Message composer redesign

## Objective

Redesign the shared Expo chat composer for native and Web so it is compact, cohesive, responsive, and capped when multiline, without changing chat APIs, payloads, realtime behavior, uploads, or navigation.

## Assumptions

- `features/chat/chat-screen.tsx` is the shared native/Web composer; no platform-specific duplicate is needed.
- Existing theme tokens and installed Expo vector icons are sufficient.
- The current reply preview remains above the input; no edit flow exists in this screen to redesign.
- Location remains available because it is an existing composer action, although it is outside the requested media list.

## Commands and structure

- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web export: `npx expo export --platform web`
- Composer UI remains in `features/chat/`; pure sizing logic and its test are colocated there.

## Boundaries

- Always: reuse current handlers, picker, attachment preview, sticker panel, safe-area handling, keyboard wrapper, theme tokens, and icon packages.
- Ask first: add dependencies or change API/realtime/upload contracts.
- Never: change message payloads, backend code, database, navigation, or redesign the rest of Chat.

## Success criteria

- Attachment, sticker, input, and send controls form one visually cohesive bottom-aligned row.
- Attachment uses a clear plus icon; sticker uses `sticker-emoji`; both share the same neutral/active states and have accessible Vietnamese labels/tooltips.
- Input grows from 44px to at most 116px, scrolls internally at the cap, shrinks after deletion, and resets after send.
- Send is 44px, clear when enabled, subdued when disabled, and retains the existing `send` handler.
- Existing Camera, media, file, audio, location, sticker, reply, upload, and realtime behavior stays intact.
- Layout uses theme tokens, supports native/Web and light/dark themes, and remains responsive.

## Testing strategy

- Pure unit tests cover minimum, intermediate, maximum, invalid size, and scroll threshold behavior.
- Source-level regression checks cover controlled height, `scrollEnabled`, reset-on-send, icon labels, and preserved handler wiring.
- Run the full unit suite, TypeScript, lint, and Web export; inspect the Web runtime when available.

# Spec: Chat desktop layout polish

## Objective

Polish the existing Web chat master-detail layout without changing chat data, routes, realtime behavior, or native/mobile navigation.

## Assumptions

- "Ô room bên phải" means conversation settings replaces the current right-hand detail pane while the conversation list remains visible on desktop.
- Desktop Web is `>= 1024px`; compact Web and native continue to show one screen at a time.
- Hiding the scrollbar is visual only: mouse wheel, trackpad, keyboard, and touch scrolling must continue to work.

## Commands and structure

- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web export: `npx expo export --platform web`
- UI and layout code remains in `features/chat/`; the settings route remains in `app/chat/settings/`.

## Boundaries

- Always: reuse `ConversationsScreen`, `ChatScreen`, `ConversationSettingsScreen`, desktop header, theme tokens, and current route params.
- Ask first: add dependencies or change API/realtime contracts.
- Never: change mobile navigation, message behavior, or backend code for this visual task.

## Success criteria

- Desktop chat fills the available width below the desktop header instead of stopping at the large-desktop max width.
- The conversation list remains on the left and chat/settings content occupies the full right pane.
- Opening conversation settings on desktop preserves the left conversation list and renders settings in the right pane.
- Chat, conversation-list, and settings panes remain scrollable with no visible vertical scrollbar.
- Compact/native settings remains a standalone screen.
- On wide desktop, conversation settings is a compact right rail beside the currently open room; the room list remains on the left.
- On narrower desktop, settings keeps the two-pane list/settings layout so the room content is not squeezed.
- Long-pressing a room on desktop opens a compact popover beside the room list, anchored near the pressed row, without dimming the whole page.
- Mobile keeps the existing bottom-sheet long-press menu.
- Every conversation-settings subpage (attachments, links, members, search, and report) uses a bounded, horizontally centered desktop frame while remaining full-width on compact/native layouts.

## Testing strategy

- Pure layout-mode tests cover desktop and compact settings behavior.
- Source-level regression checks cover the full-width split and hidden message scrollbar.
- Run the full unit suite, TypeScript, lint, and Web export.

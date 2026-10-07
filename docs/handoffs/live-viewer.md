# Live Viewer Handoff

## Delivered

- Live discovery cards open `/live/[id]`.
- A responsive viewer shows a wide media stage with a separate chat panel on desktop, and a portrait stage with overlaid chat and controls on phones.
- On desktop, both the chat history and comment input sit in the right panel; the media stage shows reactions and gift events without comment overlays.
- The first stream uses a generated local still image for both its card and viewer. Other streams use their existing mock thumbnails.
- Follow, likes, chat input, gift selection, stickers, and chat panel tabs update locally. Unknown stream IDs return to the Live list.
- Room content lives in `features/live/live-view-mock-data.ts`; stream records remain in `features/live/live-stream-mock-data.ts`.
- Mobile uses a compact interaction bar and `LiveGiftSheet` with a category grid. Selecting a tile reveals `Gửi` within that tile. The former quantity and status footer was removed. The sheet reads `anktCoinBalance` through the existing wallet service and links to `/wallet`. It does not mutate the balance.
- Sticker reuses `StickerPanel` and `/sticker-store`. On desktop it expands inside the sidebar below the comment field; mobile keeps the bottom sheet. The desktop audience list tab and mock viewer list were removed; the audience count badge remains.
- Desktop and mobile open the same gift grid from a button beside the comment field. On desktop, the grid expands inside the sidebar directly below the comment field and can be closed by tapping the gift icon again or the panel close button. Desktop gift cards use measured pixel widths in a regular scroll view so the narrow sidebar renders them reliably. Mobile keeps the bottom sheet. Selecting a gift reveals `Gửi` within its tile. Sending remains disabled until the Live Gift service exists.
- Each like updates the local count and heart animation immediately. The realtime client batches up to 20 reactions per call and flushes after 250 ms, while snapshots restore the authoritative persisted-plus-pending count after join or reconnect. The backend then aggregates those batches in memory and writes one count increment periodically or when the Live ends.
- Heart particles are anchored to the icon center inside each button and rise farther before fading. Portrait tablets use a centered viewer up to 640 px wide; landscape tablets retain the split video/chat layout and center it vertically.
- Audience video uses the same `cover` crop and non-mirrored orientation as the host preview. Web and native host capture target 1920x1080 at 60 fps, with adaptive fallback when the camera, device, network, or Agora cannot sustain it.
- The supporters tab now lists every mock sender with gifts. A small trigger opens the complete ranking on mobile; details are in `docs/handoffs/live-top-gifters.md`.

## API replacement boundary

- Replace the two mock modules with stream, chat, audience, and gift API data. The still image is a visual placeholder; no video transport or payment call exists.
- Local interactions reset on page reload and do not change the server.
- No Live Gift API or SignalR gift event exists in this client/backend. Sending is disabled until the backend contract is available; do not fake gift success or deduct wallet coins locally.

## Verification

- TypeScript and Expo lint passed for the earlier viewer work. The latest gift rendering and sticker placement changes passed `npx tsc --noEmit`.
- Earlier browser preview reviewed at 320, 360, 375, 390, 412, 430, and 1440 px. The mobile gift grid had no horizontal overflow, and the desktop sidebar had only chat and supporter tabs. Opening and closing the gift sheet preserved the media image DOM node. The temporary preview route was removed afterward. The new desktop inline panel has not received a fresh browser review.
- Native iOS/Android keyboard and SafeArea behavior, authenticated wallet balance, and gift send success/failure require device testing or the missing Gift API. No payment request was simulated.
- Browser responsive review covered 320, 390, 768, 820, 900, 1024 portrait and landscape, 1180, and 1440 px. No horizontal overflow was observed; preview console had no new animation errors.

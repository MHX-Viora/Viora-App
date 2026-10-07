# Live Viewer

## Goal

Open a responsive Live viewing page from each card in the Live discovery list.

## Behavior

- Desktop: a wide media stage, overlaid creator and live status, and a separate chat panel. The gift and sticker buttons beside the comment field expand their panels directly below the field.
- Phone: a tall media stage with floating status, chat, reactions, and one compact comment/sticker/gift bar. Gifts and existing sticker packs open in separate overlay sheets.
- Cards open `/live/[id]`. Unknown IDs show a return path to the Live list.
- Follow, reactions, chat entry, gift previews, and chat tabs work locally for the demo. The audience count remains visible, but there is no audience list.
- Gift prices come from the replaceable mock catalog; the coin balance comes from the current wallet API. Gift sending stays unavailable until a Live Gift endpoint exists.
- Demo chat and gift records remain in one mock data module; the Live list provides the viewer count.

## Data boundary

The media image is a still demo asset. No live transport, gift payment, or backend mutations are included.

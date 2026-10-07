# Live host UI handoff

## Entry and flow
`Bắt đầu live` on the discovery screen opens `/live/host`. `LiveHostScreen` owns a local flow: setup → device check → cancellable 3-second countdown → host room → confirmed end → summary. The device check also offers a clearly labelled interface demo when camera or microphone access is unavailable.

## Implementation
- `live-host-model.ts`: form rules and isolated sample viewers/comments.
- `live-host-setup.tsx`: cover picker, title/category/privacy/settings form.
- `live-host-room.tsx`: camera preview, device states, responsive video/chat/control layout, local chat.
- Mobile countdown shares the host camera surface with Live. Its overlay draws the timer and progress ring; the camera element stays in place as the overlay fades out. Safe-area insets position the badge and cancel action.
- `live-host-management.tsx`: in-place menu, local viewer/comment actions, live information edit, keywords and settings. Its overlay leaves the camera tree mounted.
- `live-host-screen.tsx`: permissions, countdown, connection notice, end confirmation, summary.
- `/live/host` uses per-screen default orientation so tablet landscape is available without changing the rest of the app.

## Backend boundary
Live creation persists title, category, cover, description, privacy, comment and gift settings. The host joins Agora, starts and ends the broadcast through the API, and receives realtime comments, viewer counts, reactions and gifts through SignalR. The separate demo path uses sample data. In-session edits and moderation are visibly local previews because the corresponding write APIs are not available; these states reset when the route is left. The summary shows verified server view counts when available and does not invent replay or unsupported metrics.

The host camera now targets 1920x1080 at 60 fps with a 1280x720/30 fps adaptive floor on web. Native uses the same 1080p/60 encoder target with balanced degradation. Host and audience both use `cover`, no mirroring, and the same landscape encoder dimensions, so their framing is consistent. Actual output still depends on camera, browser, device load, bandwidth, and Agora adaptation.

Reaction snapshots hydrate the host counter from the server aggregate plus pending in-memory reactions. Reaction taps are no longer persisted individually; the backend flushes their aggregate periodically and when the Live ends.

## Verification
Model tests, TypeScript, Expo lint, and backend project build pass. The web bundle compiles, but the authenticated host route redirects to login in this environment, so the updated setup and host screens need a signed-in browser check at representative widths. Native camera permissions, physical orientation, and negotiated 1080p/60 output still need device verification. Offline detection currently uses browser online/offline events; native connection state needs a network service.

# Live pin and gift overlay handoff

- `SetLivePinnedComment(liveId, commentId | null)` is host-only. Backend buffer stores one pinned comment separately from the bounded comment history; join snapshots include `pinnedComment`, and `LiveCommentPinned` broadcasts changes. Deleting the pinned comment clears it. The pin is transient, matching Live's in-memory comment model (not durable across backend restart).
- Mobile overlays render one pinned row above five rolling, non-duplicated comments. Desktop chat keeps the pinned row fixed above its scroll history. Both host and viewer consume snapshot and realtime pin changes.
- Live gift broadcasts include `senderAvatarUrl`. `LiveGiftOverlay` renders up to two right-aligned translucent pills with the sender avatar, real gift image, quantity, tier color, entrance/exit motion and reduced-motion support.
- `createLiveGiftQueueManager` owns a bounded FIFO queue. Confirmed events from the same sender and gift within 2.5 seconds merge into one combo, retrigger the quantity pop and extend the visible lifetime. Transaction IDs are deduplicated.
- Host and viewer chat surfaces are borderless; gift events remain outside the comment buffer and do not rerender the full Live screen.
- Verification: 409 frontend tests, focused Live layout/model/queue tests, typecheck and lint pass. Web bundle loads without Gift banner console warnings; full visual inspection still needs an authenticated Live session.

# Premium gift quantity lifecycles

## Root cause and flow

Previously, a transaction became one `PremiumGiftEffect`; same-sender/gift combos only incremented its `quantity`. The layer rendered `state.active` with one clock, so ×5 showed one cinematic. Waiting entries merged too, and `.slice(-5)` silently discarded older animations. This is replaced rather than retained behind the new scheduler.

The unchanged flow is `live-viewer-screen.tsx:sendGift` → one `services/live.service.ts:sendLiveGift(liveId,giftId,quantity,requestId)` POST → `../viora-BE/viora-BE/Controllers/LiveGiftsController.cs:Send` → SignalR `LiveGift` → `services/live-realtime.service.ts:connectLiveRoom` → host/viewer `onGift` → shared `useLiveGiftOverlay:showGiftEvent` → premium manager → descriptors → independently keyed scene clocks.

Backend validates quantity 1–99, computes `PriceCoin * Quantity`, persists one gift transaction/one wallet ledger debit and broadcasts the transaction ID plus quantity/effect metadata. Backend and payment/API/realtime code were read, not modified. Sender success refreshes wallet and closes the gift sheet; it does not enqueue local visuals. Realtime remains the sole animation source, avoiding optimistic + SignalR double playback.

## Scheduler

- `features/live/premium-gift-effect-model.ts:expandPremiumGift` creates N lightweight descriptors, IDs `${transactionId}-${index}`, quantity 1 each, original eventId/index/totalQuantity plus independent sender/avatar/name/gift/type snapshot. A deterministic ordinal selects trajectory/pattern/placement.
- `features/live/premium-gift-effect-manager.ts` owns FIFO waiting descriptors, one stagger timer, active descriptors and transaction counters. No merge/drop and no queue-size trimming. `MAX_ACTIVE_PREMIUM_GIFTS = 3`; mobile/short landscape stages and low-power devices use 2. Desktop uses 3. Lowering the cap lets already-running scenes finish and limits subsequent dispatch.
- Rocket stagger 300 ms; Fireworks 180 ms; Crown 500 ms. Instance duration remains Rocket 5–7 s (normally 6), Fireworks 4.5 s, Crown 4.8 s. Slots release only on real `Animated.timing` completion callbacks, not expiry guesses. `markStarted` comes from mounted scene effects, is idempotent and records actual start time. Dispatch waits for this acknowledgement before scheduling the next stagger, so delayed layout/mount cannot start multiple waiting scenes in one frame. In one event, received quantity = expanded descriptors = START = COMPLETE after drain.
- Each active instance has its own native-driven clock and stable React key. Combo transactions append descriptors and never reset running clocks. Different users/types retain their own metadata. Waiting instances hold no Canvas/SVG/animation resources.
- Dedupe keeps transaction IDs for the room lifetime, including after completion and beyond 300 later events; never dedupes by gift type/ID/sender. Room cleanup resets the ledger. Duplicate START/COMPLETE calls are ignored; an unmounted/unstarted descriptor cannot complete.
- Background pauses dispatch and running clocks; resume shifts timing instead of replaying batches. Layer remount resumes from stored start time; marking START again does not double count. Room leave/explicit clear cancels pending timer and drops descriptors as the documented cancellation exception. RAF/progress/media/AppState listeners, cached glow sprites and per-instance sound/haptic timers clean up with scene disposal.
- Progressive premium banners derive ×N from actual START counters, remain while pending/active units exist and retain sender snapshots. Counter follows 1 → 1.35 → .95 → 1; milestones 5/10/20 add increasing gold pulse/ring. They never stand in for animation instances. Normal gift banners retain their previous queue.

## Presentation/performance

Five deterministic Rocket paths; three bounded Crown placements (mobile 38/50/62%, desktop 40/50/60%, clamped by actual art size); Firework primary patterns rotate gold chrysanthemum, magenta ring, cyan star, golden willow, purple ring, with displaced positions. Ring particles already use multiple radial cohorts.

Overlap reduces intensity and particle quality without suppressing launch/final impact. Mobile caps were lowered after actual frame sampling; low-quality web Rocket caps DPR, plasma samples, tunnel density and faint-particle halos. Web mounts charge/flight/boost/finale/events only at their phase boundaries. This makes a few React updates per lifecycle, not per-frame state; particle drawing remains Canvas and motion remains Animated/SVG. Native keeps native-driver graphs, bounded by the scene cap.

## Verification

488 Node tests pass, including all three types ×1/2/3/5/10/20/50 with exactly N START/N COMPLETE, FIFO mixed transactions, unchanged running clocks, sender snapshots, strict cap/stagger, dedupe after completion and after 300 later events, pause/resume, mobile geometry/patterns, phase mounting, banner anchors and safe timer binding. Source regression verifies one sender API call carrying quantity and no local visual enqueue. TypeScript, Expo lint and offline Expo web export pass.

Chrome real presentation evidence (production effect layer/manager, full-duration clocks, unique instance DOM IDs observed and completion counters checked):

| Scenario | Actual START / COMPLETE | Notes |
| --- | --- | --- |
| Rocket ×5, viewer portrait | 5 / 5 | Duplicate delivery ignored; distinct Rocket visuals inspected |
| Fireworks ×5, viewer desktop | 5 / 5 | Distinct complete sequences, Canvas disposed |
| Crown ×5, viewer portrait | 5 / 5 | Different bounded placements inspected |
| Rocket ×10, actual host demo desktop | 10 / 10 | Duplicate event did not replay |
| Rocket ×20, viewer landscape | 20 / 20 | No overflow/drop; all unique DOM IDs observed |
| Rocket ×50, viewer portrait | 50 / 50 | Initial cap-4 stress run before performance tuning |
| A Rocket ×3 + B Fireworks ×5 + C Crown ×2 | 3/3 + 5/5 + 2/2 | Ten unique lifecycles and original senders |

Early cap-4 runs confirmed expansion, then concurrency was tuned to final 3 desktop/2 mobile. A final cap-3 host ×50 and final cap-2 mobile/mixed checks are recorded below. Viewer fixtures use production overlay/scene components; actual viewer screen host/mobile paths were traced. Host fixtures mount the actual `LiveHostRoom` in demo mode; no real account/payment/Agora connection was opened.

Final configuration: actual host demo desktop Rocket ×50 completed 50 START/50 COMPLETE, 50 distinct instance IDs observed, peak 3 mounted scenes/Canvas, 102.484 seconds, no overflow/errors and zero instances/Canvas after clear. Mobile mixed A Rocket ×3/B Fireworks ×5/C Crown ×2 completed 3/3 + 5/5 + 2/2, peak 2, 25.789 seconds, no overflow/errors, clean disposal. Final mobile Rocket ×5 duplicate-delivery rerun confirmed 5/5 with peak 2; each waiting descriptor eventually mounted and completed.

30 enqueue ×20 / wait for overlap / cancel cycles: post-GC heaps 10.431 / 10.473 / 10.520 MB at cycles 10/20/30 (baseline 9.867 MB). DOM 173 and event listeners 284 remained constant; Canvas/SVG zero after every batch. This finite test found no continuing listener/DOM accumulation, not a proof of unlimited-run leak absence.

Final headless browser rAF sample over ~6.3 seconds: mobile cap 2 yielded 382 callbacks (~61/s), p95 34.7 ms, 21 gaps over 34 ms; desktop cap 3 yielded 313 callbacks (~50/s), p95 41.6 ms, 43 gaps over 34 ms. Scheduling has spikes, especially desktop; this is not a guarantee of rendered/GPU 60 FPS. Actual native devices, Agora plus effects and GPU frame timing remain unmeasured. Native lifecycle/background hooks are implemented, with physical device validation still outstanding.

## Files

Production: `premium-gift-effect-model.ts`, `premium-gift-effect-manager.ts`, `premium-gift-effect-layer.tsx`, `premium-gift-banner-model.ts` (new), `live-gift-overlay.tsx`, `live-gift-banner.tsx`, `premium-gift-rocket-model.ts`, `premium-gift-rocket-scene.tsx`, `premium-gift-rocket-finale.tsx`, `rocket-journey-model.ts`, `rocket-journey-canvas.tsx`, `rocket-journey-canvas.web.tsx`, `rocket-visible-layers.ts` (new), `use-rocket-visible-layers.ts` (new), `premium-gift-crown-model.ts`, `premium-gift-crown-scene.tsx`, `fireworks-show-model.ts`, `fireworks-renderer.web.tsx`, `fireworks-renderer-native.tsx`, all under `features/live/`.

Tests: new `features/live/premium-gift-quantity.test.mjs`; revised `premium-gift-effect-model.test.mjs`, `premium-gift-effect-manager.test.mjs`, `live-gift-clock.test.mjs`; `scripts/test.mjs`. Preview `scripts/rocket-preview.tsx` exposes development-only quantity controls and START/COMPLETE metrics. Spec/plan in `docs/specs/live-premium-gift-quantity.md` / `docs/plans/live-premium-gift-quantity.md`. Diagnostics in `../.diagnostics/premium-quantity-*` and `quantity-*`.

Old tests asserting serialized/merged/drop semantics were revised to match this explicit new requirement; their invalid-input, timing, descriptor and anchor coverage is retained. No unrelated work was reset, no commit/deployment performed.

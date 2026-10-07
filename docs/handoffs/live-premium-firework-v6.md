# Fireworks V6

## Result and architecture
Applied `ui-styling` and `ui-ux-pro-max`. Presentation now includes curved staggered projectiles, layered luminous trails, localized anticipation/flash, offset color rings, secondary bursts, Golden Willow, grand finale, depth and twinkle. Sender caption is brief Vietnamese text from the actual event. Banner retains avatar/name/gift/count structure, with purple/magenta/orange gradient accents, border sparks, explosion pulse and 1.25x counter pop.

Web uses one transparent Canvas 2D surface. A bounded deterministic plan preallocates 443 particles on medium, 611 on high and 740 on ultra across the entire show (not all active simultaneously). Mobile reduces authored particles by ~27–40% against desktop tiers. Particle positions use analytic drag/gravity, individual lifetime/size/rotation, staggered layer delay and late twinkle. Cached 96px glow sprites avoid per-frame gradient construction. No particle React components or per-frame React state.

The existing Animated progress is the only clock. Its listener schedules at most one pending RAF; Canvas clears at progress 1. Listener and RAF are removed/canceled on unmount; visibility/AppState handlers suspend drawing and are removed on cleanup. Sprite cache is cleared and the canvas backing dimensions are zeroed. No continuous independent RAF loop or particle timers.

Native uses the same choreography, palette and seeded geometry in six compound SVG cohorts per burst, native-driver transforms/opacity, staggered rings and dedicated curved willow paths. Native physics are approximated per cohort rather than drawing each particle per frame. Skia is not installed; no new dependency was added. A development-only toggle renders the native SVG components in the web preview for visual checks; this does not measure actual native GPU performance.

Fireworks now stops its presentation clock on background like Rocket/Crown, and haptic callbacks skip background. Shared renderer debug metadata reports V6. Gift send/payment, coin, SignalR, live session, queue/combo reducers/managers and the 4500ms effect deadline remain unchanged. Combo updates quantity without restarting the scene or banner accent. Old sprite modules/model remain available but are not mounted by the new scene.

## Patterns and choreography
- Chrysanthemum: radial bloom with drag and downward bending.
- Star burst: sharper, faster particles with longer streaks.
- Ring: evenly distributed particle ring with staggered inner/outer rings.
- Willow: long gold curved tails, stronger gravity, extended lifetime and slow afterglow.
- Finale combines left/right patterns, a larger central willow and two subdued background bursts.

Timing is normalized to the existing 4.5s lifetime; the requested 7s example is adapted rather than extending queue timing:

| Time | Presentation |
| --- | --- |
| .18 / .34 / .50 / .65s | Four curved launches, ~158ms apart |
| Before each explosion | ~99ms hold, growing head glow and local white flash |
| 1.17 / 1.33 / 1.49 / 1.64s | Opening gold, magenta, cyan and willow patterns |
| +0 / 60 / 120ms | Inner/colored/outer particle layers; rings offset likewise |
| 1.62–2.03s | Three secondary bursts, ~450–540ms after their parents, ~32% radius |
| .72–2.12s | Sender and “THẮP SÁNG BẦU TRỜI” caption |
| 2.79s | Left and right finale |
| 2.94s | Largest central finale, ~149ms after sides |
| 3.11–3.22s | Two smaller background bursts |
| 3.3–4.5s | Golden Willow, sparkling rain, twinkle and afterglow; all fade to zero |

Coordinates derive from the measured Live container, not browser window size. Radius accounts for actual star overshoot and willow falling distance; deterministic tests check real sampled particle coordinates in portrait/landscape. Bottom space is reserved for controls. All effect surfaces are pointer-transparent and behind live controls; no video transform is introduced.

Reduced motion uses one short launch, one restrained gold explosion and sparse gold particles. Dense finale, color rings, willow layers and banner accents are omitted. System and user settings are respected.

## Files changed
New:
- `features/live/fireworks-show-model.ts`
- `features/live/fireworks-show.test.mjs`
- `features/live/fireworks-renderer.web.tsx`
- `features/live/fireworks-renderer-native.tsx`
- `features/live/fireworks-renderer.tsx`
- `features/live/fireworks-caption.tsx`
- `docs/specs/live-premium-firework-v6.md`
- `docs/plans/live-premium-firework-v6.md`
- This handoff.

Updated:
- `features/live/premium-gift-firework-scene.tsx`
- `features/live/live-gift-banner.tsx`
- `features/live/premium-gift-effect-layer.tsx` (background presentation/haptic guard)
- `features/live/premium-gift-effect-model.ts` (renderer metadata only)
- `features/live/premium-gift-effect-model.test.mjs` (metadata expectation)
- `scripts/firework-preview.tsx`
- `scripts/test.mjs` (one added import)

## Verification
- 459 tests pass, including deterministic plans, budgets, actual particle bounds, drag/gravity/expiration, finale center sizing and existing queue/combo regressions.
- TypeScript, repository lint and offline web export pass. Lint only reports the existing Node experimental proxy warning.
- Real component browser preview: 320×568 and 375×812 portrait, 768×1024 tablet, 1440×900 desktop, 812×375 landscape. Inspected launch, main bursts, finale/willow, reduced motion, banner and fade. No horizontal overflow or runtime exceptions.
- Native SVG preview inspected at 375×812; no runtime exceptions. Physical iOS/Android remains unmeasured.
- Production queue: combo ×2, input/button interaction during effects, mixed Firework/Crown/Firework progression. Cancel leaves 0 canvases, 0 SVGs and idle queue.
- System reduced motion: one Canvas plus static banner SVGs, no dense finale/animated banner accents. User reduced motion separately inspected.
- Frame scheduling over 4.8s: phone 502 frames, p95 interval 20.8ms, 0 gaps >34ms; desktop 463 frames, p95 20.9ms, 0 gaps >34ms. Browser scheduling on a still background is not a 60 FPS guarantee for native Agora/GPU rendering.
- 60 repeated production start/cancel cycles with forced GC: heap ~5.83MB at 20, ~5.92MB at 40, ~5.99MB at 60; canvases/SVGs return to zero. Growth slows substantially after warm-up. This finite sample does not establish absence of a long-term or native GPU memory leak.
- Reviewed scope, correctness, lifecycle, architecture, accessibility and performance. No new dependencies, per-particle DOM, payment/network changes or unrelated refactoring.

Diagnostics and export are outside the app in workspace `.diagnostics/`: `firework-v6-cdp-check.cjs`, screenshots, check logs and `firework-v6-export`. Preview is a standalone Metro entry, never an app route.

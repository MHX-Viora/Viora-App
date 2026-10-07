# Rocket V5 presentation upgrade

## Scope
Applied `ui-styling` and `ui-ux-pro-max` to the existing native Animated/SVG presentation. Preserved metallic Rocket art, cyan/magenta/gold palette, banner design, sender identity, caption wording, gift durations and queue/combo contracts. Gift payment, coin balance, SignalR, session and queue managers were not modified in this upgrade.

## Visual changes
- Five soft engine layers, deterministic irregular flicker/sway, boost flame length 1.8–2.5x, moving tapered energy exhaust, bloom and light smoke.
- 20–40 exhaust particles packed into 5–10 compound-path cohorts, with varied sizes, drift, rotation and lifetimes. No per-particle React components.
- Rear/front orbit halves sandwich the original art. Distinct rotation speeds, bright sectors, pulsing glow nodes, matching node/orbit geometry and accelerated cyan/magenta/gold vortex ribbons.
- Three speed-line depths, local engine flash, slight boost shake and three staggered expanding shockwaves. Brief electric arcs during charge, boost and impact.
- Curved flight retained; ascent shrinks to .65 then .25 before the arrival point. Layered radial rays, white/gold center, magenta/cyan energy, secondary comet fireworks, star rain and afterglow.
- Sender/name/line/title/count are separate, backed by a subtle dark surface. Caption fades when boost begins and is gone before impact. Compact landscape places it beside the flight.
- Existing banner gets a restrained gold border pulse and icon pulse, including one boost accent. Existing sweep and combo count pop remain. Optional cinematic duration prop reads the existing active duration; it does not change queue state.

## Timeline
Visual timing scales with the unchanged 5–7s gift duration. At 6s:

| Time | Presentation |
| --- | --- |
| 0–1.5s | Charge, materialization, ignition; sender caption appears |
| 1.5–2.50s | Curved launch; exhaust and orbit energy grow |
| 2.50–3.40s | Hyper boost, 126ms engine flash, three ~390ms shockwaves, accelerated nodes, vortex and depth lines; caption gone by 2.73s |
| 3.40s | White arrival point; Rocket has shrunk to .25 |
| 3.50s | Main flash, 102ms after arrival |
| 3.58 / 3.67 / 3.77s | Gold/orange radial burst, magenta energy, cyan shock layer |
| 3.84s onward | Staggered spark/star cohorts and falling remnants |
| 3.94s onward | 5–7 comets; each becomes a mini firework after ~420ms |
| 5.34–6s | Final 660ms gold/cyan/magenta afterglow and fade |

## Changed files
New:
- `features/live/premium-gift-rocket-energy-model.ts`
- `features/live/premium-gift-rocket-energy.test.mjs`
- `features/live/premium-gift-rocket-engine.tsx`
- `features/live/premium-gift-rocket-orbits.tsx`
- `features/live/premium-gift-rocket-speed.tsx`
- `features/live/premium-gift-rocket-blast.tsx`
- `docs/specs/live-premium-rocket-v5.md`
- `docs/plans/live-premium-rocket-v5.md`
- This handoff.

Updated:
- `features/live/premium-gift-rocket-environment.tsx`
- `features/live/premium-gift-rocket-flight.tsx`
- `features/live/premium-gift-rocket-finale.tsx`
- `features/live/premium-gift-rocket-scene.tsx`
- `features/live/live-gift-banner.tsx`
- `features/live/live-gift-overlay.tsx`
- `scripts/rocket-preview.tsx`
- `scripts/test.mjs` (one added test import).

## Verification and limits
- `npm test`: 456/456 pass. New deterministic visual model tests cover irregular bounded flicker, boost length, distinct/depth-switched orbit nodes, particle budgets and staggered impact timing. Existing queue/combo/cue cleanup tests remain green.
- TypeScript, repository lint and offline web export pass. Lint only emits the existing Node experimental proxy warning.
- Actual scene preview: 375×812 phone, 768×1024 tablet, 1440×900 desktop, 812×375 landscape. Inspected boost, arrival, layered explosion, caption clearance and final fade; no horizontal overflow or runtime exceptions.
- User reduced motion removes new dense layers; system reduced motion also disables animated banner accents. System preview at 375×812 has 14 SVG roots including banner versus ~82 normally.
- Production manager preview: combo ×2, interactive comment/button while effect plays, mixed Rocket/Crown/Rocket queue advances, Cancel leaves zero SVGs and idle queue. At progress 1, no effect SVG remains visibly lit.
- No new per-frame React state, RAF, particle timers or loops. Existing scene clock owns transforms/opacity and stops on background/unmount. Banner accent is a finite native-driver timing animation; stops on background/unmount, with AppState and accessibility listeners removed. Combo revision does not restart the accent.
- Chrome headless rAF samples over 6.3s: phone 720 frames, p95 interval 14ms, 2 gaps >34ms; final desktop 655 frames, p95 14ms, 3 gaps >34ms. These measure browser scheduling on a still background, not native GPU frames or Agora video performance. Physical iOS/Android live-video FPS remains unmeasured.
- Diagnostics outside the app: `.diagnostics/rocket-v5-cdp-check.cjs`, screenshots, check logs and web export. Preview entry is development-only and is not imported by app routes.

## Review
Reviewed correctness, readability, architecture, security and performance. Changes are bounded presentation modules; no new dependencies or data contracts. Native Animated interpolation and static SVG batching follow the existing architecture. Input remains pointer-transparent, and video content is not transformed.

# Rocket V6 presentation

Retains metallic Rocket art, accelerated curved trajectory/bank, five-layer plume, multicolor trail, gold/magenta/cyan front/back orbits, recognition and banner. Adds reactor pulse/boost, world-space plasma ribbons, three-depth particle field, sparse electrical arcs, peripheral tunnel, wings, three actual-trajectory gates, fragments, sonic boom, small comets, three silhouette afterimages, warp portal, white-dot pause, staggered finale/secondary fireworks, mini comet swarm, willow/star rain and nebula fade. Existing API, payments, coin deductions, realtime, SignalR, Agora, session, database, gift history and queue reducers are untouched.

## Actual clock

Existing server duration remains clamped to 5–7 seconds, normally 6 seconds. The requested eight-second choreography is compressed into that existing lifetime without extending queue deadlines. One raw linear clock feeds support layers; a monotonic native interpolation retimes the original Rocket scene. Combo updates quantity without restarting that clock. Optional sound callbacks, haptics, subtle virtual camera and banner boost align with the new presentation timeline.

| Event | At 6 seconds |
| --- | --- |
| Charge / materialize | 0 / 402 ms |
| Ignition / launch | 798 / 1,230 ms |
| Hyper boost / wings | 2,400 ms / wings fade over 390 ms |
| Gold / cyan / magenta gates | 2,670 / 2,880 / 3,090 ms |
| Sonic boom / distant flight | 3,210 / 3,360 ms |
| Portal begins / collapse | 3,660 / 3,930 ms |
| Quiet white dot | 3,930–4,050 ms, 120 ms |
| Main layered blast | 4,050 ms |
| Asymmetric secondary bursts | 4,500–4,860 ms |
| Mini swarm | begins 4,500 ms, staggered, 450 ms flight before small bursts |
| Willow / nebula afterglow | 5,040 / 5,250 ms |
| Entire scene invisible | 6,000 ms |

Arcs last 55–109 ms with 150–400 ms off intervals. Particle budgets: high/ultra 100%, medium 70%, low 50%; all major events remain, with 3–6 flight comets, 4–7 secondary bursts and 5–8 mini comets. User/system reduced motion omits supporting motion and retains restrained recognition/blast.

## Renderers

- Web: one additive Canvas for world-space wake/plasma ribbons, moving field, electrical arcs, peripheral tunnel, small flight comets/fragments, gate debris, sonic sparks, patterned finale particles, mini swarm, star rain and nebula. Cached glow sprites; progress listener schedules at most one pending RAF. Visibility/AppState listeners stop rendering; unmount removes listeners/RAF and clears sprites/backing store. No independent particle clock or per-frame React state.
- Common React Native Animated/SVG: original metal Rocket, flame, trail, rear/front orbits, speed effects, caption/banner; new reactor, wings, gates, sonic ring, silhouette afterimages, counter-rotating/compressing portal and white dot. Native-driver opacity/transforms follow the shared clock; no CSS filter/backdrop animation.
- Native fallback: compound SVG cohorts for supportive particles/tunnel/arcs, native-driven small comets, fragments, swarm/rain/nebula, and shared batched fireworks renderer. Skia is not installed; no dependency was added. SVG children represent batches and major comets, not individual particles.

## Files in this upgrade

New production files in `features/live/`: `rocket-journey-timeline.ts`, `rocket-journey-model.ts`, `rocket-journey-events.tsx`, `rocket-journey-canvas.web.tsx`, `rocket-journey-canvas.tsx`, `rocket-journey-native-flight.tsx`, `rocket-journey-native-finale.tsx`, `premium-gift-rocket-progress.ts`, `use-live-reduced-motion.ts`.

Updated production files in `features/live/`: `premium-gift-rocket-scene.tsx`, `premium-gift-rocket-model.ts`, `premium-gift-rocket-engine.tsx`, `premium-gift-rocket-environment.tsx`, `premium-gift-rocket-flight.tsx`, `premium-gift-rocket-finale.tsx`, `premium-gift-rocket-orbits.tsx`, `premium-gift-rocket-blast.tsx`, `premium-gift-rocket-speed.tsx`, `premium-gift-cinematic.ts`, `premium-gift-effect-layer.tsx`, `premium-gift-effect-model.ts`, `live-gift-banner.tsx`, `fireworks-renderer-native.tsx`.

Tests/tooling/docs: `features/live/rocket-journey.test.mjs`, `features/live/premium-gift-effect-model.test.mjs`, `scripts/test.mjs`, `scripts/rocket-preview.tsx`, `scripts/rocket-host-preview.tsx`, `docs/specs/live-premium-rocket-v6.md`, `docs/plans/live-premium-rocket-v6.md`, this handoff. Other existing work remains in the checkout.

`use-live-reduced-motion.ts` fixes a measured RN Web listener collision: its AccessibilityInfo implementation keys handlers by function text, so concurrently mounted banner/effect state dispatches overwrite one another. Web now registers distinct matchMedia callbacks and removes those exact callbacks; native keeps AccessibilityInfo.

Shared native fireworks willow/afterglow ranges now remain sorted for late Rocket bursts; earlier Fireworks timing is preserved. Rocket renderer descriptor now identifies V6. No manager/reducer contracts changed.

## Verification and limits

- 462 Node tests pass, including monotonic retiming, gates on the real trajectory, deterministic patterns/budgets, bounded arc life/off intervals, cue timing and quiet pause; existing combo/queue/cue cleanup tests remain green. TypeScript, Expo lint and offline Expo web export pass.
- Real Chrome previews inspected flight/boost/gates, portal at 3,800 ms, white-dot pause at 3,990 ms, main blast at 4,200 ms, secondary/native finale at 4,500/5,100/5,400 ms and invisible end at 6,000 ms. Canvas and forced native SVG fallback were both exercised. No animation runtime exceptions in final checks.
- Responsive previews: 320×740, 375×812, 768×1024, 1440×900 and 812×375, without horizontal overflow. Native landscape fallback checked separately. Actual LiveHostRoom in demo mode tested at desktop/mobile; microphone button remained clickable. Viewer fixture uses production PremiumGiftEffectLayer/LiveGiftOverlay; actual viewer desktop/mobile integration paths reviewed. No real account/session/payment/Agora connection was started.
- Combo ×2 remained on one active Rocket. Rocket → Crown → Rocket switched to Crown after the six-second Rocket deadline. Interaction stayed clickable during overlay. Cancel removed all Canvas/SVG nodes. User and OS reduced-motion previews passed.
- After the listener fix, 20/40/60 queue/cancel cycles returned to 133 DOM nodes and 248 event listeners each batch; Canvas/SVG both zero. Post-GC heap 10.145 / 10.211 / 10.256 MB (baseline 9.206 MB; initial warm-up/cache growth). This finite test found no continuing listener/DOM accumulation; it does not prove unlimited-run leak absence.
- Headless rAF samples over ~6.3 seconds: desktop 500 callbacks, p95 27.8 ms, 20 intervals over 34 ms; mobile 574 callbacks, p95 20.9 ms, zero intervals over 34 ms. These measure browser scheduling, not guaranteed rendered/GPU FPS. Desktop has some spikes. Physical Android/iOS, low-memory hardware and native GPU/Agora FPS remain unmeasured.
- Background/unmount cleanup reviewed in clock, Canvas, banner and sound hooks. Physical native background/foreground behavior remains a hardware check. Final diagnostic screenshots/logs are outside the app in `../.diagnostics/rocket-v6-*`. Isolated preview entry preloads Ionicons from the local diagnostic server to avoid cross-origin Metro font failures.

No commit or deployment was requested.

# Rocket V4 handoff

## Result and architecture
- Seven overlapping phases, 5000–7000ms: cyan charge and materialization, metallic vector rocket, 3-layer flickering ignition, accelerated cubic Bezier launch, warm hyper boost, portal/comets/fireworks, afterglow.
- `PremiumGiftEffectLayer` owns one linear Animated progress value; all flight, rotation, opacity, flame flicker, portal and particle cohort transforms interpolate it. Native uses `useNativeDriver: true`; web uses React Native Web's Animated adapter. No Reanimated/Canvas/Skia/CSS keyframes, new dependencies, per-frame React state or animation loops.
- Static SVG paths batch stars/diamonds/dots/streaks into color cohorts; quality tiers bound trail/cohort/comet counts. All positions derive from the measured Live stage. Short landscape stages reserve 112px at the bottom and put sender typography alongside the rocket.
- Rocket-only translucent banner: warm orange/magenta gradient, gold border/avatar ring, single light sweep, overshoot entrance and combo pop; vector icon remains visible. Real sender identity and quantity are used.
- System and user reduced motion remove orbit/dust/speed lines, camera shake and dense finale; retain gentle short launch/glow/banner. Overlay never captures input or transforms the video.
- Optional `onRocketSoundCue` callback on `PremiumGiftEffectLayer`: charge/ignite/launch/boost/explosion. Silent by default, no sound assets. Timers cancel on background, effect change and unmount.
- Queue/combo preserve active ID/deadline and update quantity without restarting progress. Found and fixed browser `Illegal invocation` from unbound default `clearTimeout` in both queue clocks; regression test covers the browser API call context.

## Changed files
New:
- `features/live/premium-gift-rocket-model.ts`
- `features/live/premium-gift-rocket-model.test.mjs`
- `features/live/premium-gift-rocket-art.tsx`
- `features/live/premium-gift-rocket-environment.tsx`
- `features/live/premium-gift-rocket-flight.tsx`
- `features/live/premium-gift-rocket-finale.tsx`
- `features/live/premium-gift-rocket-cues.ts`
- `features/live/premium-gift-rocket-cues.test.mjs`
- `features/live/use-rocket-sound-cues.ts`
- `features/live/live-gift-clock.test.mjs`
- `scripts/rocket-preview.tsx`
- `docs/specs/live-premium-rocket-v4.md`
- `docs/plans/live-premium-rocket-v4.md`
- this handoff.

Updated:
- `features/live/premium-gift-rocket-scene.tsx`
- `features/live/premium-gift-effect-layer.tsx`
- `features/live/premium-gift-effect-model.ts`
- `features/live/premium-gift-effect-model.test.mjs`
- `features/live/premium-gift-effect-manager.ts`
- `features/live/premium-gift-effect-manager.test.mjs`
- `features/live/premium-gift-cinematic.ts`
- `features/live/premium-gift-virtual-camera.tsx`
- `features/live/live-gift-banner.tsx`
- `features/live/live-gift-queue-manager.ts`
- `features/live/live-gift-overlay-layout.test.mjs`
- `scripts/test.mjs` (added imports only; preserved earlier unrelated imports).

Development artifacts outside app under workspace `.diagnostics`: `rocket-preview.html`, `rocket-cdp-check.cjs`, screenshots, logs, headless browser profile and web export. No unrelated Live functionality changed.

## Validation
- `npm test`: 453/453 pass; includes deterministic curved trajectory, viewport bounds, particle budgets, cue cancellation, Rocket combo/deadline/deduplication, mixed queue expiry and default clock cleanup.
- `npx tsc --noEmit`: pass. `npm run lint`: exit 0; only Node experimental proxy warning. Targeted ESLint: clean.
- Offline `npx expo export --platform web --max-workers 0 --output-dir ../.diagnostics/rocket-v4-export`: pass.
- Actual component browser preview: 375×812 phone, 768×1024 tablet, 1440×900 desktop, 812×375 landscape; no horizontal overflow. Inspected charge/launch/finale, full and reduced versions; system prefers-reduced-motion produces only 10 SVG roots including banner, versus 54 normally.
- Production manager preview: Rocket combo x2, input/button interaction during overlay, Cancel leaves zero SVGs and idle queue, mixed Rocket/Crown/Rocket advances sequentially. Sound cues fire only via optional test callback; cleanup covered by deterministic cue tests and preview cancel.
- Phone Chrome headless rAF sample over 6.3s: 824 frames, p95 interval 13.9ms, zero gaps >34ms. This measures browser scheduling on a still background, not native GPU frame rate or live Agora performance; physical iOS/Android and sustained video load remain unmeasured.

## Preview
From `viora`: `EXPO_OFFLINE=1 npx expo start --port 8081 --max-workers 0 --host localhost` (PowerShell uses `$env:EXPO_OFFLINE='1'`). Serve workspace `.diagnostics` with `python -m http.server 8082 --bind 127.0.0.1`; open `http://localhost:8082/rocket-preview.html`. Seek phase buttons, Reduced motion, Rocket queue, Combo +1, Queue 3 and Cancel use actual scene/managers. Preview has no real API gift payment.

## Design skills
Applied `ui-styling`: deliberate visual hierarchy, layered translucent surfaces, consistent color/typography, responsive composition.
Applied `ui-ux-pro-max`: focused animation/reduced-motion and React Native performance guidance; adapts to existing native Animated/SVG instead of introducing web-only UI libraries.

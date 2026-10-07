# Premium Firework V5

## Change
Active path remains LiveGift → shared premium manager → PremiumGiftEffectLayer → CinematicFireworkEffect for host/viewer. Descriptor now reports V5 / procedural-particles:firework-v5.

Replaces whole-burst scaling of static SVG paths and rectangular rocket trails with independently moving Animated.Image embers, analytic drag/gravity, angle unwrapping, individual lifetimes/extinction, twinkle, three depth sizes/brightnesses, and delayed trail beads. Two baked PNG textures total 3,122 bytes; regenerate with `python scripts/render-firework-sprites.py` (standard library only).

Sequence: ignition pulse and ≤0.12 veil; curved accelerated launch at 405ms; arrival 1035ms; 90ms anticipation; localized champagne flash/main burst at 1152ms; smaller asymmetric bursts at 1485, 1755 and 2048ms; final golden rain from 3150ms; all particles extinguished by 4500ms. Main primary counts: low 24, medium 50, high 64, ultra 76. Show primary counts: 48/100/128/152. Conservatively capped animated container budgets: 109/205/238/267, including tail beads, rockets, rain and environment. Phone landscape limits radius to keep upper bursts on stage. Sender pill is secondary, translucent, noninteractive, and displays combo quantity.

Only Firework presentation duration is normalized to 4500ms in the effect model, so FIFO expiration matches rendering. Gift purchase/SignalR/Agora and other gift durations are unchanged. Both the system preference and the user's reduced-gift preference select static Firework rendering. Camera/haptic cues follow the new timeline. Animation uses the existing native master clock with `isInteraction: false`; textures/trajectories are prepared once, no per-frame React state or emitter timers. Parent stop/unmount and manager clear retain lifecycle ownership. Native-driver rationale: https://reactnative.dev/docs/0.81/animated#using-the-native-driver

## Verification
- 439/439 project tests; `npx tsc --noEmit`; Web export with `EXPO_OFFLINE=1 npx expo export --platform web --max-workers 0` succeed.
- Firework files and standalone preview ESLint: no errors/warnings. Shared effect-layer file retains three existing exhaustive-deps warnings for intentional ID/duration dependencies (adding the whole active object would restart combos).
- Viewed actual scene in Chrome preview at nominal 375×812, 812×375, and 1440×900; checked tablet and large-desktop layouts, no horizontal overflow. Browser viewport emulation/zoom is not physical-device validation.
- Measured one mobile-preview sequence: mean requestAnimationFrame interval 7.74ms, p95 13.9ms, no intervals >33.4ms; all particle opacity zero at end. Desktop queue observation: mean 8.96ms, p95 20.8ms, six intervals >33.4ms. These are limited browser scheduling observations on a still-image background, not sustained video FPS measurements.
- Runtime FIFO: Minh Anh → Linh → Huy → idle, a single scene/particle set at each step. Runtime combo: Minh Anh ×3, waiting 0, one particle set. Cancellation: idle, waiting 0, no particle images. Reduced motion: zero particle images. Preview console: no rendering errors in final observations.
- Build/log artifacts in workspace `.diagnostics/firework-v5-*`; initial preview-only ThemeProvider and cross-origin asset issues were fixed before visual inspection.

## Reproduce / remaining verification
`scripts/firework-preview.tsx` is a standalone Metro entry, excluded from app routes. Start `EXPO_OFFLINE=1 npx expo start --port 8081 --max-workers 0`, then open workspace `.diagnostics/firework-preview.html` through the local HTTP server on 8082. Use Play, phase snapshots, Reduced motion, Queue 3, Combo, and Cancel. Reload with browser cache disabled after source changes.

Still requires actual iOS/Android profiling with Agora video and active comments: sustained 60 FPS, CPU/thermal behavior and heap retention after repeated gifts. No native-video performance claim is made. Sound cue metadata remains available; no audio playback was added.

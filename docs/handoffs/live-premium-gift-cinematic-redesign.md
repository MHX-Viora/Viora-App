# Live Premium Gift cinematic redesign

- Firework, Rocket, Crown now use bundled multi-layer SVG artwork and four-phase `Animated` choreography in a pointer-transparent layer below Live UI. No new runtime dependency, GIF, emoji fullscreen effect, polling, or Agora change.
- `GiftBanner` measures its image and pulses at 340 ms. The active effect manager stores that origin; scene light/art travels from it. Queued effects use a right-side fallback once their banner has gone.
- Scene quality is `full`, `lite` on small/low-memory/user-reduced devices, or `still` for OS Reduce Motion. Main artwork remains present in all modes. Crown dissolution draws 1,024 tiny flecks in 16 animated clusters at full quality, reducing to 168 on lite devices.
- Backend accepts configured duration up to 7 seconds. Follow-up EF migration changes only untouched seed defaults to Firework 5600 ms, Rocket 4700 ms, Crown 6000 ms. It has not been applied to a database.
- Tests: 424 frontend, 192 backend; `tsc`, Expo lint and Web export passed. Temporary preview route was removed after visual inspection. Crown and Firework frames were inspected; DevTools screenshot capture timed out for Rocket even with a static preview, so device/live-session visual QA remains necessary.
- No artist-authored Rive/Lottie/WebM assets were supplied. The scenes are procedural vector art; replacing artwork later does not require changing the confirmed-gift queue.

## Pipeline hardening

- Choreography now has seven explicit phases and uses a per-phase easing sequence, preserving wall-clock cue timing without one linear motion curve.
- Automatic rendering exposes bounded LOW/MEDIUM/HIGH/ULTRA budgets. OS Reduce Motion stays an independent static-motion constraint; the existing user reduction preference selects LOW.
- A virtual-camera wrapper applies only 1â€“3 px overlay motion, a restrained push, and localized impact illumination. Agora video and the surrounding Live screen remain untouched.
- Rocket core glow, hot trail, light streak, and velocity blur now follow the vessel trajectory; slower smoke stays in world space to sell acceleration and depth.
- Native haptics are authored per gift and synchronized to impact. They are cancelled on scene cleanup and disabled on Web, Reduce Motion, and user-reduced effects.
- Dedicated sound remains intentionally disabled because no approved Crown/Rocket/Firework audio assets were supplied; the existing ringtone is not reused.
- Verification: 426/426 frontend tests, focused cinematic/queue tests, TypeScript, Expo lint, and Web export pass. The exported main bundle remains 6.86 MB at reported precision. Runtime screenshots/device QA remain pending because no browser was connected and Live requires an authenticated room.

## Rocket crash fix and renderer audit

- Root cause: Rocket camera produced `impact + 0.05 = 0.7200000000000001` immediately before `hero = 0.72`. React Native Web correctly rejected that decreasing `Animated.interpolate` input range. `normalizeInputRange()` now canonicalizes floating-point checkpoints, clamps them to `[0,1]`, preserves keyframe order/output alignment, and emits a DEV warning whenever it repairs a range. Camera, environment-light, firework, particle, crown-dust, and rocket-dust ranges that are calculated at runtime use the guard.
- Confirmed route: `POST /api/lives/{liveId}/gifts` commits the coin/LiveGift transaction, the backend emits SignalR `LiveGift`, host/viewer handlers call `showGiftEvent`, and that feeds independent banner and premium FIFO queues. Invalid effect metadata never enters the premium queue.
- V3 mapping is explicit: `1/FIREWORK -> FireworkCinematicScene`, `2/ROCKET -> RocketCinematicScene`, `3/CROWN -> CrownCinematicScene`. Cinematic assets are bundled procedural SVG (`firework-v3`, `rocket-v3`, `crown-v3`); Gift Banner independently uses the catalog `imageUrl`. No legacy fullscreen renderer is mounted or bypasses this mapping.
- DEV emits `[PremiumGift]` with `Gift`, `EffectType`, `Tier`, `Renderer`, `EffectVersion`, and `Asset` once per active effect. A keyed error boundary isolates cinematic failures and shows a static premium fallback; Gift Banner, Agora, comments, realtime, and gift transactions remain outside it.
- Visual pass: Crown gained a layered royal spotlight; Rocket gained a trajectory-following environment light; Firework's localized burst illumination and bounded quality budgets remain. Dedicated sound remains pending approved assets.
- Verification: exact crash regression is covered; 429/429 frontend tests, TypeScript, Expo lint, and Web export pass. Main Web bundle is 6.86 MB. The renderer is compiled and its end-to-end code path is contract-tested, but actual authenticated browser/device mounting is not claimed: no browser session was available for runtime console/screenshot verification.

# Plan: Premium Gift cinematic redesign

1. [x] Define scene timing/quality/anchor behavior as pure functions with focused tests. Verify queue and combo still expire deterministically.
2. [x] Connect measured banner-image origin and 300–500 ms glow to the active effect, with fallback for queued scenes. Verify transition contract and unchanged regular banners.
3. [x] Replace flat scene drawing with layered Firework, Rocket, and Crown artwork and four-phase native-driven motion. Verify typecheck/lint after each scene.
4. [x] Align backend duration validation and seed defaults to 4–7-second cinematics without changing transaction flow. Verify backend tests.
5. [x] Run frontend tests, web export, and available browser visual checks. Live-device visual QA remains pending because there is no authenticated room; Rocket screenshot capture timed out in DevTools.

Risk controls: keep SVG counts bounded by quality mode, memoize scene components, keep the stage pointer-transparent, and render all effects below Live UI.

## Cinematic pipeline hardening

6. [x] Model all seven cinematic phases, four quality budgets, camera keyframes, and native feedback cues as deterministic pure data. Verify with focused RED/GREEN tests.
7. [x] Add a virtual-camera/environment-light wrapper and native haptic conductor without moving Agora or introducing a dependency. Verify typecheck and focused tests.
8. [x] Make Rocket core flame, hot trail, light sweep, and motion streak follow its trajectory while world-space smoke dissipates independently. Verify typecheck, lint, tests, and Web export; authenticated device visual QA remains pending.
9. [x] Review the complete diff for queue safety, bounded node counts, native-driver-only hot-path animation, reduced-motion behavior, and untouched transaction/realtime/Agora flows.

## Runtime hardening and renderer verification

10. [x] Reproduce Rocket's non-monotonic `inputRange`, add shared normalization/validation, and prove every camera range is finite and monotonic.
11. [x] Trace API confirmation through SignalR, both queues, effect mapping, renderer selection, and mounted scene; add DEV-only V3 renderer diagnostics.
12. [x] Isolate cinematic render failures with a per-effect error boundary and safe premium fallback that cannot interrupt Live.
13. [x] Strengthen environment-light choreography for Crown/Rocket/Firework without increasing unbounded particle work; verify mobile/web types, tests, lint, and export. Authenticated runtime visual verification remains pending because no browser is connected.

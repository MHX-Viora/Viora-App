# Firework V5 implementation

Scope and decisions: [spec](../specs/live-premium-firework-v5.md). Results: [handoff](../handoffs/live-premium-firework-v5.md).

- [x] Define timeline, density, palette, responsive bounds and rendering constraints before implementation.
- [x] Add failing model tests; implement deterministic independent trajectories and bounded counts; verify model tests.
- [x] Replace static burst scaling and rectangular launch tail with reused light sprites driven by the existing native clock. Preserve queue/combo; align cosmetic duration with FIFO expiration.
- [x] Check actual scene and queue in Chrome, reduced motion, cancellation, responsive layouts, console and frame intervals.
- [x] Run project tests, TypeScript, focused lint and Web export; review scope, lifecycle and performance; record native-device profiling limitation.

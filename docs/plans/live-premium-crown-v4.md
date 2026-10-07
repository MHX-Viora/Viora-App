# Crown V4 implementation plan

- [x] Inspect existing Crown renderer, shared queue/clock, Firework boundaries; apply ui-styling and ui-ux-pro-max material/motion guidance.
- [x] Define approved 4.8s sequence and native rendering architecture in `docs/specs/live-premium-crown-v4.md`.
- [x] RED: deterministic layout/reveal/dust/dissolve/glint/budget tests; mixed queue duration regression.
- [x] GREEN: Crown model, sculpted metallic art, clipped reveal/sweep, depth atmosphere, batched dissolution, composed scene.
- [x] Integrate Crown linear clock, fixed presentation duration, reduced motion, background stop; preserve combo deadline and FIFO.
- [x] Verify full tests, TypeScript, focused ESLint, web export, real browser playback/responsive/queue/combo/cancel/control interaction.
- [x] Review scoped changes, compare Firework SHA256 hashes, record runtime limitations and handoff.

No purchase, SignalR, Agora, Live layout or Firework renderer changes. Server duration validation remains 3–7s; Crown presentation normalizes to 4.8s. Rocket duration behavior remains covered separately.

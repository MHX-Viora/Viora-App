# Plan: Premium Firework V4

1. [x] Add RED tests for the explicit show timeline, pause duration, physics, sound hooks, and particle/node budgets.
2. [x] Implement the deterministic Firework plan and make focused tests GREEN.
3. [x] Split atmosphere, projectile, explosion, smoke, lighting, and foreground rain into focused renderer layers; keep the scene as orchestration only.
4. [x] Update effect type `1` descriptor/DEV log to V4 and contract-test the actual Live renderer path and fallback boundary.
5. [x] Verify focused/full tests, TypeScript, lint, and web export; document structural before/after render budgets. Runtime console/screenshots remain pending because no browser is connected.

Risk controls: no new dependency; SVG path batching instead of unbounded Views; fixed normalized checkpoints; every dynamic range normalized; reduced-motion static fallback retained; Crown/Rocket files untouched.

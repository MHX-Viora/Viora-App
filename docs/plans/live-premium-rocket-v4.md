# Rocket V4 plan

1. Test and implement deterministic timeline/Bezier, viewport bounds, particle budgets, cue timing and Rocket duration. Verify focused model and queue tests.
2. Implement vector rocket and continuous scene in environment/flight/finale slices using one progress clock. Check types/lint after integration.
3. Upgrade only Rocket banner, add cancellable sound cue hook, reduced motion and lifecycle cleanup. Verify queues/combos without restarting progress.
4. Build standalone preview, inspect all viewports and reduced motion, exercise production managers, run repository tests/typecheck/lint/web export. Record results and handoff.

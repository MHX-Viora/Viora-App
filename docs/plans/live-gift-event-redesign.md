# Plan: Live Gift Event overlay

1. Build/test a pure two-slot FIFO queue with duplicate-ID dedupe, sender+gift combo, expiry and tier mapping. Verify with focused tests.
2. Replace timers in the overlay hook with a single scheduled queue transition. Verify new events do not evict visible events and combos extend expiry.
3. Redesign a memoized Gift banner with image, avatar, text, quantity and transform/opacity animations; position host/viewer responsive overlays and remove Live chat borders. Verify types and focused layout contracts.
4. Run full tests, lint/type check and browser inspection where authentication allows. Review changes for scope and performance.

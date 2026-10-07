# Spec: Premium Firework V4

## Objective

Turn only effect type `1` into a 5.6-second cinematic firework show: atmosphere, curved launch, anticipation pause, localized core/light, layered asymmetric bursts, staggered secondary fireworks, authored hero burst, spark rain, smoke, recognition, and natural decay. Live video, Gift Banner, queue, SignalR, transactions, Crown, and Rocket remain unchanged.

## Assumptions

- The existing bundled procedural SVG asset is the production cinematic asset; no approved audio or external animation asset is available.
- React Native SVG plus native-driven `Animated` transforms is the cross-platform renderer. No dependency is added.
- Sound work is limited to deterministic timing hooks because Premium Gift has no dedicated sound playback/asset contract.

## Tech Stack and Structure

- Expo 54, React Native 0.81, React Native Web, `react-native-svg`, `Animated`.
- Pure timeline/physics/budget model: `features/live/premium-gift-firework-model.ts`.
- Layered renderer: `features/live/premium-gift-firework-layers.tsx`.
- Orchestrator: `features/live/premium-gift-firework-scene.tsx`.
- Tests colocated in `features/live`.

## Commands

- Focused test: `node --experimental-strip-types --test features/live/premium-gift-firework-model.test.mjs`
- Full test: `npm test`
- Type check: `npx tsc --noEmit`
- Lint: `npx expo lint`
- Web bundle: `npx expo export --platform web --max-workers 2`

## Code Style

Use explicit normalized timeline constants and deterministic seeded geometry. Every calculated interpolation range goes through `normalizeInputRange`; each layer is memoized and pointer-transparent through the parent stage.

## Testing Strategy

- Unit-test timeline ordering, 80–140 ms main pause, deterministic physics, gravity/drag, responsive normalized coordinates, sound hooks, and bounded budgets.
- Contract-test that effect type `1` maps to and mounts the V4 renderer with DEV diagnostics and error boundary.
- Verify typecheck, lint, full suite, web export, then browser console/screenshot when a browser is available.

## Boundaries

- Always: preserve queue/fallback/reduced-motion, bound generated geometry, clean animation with parent effect lifecycle.
- Ask first: new dependency or external audio/animation asset.
- Never: modify Crown/Rocket, Agora, Gift Banner, SignalR, transactions, or animate the video element itself.

## Success Criteria

- One authored sequence: main launch/pause/burst → left → right → hero → layered rain/smoke decay.
- Burst geometry uses velocity, drag, gravity, lifetime, brightness, size, and rotation variation and is batched into SVG paths rather than one View per spark.
- LOW/MEDIUM/HIGH/ULTRA plans remain bounded; renderer failure falls back without crashing Live.
- DEV logs `[PremiumGift:Firework]` with giftId, effectType, renderer, version, asset, quality, and duration.

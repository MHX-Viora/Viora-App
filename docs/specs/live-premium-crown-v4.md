# Royal Crown V4

## Objective / approved scope
Implement attached Crown redesign directly: 4.8s royal formation, metallic materialization, localized illumination, slow showcase, masked light sweep, staggered gems, surface dissolution and gold-dust decay. Crown differs from explosive Firework; do not change Firework modules, purchase/SignalR/Agora or Live layout.

## Architecture and style
Existing Expo 54 / RN 0.81 native-driver Animated + react-native-svg. Dedicated Crown model/art/renderer/environment/particles compose in the existing CrownCinematicScene. No new dependencies. Five sculpted points, elliptical band, bevel/reflection gradients, faceted champagne gemstones; shadow → aura → crown → metal highlights → glints → foreground dust. Semantic royal-gold palette, normalized geometry. Example: `const layout = useMemo(() => crownLayout(bounds), [bounds]);`.

## Acceptance / plan
1. Pure deterministic model: responsive 55–75% mobile crown width, centered near 36% stage height, bounded desktop width; curved gathering particles in three depths; surface-bound dissolve samples; ordered glints and accurate 4.8s timeline. Add failing tests first.
2. Crown pipeline: progressive bottom-to-top reveal using native clipping/countertranslation; metallic vector facets and masked diagonal sweep; localized volumetric rays/halo; settled scale 0.7 → 1.035 → 1, subtle floating, gemstone/edge sparkle. Finale removes surface with a moving dissolve mask while corresponding dust clusters release.
3. Reuse shared FIFO/combo, normalize only Crown visual duration, respect user/system reduced motion and existing cancellation. Verify unit tests, type/lint/build and actual preview on phone portrait/landscape, tablet/desktop. Profile browser frames; disclose that native Agora performance requires devices.

## Commands / structure
`npm test`; `npx tsc --noEmit`; `npx expo lint`; `EXPO_OFFLINE=1 npx expo start --port 8081 --max-workers 0`; `EXPO_OFFLINE=1 npx expo export --platform web --max-workers 0`.
Code/tests: `features/live/premium-gift-crown-*`; diagnostics preview under `scripts`; docs under `docs/specs`, `docs/plans`, `docs/handoffs`.

## Boundaries and verification
Always bound particle/node counts and precompute geometry; animate transform/opacity without React frame updates. Preserve FIFO/combo and stop on unmount. Never alter completed Firework files (compare hashes), existing purchase or video integrations. Ask before adding heavy dependencies. No unresolved product questions: the user supplied the complete brief and authorized implementation.

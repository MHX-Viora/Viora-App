# Rocket V4 cinematic gift

## Objective and acceptance
Replace Rocket V3 with one continuous 5–7 second sequence: charge, materialize, ignition, curved launch, hyper boost, sky explosion, afterglow. Rocket remains the focal point; cyan/blue charge, gold/orange thrust, magenta/violet and cyan finale form deliberate color families.

- Detailed metallic SVG rocket, rim lighting, layered flickering flame, orbit ribbons, smoke/sparks and acceleration along sampled cubic Bezier keyframes.
- Two brief local flashes, subtle overlay-only boost shake, portal, batched star/diamond/spark fireworks and 5–8 secondary comets. No livestream transform.
- Rocket height <=28% on phones, <=32% elsewhere; viewport-relative positions in portrait/landscape. Independent noninteractive overlay.
- Translucent Rocket banner: warm gradient, gold border/avatar ring, single light sweep, entrance overshoot, combo bounce. Real sender identity throughout.
- System and user reduced motion: short gentle launch, small glow/explosion, no shake or dense particles. Stop on background/unmount; no animation restarts for combos.
- Existing queues, duplicate protection, combo window and other gifts stay intact. Rocket duration uses server value clamped to 5000–7000ms; sound cue callback only, no audio assets.

## Implementation
React Native Animated native-driver transforms/opacity driven by one linear clock; static SVG geometry with bounded particle cohorts. No per-frame React state, animated layout, extra dependencies, or audio playback. Shared visual tokens and readable sender text follow ui-styling/ui-ux-pro-max principles within the existing React Native stack.

## Files and style
`features/live/premium-gift-rocket-*`: model/art/flight/environment/finale/scene and sound cue hook. Localized integrations in effect layer/model/cinematic model and gift banner. Existing typed memoized components and StyleSheet conventions.

## Validation and boundaries
`node --experimental-strip-types` focused model/queue tests, `npm test`, `npx tsc --noEmit`, targeted ESLint, `npx expo export --platform web --max-workers 0 --output-dir ../.diagnostics/rocket-v4-export`.
Standalone preview tests actual production components at phone/tablet/desktop/landscape, reduced motion, combos, queue and cancel. Record limitations: browser still-image preview cannot prove native Agora 60 FPS. Never change unrelated Live behavior or upload paid gifts during verification.

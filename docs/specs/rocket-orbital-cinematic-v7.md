# Rocket orbital cinematic V7

Approved brief: an 8.5-second mini film inside the existing video stage: sender (0–800ms), ignition (800–1800), launch (1800–3000), cloud break (3000–4200), atmosphere/Earth reveal (4200–5500), deep space (5500–7000), warp (7000–8000), return to Live (8000–8500).

Use ui-ux-pro-max for sender hierarchy, motion accessibility, stage-responsive layout and nonblocking interaction. Use ui-styling's canvas design guidance for spatial hierarchy, champagne-metal material, dark glass, restrained cyan/magenta accents and depth. Retain React Native components rather than installing Tailwind/Radix into the Expo application.

The rocket holds near mid-stage while three cloud layers and star planes travel downward, producing camera tracking. Earth curvature and atmosphere emerge continuously; distant nebula/planet movement establishes scale. Final acceleration collapses the rocket into a localized star, then dissolves to uninterrupted Live.

Implementation order: test phase/geometry/budget and combo accounting; implement timeline, Canvas web environment and native SVG layers, reusable metallic rocket and sender reveal; integrate exclusive major-cinematic queue and duration; verify typecheck, lint, tests, web export and browser preview across stage sizes.

One Rocket cinematic per major stage. Same sender/gift updates the active flight quantity without resetting elapsed time; waiting Rocket groups retain the existing 2.5-second combo window. Distinct transactions remain accounted for and different senders queue. Clamp visual intensity. Other gift transaction processing remains intact. No Agora changes and no new dependencies. All overlay surfaces ignore pointer input.

Web uses cached cloud/Earth/star sprites and a single progress-driven RAF. Native uses a bounded SVG scene and native-driven transforms. Reduced motion retains sender, stationary hero and gentle fade only. Existing optional cue callbacks remain silent without a consumer/audio assets.

Checks in `viora`: `node --experimental-strip-types scripts/test.mjs`, `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform web --max-workers 1 --output-dir .codex-tmp/rocket-v7-web`. Preview uses existing development-only `scripts/rocket-preview.tsx`.

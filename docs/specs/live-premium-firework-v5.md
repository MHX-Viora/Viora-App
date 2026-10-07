# Premium Firework V5

## Objective and acceptance
Replace scaled static SVG paths with independently moving champagne/gold embers. The 4.5s show has anticipation (0–400ms), accelerating curved launch (400–1050ms), a 90ms pause, localized flash/main bloom (1150ms), three asymmetric secondary bursts, and falling gold fading completely by 4500ms. Main burst has 40–80 primary embers at normal quality. Video stays visible; scrim ≤0.12; pointer input remains available.

## Stack, structure, style
Expo 54 / React Native 0.81, existing native-driver Animated master clock and SVG. No dependency additions. Model and tests in `features/live/premium-gift-firework-model.*`; sprite renderer beside scene/environment/burst. Semantic palette and normalized coordinates; `const show = useMemo(() => fireworkShowPlan(quality), [quality]);` matches existing style.

## Plan and checks
1. Test deterministic per-particle trajectories, drag/gravity, differing extinction, responsive radius, bounded budgets, and queue duration. Then implement the pure model.
2. Render independent heads and delayed trail beads from precomputed keyframes; replace rectangular rocket tail with emitted embers. Local bloom/smoke, minimal sender pill, no gift icon morph.
3. Verify actual renderer on small portrait/landscape, tablet, desktop, reduced motion, queue/combo and cancellation. Record browser evidence and device limitations in handoff.

Commands: `npm test`; `npx tsc --noEmit`; `npx expo lint`; `npx expo start --web --port 8081`.

## Boundaries and risks
Always preserve sender data/FIFO/combo and shared cancellation. Normalize only Firework visual duration to 4500ms. Never change gift purchase, SignalR, Agora, other gifts, or surrounding Live layout. Ask before adding heavy dependencies. Particle keyframes are calculated once, with native transform/opacity updates and no React frame loop. Low quality reduces counts; both motion preferences use static rendering. Web profiling cannot establish native video performance.

The attached user brief supplies the approved scope and directs immediate implementation; no open product questions.

# Premium Gift cinematic redesign

## Objective
Turn confirmed Firework, Rocket, and Crown gifts into compact cinematic moments over Live video. Preserve the existing banner, SignalR confirmation path, gift queue, comments, controls, and Agora session.

## Assumptions
- Render quality is selected locally as `LOW`, `MEDIUM`, `HIGH`, or `ULTRA`; OS Reduce Motion is an independent accessibility constraint, not a quality tier.
- Native devices may emit short, rate-limited haptics at authored cue points. Web emits none. Gift sound remains disabled until dedicated Crown/Rocket/Firework assets are supplied and approved; unrelated app audio must never be reused.
- The existing `imageUrl` remains the store/banner asset. Scene artwork is bundled vector geometry; `animationUrl` stays optional and is not downloaded during Live.
- The existing banner's image position is the transition origin when measured. A safe right-side origin is used for queued effects after the banner leaves.
- No new runtime dependency or remote visual asset is required. The existing React Native Animated and SVG packages are sufficient for native-driven transforms and layered vector scenes.
- Existing admin-configured effect type and tier continue to select the scene. Cinematic durations may be 4–7 seconds.

## Project and commands
- Source: `features/live/`; tests: neighboring `*.test.mjs`; backend duration contract: `../viora-BE/`.
- Focused tests: `node --experimental-strip-types --test features/live/premium-gift-effect-model.test.mjs features/live/premium-gift-effect-manager.test.mjs`.
- Full tests: `node --experimental-strip-types scripts/test.mjs`; typecheck: `npx tsc --noEmit`; lint: `npx expo lint`; web bundle: `npx expo export --platform web`.
- Backend tests: `dotnet test Viora.Application.Tests/Viora.Application.Tests.csproj --no-restore`.

## Scene acceptance
- Every `Animated.interpolate` input range is finite, normalized to `[0, 1]`, and monotonically non-decreasing. Rocket's derived impact/hero keyframes must never regress because of floating-point arithmetic.
- A cinematic render failure is isolated by an error boundary and falls back to a safe static premium treatment; Gift Banner, Agora, comments, controls, and the confirmed transaction remain alive.
- DEV diagnostics identify the confirmed gift, effect type/tier, selected V3 renderer, and bundled cinematic asset path so runtime integration can be verified without guessing.
- Every scene exposes anticipation, reveal, build-up, impact, hero, aftermath, and dissolve checkpoints.
- A virtual-camera wrapper moves only cinematic overlays by at most 3 px and applies a restrained push at impact; Agora video and the Live screen are never transformed.
- Rocket propulsion/light follows the vessel while slower smoke remains in world space, creating velocity-dependent depth instead of a stationary trail.
- Quality budgets are deterministic and bounded: LOW keeps main art/basic light, MEDIUM adds atmosphere, HIGH adds foreground depth, ULTRA enables the complete bounded scene.
- Native haptic cues are synchronized to authored impact fractions and never overlap because the existing cinematic queue admits one active effect.
- All three scenes have a visible intro, build-up, climax, and exit; no emoji, GIF, confetti, or large static PNG.
- Firework: a launched comet with trail, multi-stage bursts and fading falloff; secondary bursts stay behind the first.
- Rocket: foreground propulsion, curved perspective flight, scale/depth change, distant shockwave/starburst and dissipating exhaust.
- Crown: converging gold rays, metallic faceted crown with subtle yaw, halo/ring, moving highlights and upward dissolution.
- Banner image glows after 300–500 ms; a matching image/light seed moves from its measured location into the scene before the main artwork appears.
- Sender/gift recognition appears after the climax with a restrained light sweep.
- One cinematic effect runs at a time. Existing queue and combo behavior remain intact. Only confirmed realtime gifts trigger scenes.
- Overlay never handles touches, sits below Live controls/comments/banners, and never restarts Agora.
- Reduced-effects and small/weak devices keep the main gift artwork while reducing secondary particles and glow. OS Reduce Motion avoids sweeping/long travel.

## Boundaries
- Always: use deterministic motion/particle positions, keep animations on transform/opacity with the native driver, test timing/queue contracts, verify Web and TypeScript.
- Ask first: new paid asset pipeline or new animation library, database data rewrite beyond effect durations.
- Never: render before transaction confirmation, alter Agora lifecycle, place gift notices in comments, ship an emoji/flat-icon substitute.

## Open question
Dedicated sound assets are still required before sound can be enabled; no ringtone or generic synthesized effect is an acceptable fallback.
Artist-authored Rive/Lottie/WebM assets can replace the bundled vector art later; no such assets are supplied for this change.

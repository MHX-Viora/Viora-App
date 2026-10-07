# Premium Firework V4 handoff

## Trace and active renderer

`LiveGift` SignalR event → host/viewer `showGiftEvent` → banner queue + premium FIFO → validated `effectType: 1` → `PremiumGiftEffectLayer` → `CinematicFireworkEffect`. Both Live screens mount the same layer. No alternate/legacy Firework renderer remains referenced.

DEV emits `[PremiumGift:Firework]` with `giftId`, `effectType`, `renderer`, `effectVersion: V4`, `asset: procedural-svg:firework-v4`, `quality`, and `duration`.

## Before and after

Before: three similarly structured radial bursts, 84 individual particle `Animated.View`s at Ultra plus 12 comet/flash containers, no dedicated smoke layer, hero choreography, foreground rain, or Firework recognition combo.

After: four staggered authored bursts with curved launches and 112/140 ms anticipation pauses, localized core/light, batched asymmetric physics trails, expanding smoke, dedicated hero shockwave, three-depth spark rain, dynamic sender avatar/name/combo recognition, and staged decay. The model creates 120 authored Ultra sparks but batches them into 12 SVG trail paths and 27 Firework animated containers (23 LOW), versus roughly 96 previously.

Physics data is deterministic and includes initial velocity, drag, gravity, lifetime, brightness, size, rotation, and depth. Calculated interpolation ranges use `normalizeInputRange`.

Firework uses a dedicated linear normalized master clock so the choreography checkpoints remain exact in wall-clock time; the layer keyframes provide the nonlinear projectile motion. The generic full-screen impact light is disabled for Firework in favor of localized per-explosion light, and the virtual-camera impulse is aligned only with the Hero core/burst.

## Safety and performance

- Existing keyed `PremiumGiftEffectBoundary` retains the static premium fallback; Banner, Agora, comments, queue, and transaction paths are outside it.
- No new dependency, timer, loop, emitter, audio player, or large decoded asset was added. Parent animation cleanup remains the single lifecycle owner.
- Sound timing hooks exist for launch, main explosion, secondary booms, hero boom, and crackling tail. Playback remains disabled until dedicated approved Firework audio exists.
- Crown, Rocket, Gift Banner, SignalR, transaction, and Agora implementations were not redesigned.

## Verification

436/436 frontend tests pass, including Firework x10, FIFO/normal-gift interleaving, timeline, physics, budgets, mapping, mount, and fallback contracts. TypeScript, Expo lint, and Web export pass. Final main Web bundle is 6.88 MB (previous reported bundle 6.86 MB; +0.02 MB at reported precision).

Runtime visual/FPS/memory verification is not claimed: browser discovery returned no connected browser, so authenticated Live screenshots, console observation, and device profiling remain required.

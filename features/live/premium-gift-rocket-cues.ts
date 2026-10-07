import { rocketSoundCues, type RocketSoundCue } from "./premium-gift-rocket-model.ts";

type CueClock = { schedule: (callback: () => void, delayMs: number) => unknown; cancel: (timer: unknown) => void };
export function scheduleRocketSoundCues(durationMs: number, onCue: (cue: RocketSoundCue) => void, clock: CueClock) {
  let cancelled = false;
  const cues: {name:RocketSoundCue;atMs:number}[] = durationMs === 8500 ? [
    {name:"rocket_charge",atMs:0},{name:"rocket_ignite",atMs:1000},{name:"rocket_launch",atMs:1800},
    {name:"rocket_cloud_break",atMs:3000},{name:"rocket_atmosphere",atMs:4300},{name:"rocket_boost",atMs:6500},
    {name:"rocket_warp",atMs:7200},{name:"rocket_shimmer",atMs:8000},
  ] : rocketSoundCues(durationMs);
  const timers = cues.map((cue) => clock.schedule(() => { if (!cancelled) onCue(cue.name); }, cue.atMs));
  return () => { cancelled = true; timers.forEach(clock.cancel); };
}

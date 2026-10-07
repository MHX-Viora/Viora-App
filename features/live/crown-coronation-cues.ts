export type CrownSoundCue = "royal-whoosh" | "crystal-shimmer" | "coronation-impact" | "chime-tail";
export const CROWN_SOUND_CUES: readonly { atMs: number; cue: CrownSoundCue }[] = [
  { atMs: 0, cue: "royal-whoosh" },
  { atMs: 800, cue: "crystal-shimmer" },
  { atMs: 1700, cue: "coronation-impact" },
  { atMs: 2200, cue: "chime-tail" },
];
// Optional cue events only: no unprovided audio file or automatic sound playback.
export function scheduleCrownSoundCues(onCue: (cue: CrownSoundCue) => void, clock: {
  schedule: (action: () => void, delay: number) => unknown;
  cancel: (timer: unknown) => void;
}) {
  let cancelled = false;
  const timers = CROWN_SOUND_CUES.map(({ atMs, cue }) => clock.schedule(() => { if (!cancelled) onCue(cue); }, atMs));
  return () => { cancelled = true; timers.forEach(timer => clock.cancel(timer)); };
}

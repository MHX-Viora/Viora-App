import { CROWN_REVEAL_TIME } from "./premium-gift-crown-model.ts";

// Precompute cubic-bezier(.16, 1, .3, 1) for the native interpolation graph.
// The master clock remains linear; the crown alone accelerates and settles.
export function crownRevealEase(time: number): number {
  if (time <= 0) return 0;
  if (time >= 1) return 1;
  let low = 0, high = 1;
  for (let step = 0; step < 24; step++) {
    const u = (low + high) / 2;
    const x = 3 * (1 - u) ** 2 * u * .16 + 3 * (1 - u) * u ** 2 * .3 + u ** 3;
    if (x < time) low = u; else high = u;
  }
  const u = (low + high) / 2;
  return 1 - (1 - u) ** 3;
}
export const CROWN_REVEAL_MOTION = Array.from({ length: 17 }, (_, index) => ({
  time: CROWN_REVEAL_TIME + 1100 * index / 16,
  value: crownRevealEase(index / 16),
}));

import { JOURNEY as J } from "./rocket-journey-timeline.ts";

export const ROCKET_LAYER = { charge: 1, flight: 2, boost: 4, finale: 8, events: 16 } as const;
export function rocketVisibleLayers(p: number) {
  return (p < J.launch ? ROCKET_LAYER.charge : 0) |
    (p >= J.materialize - .012 && p < J.arrival ? ROCKET_LAYER.flight : 0) |
    (p >= J.boost - .008 && p < J.arrival ? ROCKET_LAYER.boost : 0) |
    (p >= J.arrival && p < 1 ? ROCKET_LAYER.finale : 0) |
    (p >= J.boost - .06 && p < J.burst + .002 ? ROCKET_LAYER.events : 0);
}

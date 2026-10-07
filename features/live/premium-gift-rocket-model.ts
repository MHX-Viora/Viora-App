import { JOURNEY } from "./rocket-journey-timeline.ts";
import type { CinematicQuality } from "./premium-gift-cinematic";

export const ROCKET_TIMELINE = { charge: 0, materialize: .067, ignition: .167, launch: .25, boost: .417, explosion: .567, afterglow: .883, finish: 1 } as const;
export const ROCKET_COLORS = { gold: "#FFD166", orange: "#FF8A00", red: "#FF3D71", pink: "#FF4FD8", violet: "#8B5CFF", cyan: "#00D9FF", blue: "#3D7BFF", white: "#FFFFFF", glass: "rgba(18,12,28,0.84)" } as const;
export const ROCKET_PALETTE = [ROCKET_COLORS.gold, ROCKET_COLORS.orange, ROCKET_COLORS.red, ROCKET_COLORS.pink, ROCKET_COLORS.violet, ROCKET_COLORS.cyan, ROCKET_COLORS.blue, ROCKET_COLORS.white];
type Point = { x: number; y: number };

export const rocketDuration = (durationMs: number) => Math.max(5000, Math.min(7000, durationMs));
export function rocketLayout(bounds: { width: number; height: number }, variant = 0) {
  const { width, height } = bounds;
  const size = Math.max(0, Math.min(height * .245, width * .46, 224));
  const startY = Math.min(height * .72, Math.max(size / 2, height - 112 - size / 2));
  const endY = height * .24;
  const paths = [[.42,.43,.55,.62],[.50,.51,.65,.73],[.58,.55,.43,.32],[.34,.40,.59,.69],[.50,.47,.48,.50]];
  const [a,b,c,d] = paths[variant % paths.length];
  return {
    size, start: { x: width * a, y: startY },
    control1: { x: width * b, y: startY - (startY - endY) * .18 }, control2: { x: width * c, y: endY + (startY - endY) * .34 },
    end: { x: width * d, y: endY }, core: { x: width * .50, y: height * .55 },
    burstRadius: Math.max(0, Math.min(width * .35, height * .23, 270)),
  };
}
export type RocketLayout = ReturnType<typeof rocketLayout>;

export function rocketBezier(layout: RocketLayout, t: number): Point {
  const u = 1 - t;
  const axis = (key: keyof Point) => u ** 3 * layout.start[key] + 3 * u ** 2 * t * layout.control1[key] + 3 * u * t ** 2 * layout.control2[key] + t ** 3 * layout.end[key];
  return { x: axis("x"), y: axis("y") };
}
export function rocketFlight(layout: RocketLayout) {
  const times = [0, ROCKET_TIMELINE.launch]; const x = [0, 0]; const y = [0, 0]; const bank = [0, 0];
  for (let index = 1; index <= 24; index++) {
    const t = (index / 24) ** 1.8;
    const point = rocketBezier(layout, t);
    const ahead = rocketBezier(layout, Math.min(1, t + .001));
    times.push(Number((ROCKET_TIMELINE.launch + index / 24 * (ROCKET_TIMELINE.explosion - ROCKET_TIMELINE.launch)).toFixed(8)));
    x.push(point.x - layout.start.x); y.push(point.y - layout.start.y);
    bank.push(index === 24 ? bank.at(-1)! : Math.atan2(ahead.x - point.x, point.y - ahead.y) * 180 / Math.PI);
  }
  times.push(1); x.push(x.at(-1)!); y.push(y.at(-1)!); bank.push(bank.at(-1)!);
  return { times, x, y, bank };
}

const random = (index: number, channel: number) => {
  const value = Math.sin(index * 73.17 + channel * 31.23 + 51.2) * 43758.5453;
  return value - Math.floor(value);
};
export function rocketParticlePlan(quality: CinematicQuality) {
  const count = { low: 3, medium: 6, high: 8, ultra: 10 }[quality];
  const bursts = Array.from({ length: count }, (_, group) => ({
    color: ROCKET_PALETTE[group % ROCKET_PALETTE.length], delay: group * .009,
    points: Array.from({ length: quality === "low" ? 8 : 16 }, (_, index) => {
      const angle = index / 16 * Math.PI * 2 + group * .51;
      const radius = .35 + random(group * 17 + index, 1) * .62;
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, size: 1.3 + random(index, group + 2) * 2.2, kind: index % 4 };
    }),
  }));
  const comets = Array.from({ length: quality === "ultra" ? 8 : quality === "low" ? 5 : 6 }, (_, index) => {
    const angle = -.95 * Math.PI + index / 7 * Math.PI * 1.7;
    return { x: Math.cos(angle) * .8, y: Math.sin(angle) * .7, angle: angle * 180 / Math.PI, delay: index * .012, color: ROCKET_PALETTE[index % 7] };
  });
  const trail = Array.from({ length: quality === "low" ? 4 : quality === "medium" ? 8 : 12 }, (_, index) => {
    const fraction = (index + 1) / (quality === "low" ? 5 : quality === "medium" ? 9 : 13);
    return { fraction, time: ROCKET_TIMELINE.launch + fraction * (ROCKET_TIMELINE.explosion - ROCKET_TIMELINE.launch) };
  });
  return { bursts, comets, trail };
}

// A cohort is two compound SVG paths, not one React component per particle.
export function rocketBurstPaths(points: ReturnType<typeof rocketParticlePlan>["bursts"][number]["points"]) {
  const filled: string[] = []; const streaks: string[] = [];
  for (const point of points) {
    const x = point.x * 86; const y = point.y * 86; const s = point.size;
    if (point.kind === 0) filled.push(`M${x} ${y - s * 2} l${s * .5} ${s * 1.5} l${s * 1.5} ${s * .5} l${-s * 1.5} ${s * .5} l${-s * .5} ${s * 1.5} l${-s * .5} ${-s * 1.5} l${-s * 1.5} ${-s * .5} l${s * 1.5} ${-s * .5}Z`);
    else if (point.kind === 1) filled.push(`M${x} ${y - s} l${s * .7} ${s} l${-s * .7} ${s} l${-s * .7} ${-s}Z`);
    else if (point.kind === 2) streaks.push(`M${x * .83} ${y * .83} L${x} ${y}`);
    else filled.push(`M${x - s / 2} ${y} a${s / 2} ${s / 2} 0 1 0 ${s} 0 a${s / 2} ${s / 2} 0 1 0 ${-s} 0`);
  }
  return { filled: filled.join(" "), streaks: streaks.join(" ") };
}

export type RocketSoundCue = "rocket_charge" | "rocket_ignite" | "rocket_launch" | "rocket_boost" | "rocket_explosion" | "rocket_cloud_break" | "rocket_atmosphere" | "rocket_warp" | "rocket_shimmer";
export function rocketSoundCues(durationMs: number): { name: RocketSoundCue; atMs: number }[] {
  return [
    { name: "rocket_charge", atMs: 0 }, { name: "rocket_ignite", atMs: Math.round(durationMs * JOURNEY.ignition) },
    { name: "rocket_launch", atMs: Math.round(durationMs * JOURNEY.launch) },
    { name: "rocket_boost", atMs: Math.round(durationMs * JOURNEY.boost) },
    { name: "rocket_explosion", atMs: Math.round(durationMs * JOURNEY.burst) },
  ];
}

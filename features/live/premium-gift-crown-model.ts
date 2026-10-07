import type { CinematicQuality } from "./premium-gift-cinematic";

export const CROWN_ANIMATION_DURATION = 6500;
export const CROWN_PHASES = { arrivalEnd: 700, awakeningEnd: 1800, revealEnd: 3200, coronationEnd: 4400, signatureEnd: 5600, finish: 6500 } as const;
export const CROWN_REVEAL_TIME = CROWN_PHASES.awakeningEnd;
export const CROWN_EXIT_TIME = CROWN_PHASES.signatureEnd;
export const CROWN_TIMELINE = {
  atmosphere: 130 / 6500, gathering: 700 / 6500, silhouette: 1800 / 6500,
  materialize: 1800 / 6500, formed: 3200 / 6500, impact: 3500 / 6500,
  settle: 4000 / 6500, sweep: 4100 / 6500, showcase: 4400 / 6500,
  finale: 5600 / 6500, dissolve: 5600 / 6500, dustEnd: 6450 / 6500, finish: 1,
} as const;
export const ROYAL_GOLD = { shadow: "#8A5A10", metal: "#D6A72C", gold: "#F4C95D", champagne: "#FFE7A3", highlight: "#FFF7D6", surface: "rgba(24,17,10,0.76)" } as const;
export const CROWN_PROFILE = "M36 210 L20 85 L90 135 L112 45 L154 132 L200 18 L246 132 L288 45 L310 135 L380 85 L364 210 Q200 258 36 210Z";
export const CROWN_BAND = "M36 202 Q200 257 364 202 L363 251 Q200 296 37 251Z";
export const CROWN_FOOT = "M37 250 Q200 295 363 250 L356 264 Q200 308 44 264Z";

export function crownLayout(bounds: { width: number; height: number }, variant = 0, multiple = false) {
  const width = Math.max(0, bounds.width), height = Math.max(0, bounds.height);
  const signatureHeight = height < 400 ? 72 : 112;
  const topSafe = Math.min(70, height * .16), bottomSafe = Math.min(120, height * .18);
  const room = Math.max(0, height - topSafe - bottomSafe - signatureHeight - 22);
  const size = Math.max(0, Math.min(width * (width < 600 ? .70 : .38), width < 600 ? 330 : 500, room / .75));
  const crownHeight = size * .75;
  const placements = width < 600 ? [.38,.50,.62] : [.40,.50,.60];
  const x = Math.max(size / 2, Math.min(width - size / 2, width * (multiple ? placements[variant % 3] : .5)));
  const y = Math.max(topSafe + crownHeight / 2, Math.min(height * .36, height - bottomSafe - signatureHeight - 22 - crownHeight / 2));
  return { x, y, size, height: crownHeight, signatureHeight, auraSize: Math.min(size * 1.9, width * .95, height * .76), senderY: y + crownHeight / 2 + 22 };
}

export const CROWN_REVEAL_TIMES = [0, CROWN_TIMELINE.materialize, CROWN_TIMELINE.formed, CROWN_TIMELINE.dissolve, 6050 / 6500, 1];
export const CROWN_REVEAL_OFFSETS = [1, 1, 0, 0, 1, 1];
export function crownRevealOffset(time: number) {
  const index = CROWN_REVEAL_TIMES.findIndex(value => value >= time);
  if (index <= 0) return 1;
  const fraction = (time - CROWN_REVEAL_TIMES[index - 1]) / (CROWN_REVEAL_TIMES[index] - CROWN_REVEAL_TIMES[index - 1]);
  return CROWN_REVEAL_OFFSETS[index - 1] + fraction * (CROWN_REVEAL_OFFSETS[index] - CROWN_REVEAL_OFFSETS[index - 1]);
}

const random = (index: number, channel: number) => {
  const value = Math.sin(index * 71.7 + channel * 19.3 + 83.1) * 43758.5453;
  return value - Math.floor(value);
};
export type CrownPoint = { x: number; y: number };
export type RoyalDust = { depth: number; size: number; brightness: number; startAt: number; points: CrownPoint[] };
export const PARTICLE_COUNT_MOBILE = 18;
export const PARTICLE_COUNT_DESKTOP = 30;
const DUST_COUNTS = { low: 15, medium: PARTICLE_COUNT_MOBILE, high: PARTICLE_COUNT_DESKTOP, ultra: PARTICLE_COUNT_DESKTOP };
export function crownDustPlan(quality: CinematicQuality): RoyalDust[] {
  return Array.from({ length: DUST_COUNTS[quality] }, (_, index) => {
    const angle = index * 2.399963; const spread = .85 + random(index, 0) * .28;
    const point = (a: number, r: number) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r * .65 });
    return { depth: index % 3, size: .45 + random(index, 2) * .8, brightness: .25 + random(index, 3) * .5,
      startAt: .025 + random(index, 4) * .065,
      points: [point(angle, spread), point(angle + .5, spread * .7), point(angle + 1.0, .14 + random(index, 1) * .1), point(angle + 1.15, .45), point(angle + 1.28, .6), point(angle + 1.5, .82)],
    };
  });
}

const silhouette = [[36,210],[20,85],[90,135],[112,45],[154,132],[200,18],[246,132],[288,45],[310,135],[380,85],[364,210],[356,264],[200,286],[44,264]];
export function crownContainsPoint(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = silhouette.length - 1; i < silhouette.length; j = i++) {
    const [xi,yi] = silhouette[i]; const [xj,yj] = silhouette[j];
    if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
export function crownDissolvePlan(quality: CinematicQuality) {
  const columns = quality === "low" ? 2 : 4;
  const rows = quality === "low" ? 2 : quality === "medium" ? 2 : quality === "high" ? 3 : 4;
  const flecks = quality === "ultra" ? 180 : quality === "high" ? 120 : 90;
  return Array.from({ length: columns * rows }, (_, index) => {
    const row = Math.floor(index / columns); const column = index % columns;
    const points = Array.from({ length: flecks }, (_, fleck) => ({ x: (column + random(index * 197 + fleck, 5)) / columns * 400, y: (row + random(index * 197 + fleck, 6)) / rows * 300 })).filter(point => crownContainsPoint(point.x, point.y));
    return { points, startAt: CROWN_TIMELINE.dissolve + row / rows * .06, dx: (column / (columns - 1) - .5) * .26, dy: -.13 - random(index, 7) * .15, rotation: (random(index, 8) - .5) * 10 };
  });
}

export type RoyalConfetti = { depth: number; size: number; color: string; rotation: number; startAt: number; x: number; spread: number; rise: number; fall: number };
export function crownConfettiPlan(quality: CinematicQuality): RoyalConfetti[] {
  const counts = { low: 10, medium: 12, high: 24, ultra: 30 };
  const colors = [ROYAL_GOLD.gold, ROYAL_GOLD.champagne, ROYAL_GOLD.highlight];
  return Array.from({ length: counts[quality] }, (_, i) => ({ depth: i % 3,
    size: .7 + random(i, 10) * .6, color: colors[i % 3], rotation: (random(i, 11) - .5) * 160,
    startAt: (3600 + random(i, 12) * 380) / CROWN_ANIMATION_DURATION,
    x: (random(i, 13) - .5) * .55, spread: (random(i, 14) - .5) * 1.6,
    rise: -.08 - random(i, 15) * .18, fall: .55 + random(i, 16) * .4,
  }));
}
export function crownGlints() {
  return [
    { x: 112, y: 48, at: 2700 / 6500, duration: 350 / 6500, size: .9 },
    { x: 200, y: 25, at: 2950 / 6500, duration: 350 / 6500, size: 1.1 },
    { x: 288, y: 48, at: 3200 / 6500, duration: 350 / 6500, size: .9 },
    { x: 120, y: 237, at: 4650 / 6500, duration: 300 / 6500, size: .7 },
    { x: 362, y: 213, at: 5000 / 6500, duration: 300 / 6500, size: .7 },
    { x: 200, y: 244, at: 5350 / 6500, duration: 350 / 6500, size: .8 },
  ];
}
export function crownRenderBudget(quality: CinematicQuality) {
  const clusters = crownDissolvePlan(quality);
  return { animatedNodes: DUST_COUNTS[quality] + crownConfettiPlan(quality).length + clusters.length + 40, flecks: clusters.reduce((count, cluster) => count + cluster.points.length, 0) };
}

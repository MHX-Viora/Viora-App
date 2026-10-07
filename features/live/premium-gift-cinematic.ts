import { CROWN_TIMELINE } from "./premium-gift-crown-model.ts";
import type { PremiumGiftEffectType } from "./premium-gift-effect-model";
import { FIREWORK_SHOW_TIMELINE } from "./premium-gift-firework-model.ts";

export type CinematicQuality = "low" | "medium" | "high" | "ultra";
export type CinematicBounds = { width: number; height: number; pageX: number; pageY: number };
export type GiftArtOrigin = { pageX: number; pageY: number; width: number; height: number };

export type CinematicTimeline = {
  anticipation: number;
  reveal: number;
  buildUp: number;
  impact: number;
  hero: number;
  aftermath: number;
  dissolve: number;
};

// Fractional checkpoints keep choreography proportional to the server-configured duration.
export const CINEMATIC_TIMELINE: Record<PremiumGiftEffectType, CinematicTimeline> = {
  1: { anticipation: 0, reveal: 0.08, buildUp: 0.17, impact: 0.37, hero: 0.44, aftermath: 0.72, dissolve: 0.86 },
  2: { anticipation: 0, reveal: 800/8500, buildUp: 1200/8500, impact: 1800/8500, hero: 5500/8500, aftermath: 7000/8500, dissolve: 8000/8500 },
  3: { anticipation: 0, reveal: CROWN_TIMELINE.materialize, buildUp: CROWN_TIMELINE.formed, impact: CROWN_TIMELINE.impact, hero: CROWN_TIMELINE.showcase, aftermath: CROWN_TIMELINE.finale, dissolve: 6050 / 6500 },
};

export function cinematicPhaseSegments(type: PremiumGiftEffectType, durationMs: number) {
  const timeline = CINEMATIC_TIMELINE[type];
  const stops = [timeline.reveal, timeline.buildUp, timeline.impact, timeline.hero, timeline.aftermath, timeline.dissolve, 1];
  let previous = 0;
  let elapsed = 0;
  return stops.map((to, index) => {
    const duration = index === stops.length - 1
      ? durationMs - elapsed
      : Math.round((to - previous) * durationMs);
    previous = to;
    elapsed += duration;
    return { to, durationMs: duration };
  });
}

export function cinematicQuality(bounds: Pick<CinematicBounds, "width" | "height">, reducedByUser: boolean, reducedBySystem: boolean, lowPowerDevice = false): CinematicQuality {
  if (reducedBySystem || reducedByUser || lowPowerDevice) return "low";
  const pixels = bounds.width * bounds.height;
  if (bounds.width < 600 || pixels < 450_000) return "medium";
  if (pixels < 1_300_000) return "high";
  return "ultra";
}

export function bannerOriginForBounds(bounds: CinematicBounds, origin?: GiftArtOrigin) {
  if (!origin || !Number.isFinite(origin.pageX) || !Number.isFinite(origin.pageY)) {
    return { x: bounds.width * 0.78, y: bounds.height * (bounds.width < 600 ? 0.34 : 0.43) };
  }
  return {
    x: Math.max(0, Math.min(bounds.width, origin.pageX + origin.width / 2 - bounds.pageX)),
    y: Math.max(0, Math.min(bounds.height, origin.pageY + origin.height / 2 - bounds.pageY)),
  };
}

export function crownDissolveBudget(quality: CinematicQuality) {
  if (quality === "ultra") return { clusters: 16, flecksPerCluster: 64 };
  if (quality === "high") return { clusters: 10, flecksPerCluster: 40 };
  if (quality === "medium") return { clusters: 6, flecksPerCluster: 20 };
  return { clusters: 0, flecksPerCluster: 0 };
}

export type CinematicCameraKeyframes = {
  inputRange: number[];
  translateX: number[];
  translateY: number[];
  scale: number[];
};

const INPUT_RANGE_PRECISION = 12;

/**
 * Keeps Animated.interpolate keyframes finite, bounded, and monotonic while
 * preserving their order and output-range alignment.
 */
export function normalizeInputRange(name: string, range: readonly number[]): number[] {
  let previous = 0;
  let changed = false;
  const normalized = range.map((rawValue) => {
    const finiteValue = Number.isFinite(rawValue) ? rawValue : previous;
    const canonicalValue = Number(finiteValue.toFixed(INPUT_RANGE_PRECISION));
    const boundedValue = Math.max(0, Math.min(1, canonicalValue));
    const value = Math.max(previous, boundedValue);
    if (!Number.isFinite(rawValue) || !Object.is(value, rawValue)) changed = true;
    previous = value;
    return value;
  });

  if (changed && typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(`[PremiumGift] Normalized invalid animation inputRange: ${name}`, {
      inputRange: range,
      normalized,
    });
  }
  return normalized;
}

export function cinematicCameraKeyframes(type: PremiumGiftEffectType): CinematicCameraKeyframes {
  const { impact, hero } = type === 1
    ? { impact: FIREWORK_SHOW_TIMELINE.mainCore, hero: Number((FIREWORK_SHOW_TIMELINE.mainBurst + 0.04).toFixed(6)) }
    : CINEMATIC_TIMELINE[type];
  const inputRange = normalizeInputRange(`camera-effect-${type}`, [
    0,
    Math.max(0, impact - 0.025),
    impact,
    impact + 0.018,
    Math.min(hero, impact + 0.05),
    hero,
    1,
  ]);
  if (type === 2) return {
    inputRange: [0, .398, .40, .409, .419, .435, .534, .535, .542, .55, .565, 1],
    translateX: [0, 0, -1.5, 2.6, -0.8, 0, 0, -.8, 1.4, -.4, 0, 0],
    translateY: [0, 0, 1, -2.2, .7, 0, 0, .5, -1.2, .3, 0, 0],
    scale: [1, 1, 1.004, 1.016, 1.009, 1, 1, 1.002, 1.008, 1.003, 1, 1],
  };
  if (type === 3) return {
    inputRange,
    translateX: [0, 0, 0, 0, 0, 0, 0],
    translateY: [0, 0, 0, 0, 0, 0, 0],
    scale: [1, 1, 1.002, 1.006, 1.004, 1.002, 1],
  };
  return {
    inputRange,
    translateX: [0, 0, -1.2, 2.2, -0.6, 0, 0],
    translateY: [0, 0, 1.2, -2.7, 0.8, 0, 0],
    scale: [1, 1, 1.004, 1.014, 1.008, 1.003, 1],
  };
}

export type CinematicHapticCue = { atMs: number; intensity: "light" | "medium" | "soft" };

export function cinematicHapticCues(type: PremiumGiftEffectType, durationMs: number): CinematicHapticCue[] {
  const timeline = CINEMATIC_TIMELINE[type];
  const at = (fraction: number) => Math.round(durationMs * fraction);
  if (type === 2) return [
    { atMs: at(timeline.buildUp), intensity: "light" },
    { atMs: at(timeline.impact), intensity: "medium" },
  ];
  if (type === 1) return [
    { atMs: at(FIREWORK_SHOW_TIMELINE.mainCore), intensity: "medium" },
    { atMs: at(FIREWORK_SHOW_TIMELINE.heroCore), intensity: "light" },
  ];
  return [{ atMs: at(timeline.impact), intensity: "soft" }];
}

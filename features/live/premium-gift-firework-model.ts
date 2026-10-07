import type { CinematicQuality } from "./premium-gift-cinematic";

export const FIREWORK_SHOW_TIMELINE = {
  start: 0,
  atmosphere: 0.08,
  mainLaunch: 0.09,
  mainRise: 0.17,
  mainArrival: 0.23,
  mainPause: 0.23,
  mainCore: 0.25,
  mainBurst: 0.256,
  innerBurst: 0.27,
  leftLaunch: 0.28,
  outerSparks: 0.30,
  rightLaunch: 0.32,
  leftCore: 0.325,
  leftBurst: 0.33,
  heroLaunch: 0.355,
  rightCore: 0.385,
  rightBurst: 0.39,
  heroArrival: 0.426,
  heroPause: 0.426,
  heroCore: 0.448,
  heroBurst: 0.455,
  sparkRain: 0.72,
  finish: 1,
} as const;

export const FIREWORK_PARTICLE_BUDGET = {
  low: 48,
  medium: 100,
  high: 128,
  ultra: 152,
} as const;

export type FireworkRole = "main" | "secondary-left" | "secondary-right" | "hero";
export type FireworkBurstPlan = {
  role: FireworkRole;
  x: number;
  y: number;
  launchAt: number;
  arrivalAt: number;
  pauseAt: number;
  coreAt: number;
  burstAt: number;
  radius: number;
  seed: number;
  particleCount: number;
  palette: readonly [string, string, string];
};

const BURST_WEIGHTS = [0.5, 0.17, 0.17] as const;

export function fireworkShowPlan(quality: CinematicQuality): FireworkBurstPlan[] {
  const total = FIREWORK_PARTICLE_BUDGET[quality];
  const main = Math.floor(total * BURST_WEIGHTS[0]);
  const left = Math.floor(total * BURST_WEIGHTS[1]);
  const right = Math.floor(total * BURST_WEIGHTS[2]);
  const hero = total - main - left - right;
  return [
    { role: "main", x: 0.50, y: 0.34, launchAt: FIREWORK_SHOW_TIMELINE.mainLaunch, arrivalAt: FIREWORK_SHOW_TIMELINE.mainArrival, pauseAt: FIREWORK_SHOW_TIMELINE.mainPause, coreAt: FIREWORK_SHOW_TIMELINE.mainCore, burstAt: FIREWORK_SHOW_TIMELINE.mainBurst, radius: 0.43, seed: 17, particleCount: main, palette: ["#FFFBE7", "#EFC77A", "#C78B43"] },
    { role: "secondary-left", x: 0.25, y: 0.29, launchAt: FIREWORK_SHOW_TIMELINE.leftLaunch, arrivalAt: 0.31, pauseAt: 0.31, coreAt: FIREWORK_SHOW_TIMELINE.leftCore, burstAt: FIREWORK_SHOW_TIMELINE.leftBurst, radius: 0.22, seed: 31, particleCount: left, palette: ["#FFF7DF", "#E7BA94", "#BB7549"] },
    { role: "secondary-right", x: 0.75, y: 0.27, launchAt: FIREWORK_SHOW_TIMELINE.rightLaunch, arrivalAt: 0.37, pauseAt: 0.37, coreAt: FIREWORK_SHOW_TIMELINE.rightCore, burstAt: FIREWORK_SHOW_TIMELINE.rightBurst, radius: 0.24, seed: 47, particleCount: right, palette: ["#FFF9EC", "#F5DCA7", "#C79B55"] },
    { role: "hero", x: 0.58, y: 0.20, launchAt: FIREWORK_SHOW_TIMELINE.heroLaunch, arrivalAt: FIREWORK_SHOW_TIMELINE.heroArrival, pauseAt: FIREWORK_SHOW_TIMELINE.heroPause, coreAt: FIREWORK_SHOW_TIMELINE.heroCore, burstAt: FIREWORK_SHOW_TIMELINE.heroBurst, radius: 0.23, seed: 73, particleCount: hero, palette: ["#FFFFFF", "#F4D79A", "#C79754"] },
  ];
}

export function fireworkAnticipationMs(durationMs: number, role: "main" | "hero") {
  const start = role === "main" ? FIREWORK_SHOW_TIMELINE.mainPause : FIREWORK_SHOW_TIMELINE.heroPause;
  const end = role === "main" ? FIREWORK_SHOW_TIMELINE.mainCore : FIREWORK_SHOW_TIMELINE.heroCore;
  return Math.round((end - start) * durationMs);
}

export type FireworkSpark = {
  angle: number;
  initialVelocity: number;
  drag: number;
  gravity: number;
  lifetime: number;
  brightness: number;
  size: number;
  rotation: number;
  depth: "background" | "midground" | "foreground";
};

const sample = (seed: number, index: number, channel: number) => {
  const value = Math.sin(seed * 91.7 + index * 37.1 + channel * 17.3) * 43_758.5453;
  return value - Math.floor(value);
};

export function fireworkParticlePhysics(seed: number, count: number, hero = false): FireworkSpark[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399963 + sample(seed, index, 0) * 0.42;
    const initialVelocity = (hero ? 0.76 : 0.62) + sample(seed, index, 1) * (hero ? 0.42 : 0.36);
    const drag = 0.86 + sample(seed, index, 2) * 0.09;
    const gravity = 0.17 + sample(seed, index, 3) * 0.18;
    return {
      angle,
      initialVelocity,
      drag,
      gravity,
      lifetime: 0.34 + sample(seed, index, 4) * 0.26,
      brightness: 0.48 + sample(seed, index, 5) * 0.5,
      size: 0.65 + sample(seed, index, 6) * (hero ? 1.9 : 1.45),
      rotation: sample(seed, index, 7) * 110 - 55,
      depth: index % 9 === 0 ? "foreground" : index % 3 === 0 ? "background" : "midground",
    };
  });
}

export function fireworkRenderBudget(quality: CinematicQuality) {
  const bursts = 4;
  return {
    bursts,
    animatedContainers: FIREWORK_PARTICLE_BUDGET[quality] + fireworkShowPlan(quality).reduce((total, burst) => total + Math.ceil(burst.particleCount / 6), 0) + (quality === "low" ? 51 : 87),
    sparkPaths: 0,
    authoredSparks: FIREWORK_PARTICLE_BUDGET[quality],
  };
}

/** Analytic drag + gravity; coordinates are normalized to the burst radius. */
export function fireworkSparkFrame(spark: FireworkSpark, age: number) {
  const t = Math.max(0, Math.min(1, age));
  const damping = 3 + -Math.log(spark.drag) * 6;
  const physicalTime = t * 2.2;
  const decay = Math.exp(-damping * physicalTime);
  const travel = (1 - decay) / damping;
  const speed = spark.initialVelocity * 3.8;
  const vx = Math.cos(spark.angle) * speed;
  const vy = Math.sin(spark.angle) * speed;
  const gravity = spark.gravity * 2.8;
  return {
    x: vx * travel,
    y: vy * travel + gravity * (physicalTime - travel) / damping,
    vx: vx * decay,
    vy: vy * decay + gravity * travel,
    opacity: t === 0 || t === 1 ? 0 : Math.min(1, t * 22) * Math.min(1, (1 - t) * 2.8) * (0.7 + spark.brightness * 0.3),
  };
}

export function fireworkBurstRadius(bounds: { width: number; height: number }, burst: FireworkBurstPlan) {
  const heightRatio = bounds.width / bounds.height > 2.2 ? burst.y * 0.7 : burst.role === "main" ? 0.36 : 0.22;
  return Math.min(bounds.width * burst.radius, bounds.height * heightRatio, burst.role === "main" ? 300 : 170);
}

export function fireworkRocketPoint(burst: FireworkBurstPlan, t: number) {
  const u = Math.max(0, Math.min(1, t));
  const rise = u * u * (1.25 - 0.25 * u);
  const launchX = burst.role === "secondary-right" ? 0.66 : 0.40;
  return { x: launchX + (burst.x - launchX) * rise + Math.sin(u * Math.PI) * 0.035, y: 0.84 + (burst.y - 0.84) * rise };
}

export type FireworkSoundCueName = "LAUNCH" | "EXPLOSION" | "SECONDARY_BOOM" | "HERO_BOOM" | "CRACKLING_TAIL";

export function fireworkSoundCues(durationMs: number): { name: FireworkSoundCueName; atMs: number; gain: number }[] {
  const at = (fraction: number) => Math.round(durationMs * fraction);
  return [
    { name: "LAUNCH", atMs: at(FIREWORK_SHOW_TIMELINE.mainLaunch), gain: 0.16 },
    { name: "EXPLOSION", atMs: at(FIREWORK_SHOW_TIMELINE.mainCore), gain: 0.3 },
    { name: "SECONDARY_BOOM", atMs: at(FIREWORK_SHOW_TIMELINE.leftCore), gain: 0.18 },
    { name: "SECONDARY_BOOM", atMs: at(FIREWORK_SHOW_TIMELINE.rightCore), gain: 0.2 },
    { name: "HERO_BOOM", atMs: at(FIREWORK_SHOW_TIMELINE.heroCore), gain: 0.36 },
    { name: "CRACKLING_TAIL", atMs: at(FIREWORK_SHOW_TIMELINE.sparkRain), gain: 0.1 },
  ];
}

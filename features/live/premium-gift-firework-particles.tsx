import { memo, useMemo } from "react";
import { Animated } from "react-native";

import type { CinematicBounds } from "./premium-gift-cinematic";
import { fireworkBurstRadius, fireworkParticlePhysics, fireworkRocketPoint, fireworkSparkFrame, type FireworkBurstPlan, type FireworkSpark } from "./premium-gift-firework-model";

const sparkTexture = require("../../assets/images/firework-spark.png");
const emberTexture = require("../../assets/images/firework-ember.png");
const SAMPLES = 20;

type Frames = { time: number[]; x: number[]; y: number[]; opacity: number[]; rotation: string[]; scale: number[] };

/** Every sprite shares the parent's native clock; no timers, frame listeners or React updates. */
const LightParticle = memo(function LightParticle({ frames, progress, size = 1, ember = false, depth = 4 }: {
  frames: Frames; progress: Animated.Value; size?: number; ember?: boolean; depth?: number;
}) {
  const value = (outputRange: number[]) => progress.interpolate({ inputRange: frames.time, outputRange, extrapolate: "clamp" });
  return <Animated.Image accessibilityElementsHidden importantForAccessibility="no-hide-descendants" source={ember ? emberTexture : sparkTexture} style={{
    position: "absolute", left: -32 * size, top: -12 * size, width: 64 * size, height: 24 * size, zIndex: depth,
    opacity: value(frames.opacity),
    transform: [{ translateX: value(frames.x) }, { translateY: value(frames.y) },
      { rotate: progress.interpolate({ inputRange: frames.time, outputRange: frames.rotation, extrapolate: "clamp" }) }, { scale: value(frames.scale) }],
  }} />;
});

function sparkFrames(spark: FireworkSpark, burst: FireworkBurstPlan, bounds: CinematicBounds, delay = 0): Frames {
  const radius = fireworkBurstRadius(bounds, burst);
  const start = burst.burstAt + delay;
  const life = Math.min(spark.lifetime, 0.975 - start);
  const frames: Frames = { time: [0], x: [bounds.width * burst.x], y: [bounds.height * burst.y], opacity: [0], rotation: ["0deg"], scale: [0.6] };
  let previousAngle = spark.angle * 180 / Math.PI;
  for (let i = 0; i <= SAMPLES; i++) {
    const age = i / SAMPLES;
    const point = fireworkSparkFrame(spark, age);
    let angle = Math.atan2(point.vy, point.vx) * 180 / Math.PI;
    // Unwrap the angle so a downward turn never spins a sprite through 360 degrees.
    while (angle - previousAngle > 180) angle -= 360;
    while (angle - previousAngle < -180) angle += 360;
    previousAngle = angle;
    frames.time.push(start + age * life);
    frames.x.push(bounds.width * burst.x + point.x * radius);
    frames.y.push(bounds.height * burst.y + point.y * radius);
    const twinkle = i % 4 === 2 && age > 0.45 ? 0.63 : 1;
    frames.opacity.push(point.opacity * twinkle * (delay ? 0.38 : spark.depth === "background" ? 0.45 : 1));
    frames.rotation.push(`${angle}deg`);
    frames.scale.push((1 - age * 0.55) * (delay ? 0.6 : 1));
  }
  frames.time.push(1); frames.x.push(frames.x.at(-1)!); frames.y.push(frames.y.at(-1)!);
  frames.opacity.push(0); frames.rotation.push(frames.rotation.at(-1)!); frames.scale.push(0.35);
  return frames;
}

export const FireworkMovingSparks = memo(function FireworkMovingSparks({ bounds, burst, progress }: {
  bounds: CinematicBounds; burst: FireworkBurstPlan; progress: Animated.Value;
}) {
  const particles = useMemo(() => fireworkParticlePhysics(burst.seed, burst.particleCount, burst.role === "main").flatMap((spark, index) => {
    const size = (spark.depth === "background" ? 0.7 : spark.depth === "foreground" ? 1.5 : 1.05) * (0.75 + spark.size * 0.18);
    const depth = spark.depth === "background" ? 2 : spark.depth === "foreground" ? 6 : 4;
    const head = { frames: sparkFrames(spark, burst, bounds), size, depth, ember: false };
    return index % 6 === 0 ? [head, { frames: sparkFrames(spark, burst, bounds, 0.014), size: size * 0.65, depth, ember: true }] : [head];
  }), [bounds, burst]);
  return <>{particles.map((particle, index) => <LightParticle {...particle} key={index} progress={progress} />)}</>;
});

export const FireworkRocketEmbers = memo(function FireworkRocketEmbers({ bounds, burst, progress, count }: {
  bounds: CinematicBounds; burst: FireworkBurstPlan; progress: Animated.Value; count: number;
}) {
  const particles = useMemo(() => Array.from({ length: count }, (_, index) => {
    const emission = index / count;
    const point = fireworkRocketPoint(burst, emission);
    const start = burst.launchAt + emission * (burst.arrivalAt - burst.launchAt);
    const life = 0.055 + (index % 5) * 0.009;
    const x = point.x * bounds.width; const y = point.y * bounds.height;
    const drift = Math.sin(index * 17.3) * bounds.width * 0.022;
    return { time: [0, start, start + 0.004, start + life * 0.5, start + life, 1],
      x: [x, x, x, x + drift * 0.6, x + drift, x + drift],
      y: [y, y, y, y + bounds.height * 0.025, y + bounds.height * 0.065, y + bounds.height * 0.065],
      opacity: [0, 0, 0.84, 0.3, 0, 0], rotation: ["90deg", "90deg", "90deg", "90deg", "90deg", "90deg"], scale: [0.6, 0.6, 0.6, 0.4, 0.1, 0.1] };
  }), [bounds, burst, count]);
  return <>{particles.map((frames, index) => <LightParticle depth={3} ember frames={frames} key={index} progress={progress} size={0.68 + index % 3 * 0.12} />)}</>;
});

export const FireworkGoldenRain = memo(function FireworkGoldenRain({ bounds, progress, count }: {
  bounds: CinematicBounds; progress: Animated.Value; count: number;
}) {
  const particles = useMemo(() => fireworkParticlePhysics(191, count).map((spark, index) => {
    const start = 0.70 + index % 7 * 0.012;
    const x = bounds.width * (0.17 + ((index * 0.618) % 0.66));
    const y = bounds.height * (0.28 + index % 5 * 0.035);
    const drift = spark.rotation * bounds.width * 0.001;
    return { time: [0, start, start + 0.035, start + 0.12, 0.975, 1], x: [x, x, x, x + drift * 0.5, x + drift, x + drift],
      y: [y, y, y + bounds.height * 0.01, y + bounds.height * 0.06, y + bounds.height * 0.22, y + bounds.height * 0.24],
      opacity: [0, 0, spark.brightness, spark.brightness * 0.6, 0, 0], rotation: Array(6).fill("90deg"), scale: [0.65, 0.65, 0.85, 0.6, 0.25, 0.2] };
  }), [bounds, count]);
  return <>{particles.map((frames, index) => <LightParticle depth={6} frames={frames} key={index} progress={progress} size={index % 3 === 0 ? 0.9 : 0.55} />)}</>;
});

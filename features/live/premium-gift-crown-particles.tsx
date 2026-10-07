import { memo, useMemo } from "react";
import { Animated, Platform, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { CROWN_ANIMATION_DURATION, crownConfettiPlan, crownDissolvePlan, crownDustPlan, ROYAL_GOLD, type crownLayout } from "./premium-gift-crown-model";

type Props = { layout: ReturnType<typeof crownLayout>; progress: Animated.Value; quality: SceneProps["quality"] };
const at = (milliseconds: number) => milliseconds / CROWN_ANIMATION_DURATION;

export const RoyalGoldDust = memo(function RoyalGoldDust({ layout, progress, quality }: Props) {
  const dust = useMemo(() => crownDustPlan(quality), [quality]);
  return <>{dust.map((particle, index) => {
    // Eighteen motes announce arrival; the rest join the gradual awakening.
    const start = Math.max(particle.startAt, index >= 18 ? at(800) : 0);
    const time = [0, start, Math.max(start + .015, at(700)), at(1800), at(3200), at(4400), at(6350), 1];
    const points = [particle.points[0], ...particle.points, particle.points[5]];
    const depth = particle.depth === 0 ? .62 : particle.depth === 2 ? 1.12 : .85;
    const drift = (axis: "x" | "y") => progress.interpolate({ inputRange: time, outputRange: points.map(point => point[axis] * layout.size * depth), extrapolate: "clamp" });
    const brightness = particle.brightness * (particle.depth === 2 ? .7 : 1);
    const opacity = progress.interpolate({ inputRange: time, outputRange: [0, 0, brightness, brightness * .65, brightness, brightness * .8, brightness * .3, 0], extrapolate: "clamp" });
    const size = Math.max(2, particle.size * (particle.depth === 2 ? 4 : particle.depth === 0 ? 2 : 3));
    const soften = Platform.OS === "web" && quality !== "low" && particle.depth !== 1 ? { filter: `blur(${particle.depth === 0 ? .8 : .45}px)` } as ViewStyle : {};
    return <Animated.View key={index} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: "absolute", left: layout.x - size / 2, top: layout.y - size / 2, width: size, height: size, borderRadius: particle.depth === 1 ? 0 : size / 2, backgroundColor: index % 3 === 0 ? ROYAL_GOLD.champagne : ROYAL_GOLD.gold, opacity, zIndex: particle.depth === 2 ? 6 : 2, transform: [{ translateX: drift("x") }, { translateY: drift("y") }, { rotate: "45deg" }] }, soften]} />;
  })}</>;
});

export const RoyalConfetti = memo(function RoyalConfetti({ layout, progress, quality }: Props) {
  const confetti = useMemo(() => crownConfettiPlan(quality), [quality]);
  return <>{confetti.map((particle, index) => {
    const start = particle.startAt;
    const range = [0, start, start + .06, start + .14, start + .25, .96, 1];
    const opacity = progress.interpolate({ inputRange: range, outputRange: [0, 0, .7, .85, .55, .18, 0], extrapolate: "clamp" });
    const translateX = progress.interpolate({ inputRange: range, outputRange: [0, 0, particle.spread * .2, particle.spread * .45, particle.spread * .7, particle.spread, particle.spread].map(value => value * layout.size), extrapolate: "clamp" });
    // Hand-authored ballistic samples accelerate downward without JS frame work.
    const translateY = progress.interpolate({ inputRange: range, outputRange: [0, 0, particle.rise, particle.rise * .45, particle.fall * .2, particle.fall, particle.fall].map(value => value * layout.size), extrapolate: "clamp" });
    const rotation = progress.interpolate({ inputRange: [0, start, .96, 1], outputRange: ["0deg", "0deg", `${particle.rotation + (index % 2 ? 280 : -280)}deg`, `${particle.rotation + (index % 2 ? 300 : -300)}deg`] });
    const tumble = progress.interpolate({ inputRange: [0, start, start + .1, start + .2, start + .3, .96, 1], outputRange: ["0deg", "0deg", "100deg", "200deg", "300deg", "480deg", "500deg"] });
    const size = particle.size * (particle.depth === 2 ? 5 : particle.depth === 0 ? 2.5 : 3.5);
    const soften = Platform.OS === "web" && quality !== "low" && particle.depth === 0 ? { filter: "blur(.7px)" } as ViewStyle : {};
    return <Animated.View key={index} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ position: "absolute", left: layout.x + particle.x * layout.size, top: layout.y + layout.size * .12, width: size, height: size * .55, borderRadius: .5, backgroundColor: particle.color, opacity, zIndex: particle.depth === 2 ? 6 : 2, transform: [{ perspective: 400 }, { translateX }, { translateY }, { rotate: rotation }, { rotateY: tumble }] }, soften]} />;
  })}</>;
});

/** Retained for compatibility; the coronation scene uses an elegant opacity exit. */
export const CrownSurfaceDissolve = memo(function CrownSurfaceDissolve({ layout, progress, quality }: Props) {
  const clusters = useMemo(() => crownDissolvePlan(quality), [quality]);
  return <>{clusters.map((cluster, index) => {
    const start = cluster.startAt; const end = Math.min(.995, start + .1);
    const range = [0, start, Math.min(start + .015, end), end, 1];
    const opacity = progress.interpolate({ inputRange: range, outputRange: [0, 0, .9, 0, 0], extrapolate: "clamp" });
    const x = progress.interpolate({ inputRange: range, outputRange: [0, 0, layout.size * cluster.dx * .13, layout.size * cluster.dx, layout.size * cluster.dx], extrapolate: "clamp" });
    const y = progress.interpolate({ inputRange: range, outputRange: [0, 0, layout.size * cluster.dy * .13, layout.size * cluster.dy, layout.size * cluster.dy], extrapolate: "clamp" });
    const rotation = progress.interpolate({ inputRange: range, outputRange: ["0deg", "0deg", "0deg", `${cluster.rotation}deg`, `${cluster.rotation}deg`], extrapolate: "clamp" });
    const flecks = (parity: number) => cluster.points.filter((_, i) => i % 2 === parity).map((point, i) => { const r = i % 7 === 0 ? 1.4 : .7; return `M${point.x - r} ${point.y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`; }).join(" ");
    return <Animated.View key={index} style={{ position: "absolute", left: layout.x - layout.size / 2, top: layout.y - layout.height / 2, width: layout.size, height: layout.height, opacity, zIndex: 5, transform: [{ translateX: x }, { translateY: y }, { rotate: rotation }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 300"><Path d={flecks(0)} fill={ROYAL_GOLD.gold} opacity=".72" /><Path d={flecks(1)} fill={ROYAL_GOLD.highlight} /></Svg>
    </Animated.View>;
  })}</>;
});

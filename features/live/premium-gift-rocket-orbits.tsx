import type { RocketProgress } from "./premium-gift-rocket-progress";
import { useMemo } from "react";
import { Animated } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { RocketGlow } from "./premium-gift-rocket-environment";
import { rocketOrbitFrames } from "./premium-gift-rocket-energy-model";
import { ROCKET_COLORS as C } from "./premium-gift-rocket-model";

export function RocketOrbits({ size, progress, side }: { size: number; progress: RocketProgress; side: "back" | "front" }) {
  return <>{[C.gold, C.pink, C.cyan].map((color, index) => <EnergyOrbit color={color} index={index} key={color} size={size} progress={progress} side={side} />)}</>;
}

function EnergyOrbit({ size, progress, side, color, index }: { size: number; progress: RocketProgress; side: "back" | "front"; color: string; index: number }) {
  const frames = useMemo(() => rocketOrbitFrames(index), [index]);
  const front = side === "front";
  const visibility = progress.interpolate({ inputRange: [0, .1, .15, .417, .445, .49, .54, .567, 1], outputRange: [0, 0, .65, .8, 1, .72, .6, 0, 0], extrapolate: "clamp" });
  const deform = progress.interpolate({ inputRange: [0, .417, .46, .54, 1], outputRange: [1, 1, 1.5, 2.5, 2.5], extrapolate: "clamp" });
  const nodeOpacity = progress.interpolate({ inputRange: frames.times, outputRange: front ? frames.front : frames.back, extrapolate: "clamp" });
  const arc = front ? "M115 20 A55 13 0 0 1 5 20" : "M5 20 A55 13 0 0 1 115 20";
  return <>
    <Animated.View style={{ position: "absolute", left: -size * .18, top: size * (.26 + index * .16), opacity: Animated.multiply(visibility, front ? 1 : .42),
      transform: [{ rotate: progress.interpolate({ inputRange: frames.times, outputRange: frames.rotation, extrapolate: "clamp" }) }, { scaleY: deform }] }}>
      <Svg width={size} height={size * .34} viewBox="0 0 120 40"><Path d={arc} fill="none" stroke={color} strokeWidth="7" opacity=".12" /><Path d={arc} fill="none" stroke={color} strokeWidth="2" opacity=".45" strokeDasharray="24 10 5 12" /><Path d={front ? "M104 28 Q70 39 48 32" : "M18 12 Q43 3 64 8"} stroke={color} strokeWidth="2.5" fill="none" /><Path d={front ? "M98 29 Q75 36 60 34" : "M23 11 Q44 5 55 6"} stroke={C.white} strokeWidth=".8" fill="none" /></Svg>
    </Animated.View>
    <Animated.View style={{ position: "absolute", left: size * .32 - 12, top: size * (.43 + index * .16) - 12, opacity: nodeOpacity,
      transform: [{ translateX: progress.interpolate({ inputRange: frames.times, outputRange: frames.x.map(x => x * size), extrapolate: "clamp" }) }, { translateY: progress.interpolate({ inputRange: frames.times, outputRange: frames.y.map(y => y * size), extrapolate: "clamp" }) }] }}>
      <RocketGlow color={color} size={24} white />
      <Svg width={24} height={24} style={{ position: "absolute" }} viewBox="0 0 24 24"><Path d="M2 13 Q8 16 12 12" fill="none" stroke={color} strokeWidth="2" /><Circle cx="12" cy="12" r="2" fill={C.white} /><Path d="M18 4 L18 8 M16 6 L20 6" stroke={color} strokeWidth=".8" /></Svg>
    </Animated.View>
  </>;
}

import { memo, useId } from "react";
import { Animated, Platform, StyleSheet, type ViewStyle } from "react-native";
import Svg, { Defs, Path, RadialGradient, Stop, Circle } from "react-native-svg";
import { RoyalCrownArt } from "./premium-gift-crown-art";
import { CROWN_ANIMATION_DURATION, crownGlints, type crownLayout } from "./premium-gift-crown-model";
import type { CinematicQuality } from "./premium-gift-cinematic";
import { CROWN_REVEAL_MOTION } from "./crown-reveal-motion";

type Props = { layout: ReturnType<typeof crownLayout>; progress: Animated.Value; reducedMotion: boolean; quality: CinematicQuality };
const at = (milliseconds: number) => milliseconds / CROWN_ANIMATION_DURATION;
const curve = (progress: Animated.Value, times: number[], values: number[]) => progress.interpolate({ inputRange: times.map(at), outputRange: values, extrapolate: "clamp" });

export const RoyalCrownRenderer = memo(function RoyalCrownRenderer({ layout, progress, reducedMotion, quality }: Props) {
  const { size, height, x, y } = layout;
  const useBlur = Platform.OS === "web" && quality !== "low";
  const opacity = curve(progress, [0, 1800, 2300, 5600, 6100, 6500], [0, 0, 1, 1, 0, 0]);
  const revealTimes = CROWN_REVEAL_MOTION.map(sample => sample.time);
  const float = curve(progress, [0, ...revealTimes, 3200, 3450, 3650, 4000, 4500, 5100, 5600, 6100, 6500], [50, ...CROWN_REVEAL_MOTION.map(sample => 50 * (1 - sample.value)), 0, -8, 0, -4, 0, 4, 0, -20, -20]);
  const scale = curve(progress, [0, ...revealTimes, 3000, 3100, 3200, 5600, 5780, 6100, 6500], [.45, ...CROWN_REVEAL_MOTION.map(sample => .45 + .63 * sample.value), 1.028, 1.006, 1, 1, 1.04, .92, .92]);
  const pitch = progress.interpolate({ inputRange: [0, ...revealTimes.map(at), 1], outputRange: ["15deg", ...CROWN_REVEAL_MOTION.map(sample => `${15 * (1 - sample.value)}deg`), "0deg"], extrapolate: "clamp" });
  const yaw = progress.interpolate({ inputRange: [0, at(3200), at(4400), at(5600), 1], outputRange: ["-2deg", "-2deg", "2deg", "-2deg", "0deg"], extrapolate: "clamp" });
  const sharp = curve(progress, [0, 1800, 2400, 5600, 6100, 6500], [0, 0, 1, 1, 0, 0]);
  const revealBlur = curve(progress, [0, 1800, 1950, 2400, 6500], [0, 0, .8, 0, 0]);
  const exitBlur = curve(progress, [0, 5600, 5830, 6100, 6500], [0, 0, .55, 0, 0]);
  return <Animated.View pointerEvents="none" style={[styles.crown, { width: size, height, left: x - size / 2, top: y - height / 2, opacity, transform: reducedMotion ? [] : [{ perspective: 900 }, { translateY: float }, { rotateX: pitch }, { rotateY: yaw }, { scale }] }]}>
    {reducedMotion ? <RoyalCrownArt width={size} /> : <>
      {useBlur ? <>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: revealBlur, filter: "blur(8px)" } as ViewStyle]}><RoyalCrownArt width={size} /></Animated.View>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: exitBlur, filter: "blur(4px)" } as ViewStyle]}><RoyalCrownArt width={size} /></Animated.View>
      </> : null}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: useBlur ? sharp : 1 }]}>
        <RoyalCrownArt width={size} />
        <MetalLightSweep progress={progress} size={size} />
      </Animated.View>
      <GemstoneGlints progress={progress} size={size} />
    </>}
  </Animated.View>;
});

function MetalLightSweep({ size, progress }: { size: number; progress: Animated.Value }) {
  // Preauthored diagonal masks crossfade over one 600ms passage. All animation
  // remains opacity on the native driver; no per-frame SVG/React updates.
  return <>{Array.from({ length: 10 }, (_, index) => {
    const center = at(3360 + index * 480 / 9);
    const opacity = progress.interpolate({ inputRange: [0, center - at(60), center, center + at(60), 1], outputRange: [0, 0, .78, 0, 0], extrapolate: "clamp" });
    return <Animated.View key={index} style={[StyleSheet.absoluteFillObject, { opacity }]}><RoyalCrownArt sweep={index} width={size} /></Animated.View>;
  })}</>;
}

function GemstoneGlints({ size, progress }: { size: number; progress: Animated.Value }) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return <>{crownGlints().map((glint, index) => {
    const peak = glint.at + glint.duration * .4; const end = glint.at + glint.duration;
    const range = [0, glint.at, peak, end, 1];
    const opacity = progress.interpolate({ inputRange: range, outputRange: [0, 0, 1, 0, 0], extrapolate: "clamp" });
    const scale = progress.interpolate({ inputRange: range, outputRange: [0, 0, 1.6, 0, 0], extrapolate: "clamp" });
    const radius = Math.max(7, size * .048) * glint.size; const id = `royal-glint-${instance}-${index}`;
    return <Animated.View key={index} style={{ position: "absolute", left: glint.x / 400 * size - radius, top: glint.y / 400 * size - radius, width: radius * 2, height: radius * 2, opacity, transform: [{ scale }, { rotate: `${index % 2 ? -8 : 8}deg` }], zIndex: 5 }}>
      <Svg width="100%" height="100%" viewBox="0 0 60 60"><Defs><RadialGradient id={id}><Stop offset="0" stopColor="#FFFFFF" /><Stop offset=".18" stopColor="#FFF7D6" stopOpacity=".75" /><Stop offset="1" stopColor="#FFE7A3" stopOpacity="0" /></RadialGradient></Defs>
        <Circle cx="30" cy="30" r="28" fill={`url(#${id})`} />
        <Path d="M30 3 Q32 25 35 27 Q40 29 56 30 Q38 31 35 33 Q32 38 30 57 Q28 37 25 33 Q19 31 4 30 Q22 29 25 27 Q28 20 30 3Z" fill="#FFFDF2" />
      </Svg>
    </Animated.View>;
  })}</>;
}
const styles = StyleSheet.create({ crown: { position: "absolute", overflow: "visible", zIndex: 4 } });

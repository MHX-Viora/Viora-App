import { Animated, StyleSheet } from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import type { RocketSceneProps as SceneProps, RocketProgress } from "./premium-gift-rocket-progress";
import { ROCKET_COLORS as C, type RocketLayout } from "./premium-gift-rocket-model";

export function RocketGlow({ size, color, white = false }: { size: number; color: string; white?: boolean }) {
  return <Svg height={size} width={size} viewBox="0 0 100 100"><Defs><RadialGradient id={`bloom-${color.replace("#", "")}`}><Stop stopColor={white ? C.white : color} stopOpacity=".95" /><Stop offset=".12" stopColor={color} stopOpacity=".72" /><Stop offset=".4" stopColor={color} stopOpacity=".28" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient></Defs><Circle cx="50" cy="50" r="50" fill={`url(#bloom-${color.replace("#", "")})`} /></Svg>;
}

export function RocketElectricArcs({ point, size, progress, at }: { point: { x: number; y: number }; size: number; progress: RocketProgress; at: number }) {
  const opacity = progress.interpolate({ inputRange: [0, at, at + .005, at + .014, at + .021, 1], outputRange: [0, 0, 1, .25, 0, 0], extrapolate: "clamp" });
  return <Animated.View style={{ position: "absolute", left: point.x - size / 2, top: point.y - size / 2, opacity }}>
    <Svg width={size} height={size} viewBox="0 0 100 100"><Path d="M12 47 L25 39 L23 51 L34 46 M63 22 L74 15 L69 30 L85 26 M65 72 L79 64 L75 79 L89 75" fill="none" stroke={C.blue} strokeWidth="5" opacity=".2" /><Path d="M12 47 L25 39 L23 51 L34 46 M63 22 L74 15 L69 30 L85 26 M65 72 L79 64 L75 79 L89 75" fill="none" stroke={C.cyan} strokeWidth="1.2" /><Path d="M17 64 L28 58 L25 69 L39 61" fill="none" stroke={C.violet} strokeWidth="1.5" /></Svg>
  </Animated.View>;
}

export function RocketCharge({ layout, progress, reducedMotion }: SceneProps & { layout: RocketLayout }) {
  const size = layout.size * 1.5;
  const opacity = progress.interpolate({ inputRange: [0, .025, .10, .19, .25, 1], outputRange: [0, .8, 1, .5, 0, 0], extrapolate: "clamp" });
  const pulse = progress.interpolate({ inputRange: [0, .025, .04, .065, .08, .1, .16, 1], outputRange: [.3, .85, .55, 1.1, .7, 1.25, 1, 1], extrapolate: "clamp" });
  const scrim = progress.interpolate({ inputRange: [0, .03, .09, .2, 1], outputRange: [0, .16, .16, 0, 0], extrapolate: "clamp" });
  return <>
    <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#020A1D", opacity: reducedMotion ? 0 : scrim }]} />
    <Animated.View style={{ position: "absolute", left: layout.core.x - size / 2, top: layout.core.y - size / 2, opacity, transform: [{ scale: reducedMotion ? .65 : pulse }] }}><RocketGlow color={C.cyan} size={size} white /></Animated.View>
    {!reducedMotion ? <>
      <RocketElectricArcs point={layout.core} size={size} progress={progress} at={.045} />
      <Animated.View style={{ position: "absolute", left: layout.core.x - size / 2, top: layout.core.y - size / 2, opacity, transform: [{ scale: pulse }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "540deg"] }) }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100"><Circle cx="50" cy="50" r="30" fill="none" stroke={C.cyan} strokeWidth="1" /><Ellipse cx="50" cy="50" rx="44" ry="18" fill="none" stroke={C.violet} strokeWidth="1.3" /><Path d="M21 30 L30 27 L28 35 L38 32 M63 64 L73 61 L70 70 L81 67" stroke={C.white} strokeWidth="1" fill="none" /></Svg>
      </Animated.View>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3;
        const gather = progress.interpolate({ inputRange: [0, .02, .12, .2, 1], outputRange: [1, 1, 0, 0, 0], extrapolate: "clamp" });
        return <Animated.View key={index} style={{ position: "absolute", left: layout.core.x - 10, top: layout.core.y - 10, opacity, transform: [{ translateX: Animated.multiply(gather, Math.cos(angle) * size * .55) }, { translateY: Animated.multiply(gather, Math.sin(angle) * size * .55) }, { scale: pulse }] }}><RocketGlow size={20} color={index % 2 ? C.violet : C.cyan} white /></Animated.View>;
      })}
    </> : null}
  </>;
}

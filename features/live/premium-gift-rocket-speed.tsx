import { useMemo } from "react";
import { Animated, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { RocketSceneProps as SceneProps } from "./premium-gift-rocket-progress";
import { ROCKET_COLORS as C } from "./premium-gift-rocket-model";

export function RocketSpeedLayers({ bounds, progress, quality }: Pick<SceneProps, "bounds" | "progress" | "quality">) {
  const groups = useMemo(() => [0, 1, 2].map(depth => [C.gold, C.cyan, C.white, C.pink].map((color, channel) => ({
    color, path: Array.from({ length: quality === "low" ? 3 : depth === 0 ? 5 : 4 }, (_, index) => {
      const x = bounds.width * ((index * .213 + channel * .137 + depth * .051) % 1);
      const y = bounds.height * ((index * .197 + channel * .091) % .7 - .35);
      const length = bounds.height * (.07 + depth * .045 + index % 2 * .025);
      return `M${x} ${y} l${-length * .22} ${length}`;
    }).join(" "),
  }))), [bounds.width, bounds.height, quality]);
  return <>{groups.map((paths, depth) => <Animated.View key={depth} style={[StyleSheet.absoluteFillObject, {
    opacity: progress.interpolate({ inputRange: [0, .25, .35, .417, .445, .54, .59, 1], outputRange: [0, 0, .04, .08, .18 + depth * .1, .16 + depth * .1, 0, 0], extrapolate: "clamp" }),
    transform: [{ translateY: progress.interpolate({ inputRange: [0, .25, .417, .567, 1], outputRange: [-bounds.height * .2, -bounds.height * .2, 0, bounds.height * (.4 + depth * .25), bounds.height * (.4 + depth * .25)], extrapolate: "clamp" }) }],
  }]}><Svg width="100%" height="100%" viewBox={`0 0 ${bounds.width} ${bounds.height}`}>{paths.map(({ color, path }) => <Path key={color} d={path} fill="none" stroke={color} strokeWidth={.7 + depth * .7} strokeLinecap="round" />)}</Svg></Animated.View>)}</>;
}

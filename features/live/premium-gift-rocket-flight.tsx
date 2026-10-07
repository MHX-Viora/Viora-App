import { useMemo } from "react";
import { Animated } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Path, Stop } from "react-native-svg";
import type { RocketSceneProps as SceneProps, RocketProgress } from "./premium-gift-rocket-progress";
import { PremiumRocketArt } from "./premium-gift-rocket-art";
import { RocketGlow } from "./premium-gift-rocket-environment";
import { rocketBezier, rocketFlight, ROCKET_COLORS as C, type RocketLayout } from "./premium-gift-rocket-model";

import { RocketEngine } from "./premium-gift-rocket-engine";
import { RocketOrbits } from "./premium-gift-rocket-orbits";
import { RocketSpeedLayers } from "./premium-gift-rocket-speed";
import { rocketExhaustPlan } from "./premium-gift-rocket-energy-model";

export function RocketFlight({ bounds, layout, progress, quality, reducedMotion }: SceneProps & { layout: RocketLayout }) {
  const path = useMemo(() => rocketFlight(layout), [layout]);
  const travelX = progress.interpolate({ inputRange: path.times, outputRange: path.x, extrapolate: "clamp" });
  const travelY = progress.interpolate({ inputRange: path.times, outputRange: path.y, extrapolate: "clamp" });
  const tilt = progress.interpolate({ inputRange: path.times, outputRange: path.bank.map((angle) => `${angle}deg`), extrapolate: "clamp" });
  const bank = progress.interpolate({ inputRange: [0, .067, .135, .183, .2, .215, .23, .245, .25, 1], outputRange: ["-8deg", "-8deg", "3deg", "0deg", "-.5deg", ".5deg", "-.5deg", ".5deg", "0deg", "0deg"], extrapolate: "clamp" });
  const materialX = progress.interpolate({ inputRange: [0, .067, .183, 1], outputRange: [layout.core.x - layout.start.x, layout.core.x - layout.start.x, 0, 0], extrapolate: "clamp" });
  const materialY = progress.interpolate({ inputRange: [0, .067, .183, 1], outputRange: [layout.core.y - layout.start.y, layout.core.y - layout.start.y, 0, 0], extrapolate: "clamp" });
  const ignitionShake = progress.interpolate({ inputRange: [0, .167, .18, .192, .204, .216, .228, .24, .25, 1], outputRange: [0, 0, -1.6, 1.6, -1.6, 1.6, -1.2, 1.2, 0, 0], extrapolate: "clamp" });
  const boostShake = progress.interpolate({ inputRange: [0, .417, .424, .431, .438, .445, .452, 1], outputRange: [0, 0, -1.7, 1.7, -1.2, 1.2, 0, 0], extrapolate: "clamp" });
  const scale = progress.interpolate({ inputRange: [0, .067, .15, .183, .417, .47, .54, .565, 1], outputRange: [.2, .2, 1.08, 1, 1, 1.08, .65, .25, .25], extrapolate: "clamp" });
  const opacity = progress.interpolate({ inputRange: [0, .067, .13, .56, .58, 1], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: "clamp" });
  const shortY = progress.interpolate({ inputRange: [0, .25, .48, 1], outputRange: [0, 0, -layout.size * .25, -layout.size * .25], extrapolate: "clamp" });
  const width = layout.size * .64;
  return <>
    {!reducedMotion ? <RocketSpeedLayers bounds={bounds} progress={progress} quality={quality} /> : null}
    {!reducedMotion ? <RocketTrail layout={layout} progress={progress} quality={quality} /> : null}
    <Animated.View style={{ position: "absolute", left: (reducedMotion ? layout.core.x : layout.start.x) - width / 2, top: (reducedMotion ? layout.core.y : layout.start.y) - layout.size / 2, width, height: layout.size, opacity,
      transform: reducedMotion ? [{ translateY: shortY }, { scale: .85 }] : [{ translateX: Animated.add(Animated.add(travelX, materialX), Animated.add(ignitionShake, boostShake)) }, { translateY: Animated.add(travelY, materialY) }, { rotate: tilt }, { rotate: bank }, { scale }] }}>
      <Animated.View style={{ position: "absolute", left: -layout.size * .42, top: -layout.size * .17, opacity: .7 }}><RocketGlow color={C.cyan} size={layout.size * 1.5} /></Animated.View>
      {!reducedMotion ? <><RocketOrbits size={layout.size} progress={progress} side="back" /><RocketEngine size={layout.size} progress={progress} /></> : null}
      <PremiumRocketArt height={layout.size} />
      <Animated.View style={{ position: "absolute", left: width / 2 - layout.size * .18, top: layout.size * .66, opacity: opacity }}><RocketGlow color={C.cyan} size={layout.size * .36} white /></Animated.View>
      {!reducedMotion ? <RocketOrbits size={layout.size} progress={progress} side="front" /> : null}
    </Animated.View>

  </>;
}

function RocketTrail({ layout, progress, quality }: { layout: RocketLayout; progress: RocketProgress; quality: SceneProps["quality"] }) {
  const plan = useMemo(() => rocketExhaustPlan(quality), [quality]);
  return <>{plan.map((group, index) => {
    const { fraction, velocity, lifetime } = group;
    const time = .25 + fraction * (.567 - .25);
    const point = rocketBezier(layout, fraction ** 1.8);
    const size = layout.size * (.3 + fraction * .25);
    const opacity = progress.interpolate({ inputRange: [0, time, time + .035, time + lifetime * .55, time + lifetime, 1], outputRange: [0, 0, .7, .25, 0, 0], extrapolate: "clamp" });
    const drift = progress.interpolate({ inputRange: [0, time, time + lifetime, 1], outputRange: [0, 0, size * velocity * 1.8, size * velocity * 1.8], extrapolate: "clamp" });
    const scale = progress.interpolate({ inputRange: [0, time, time + lifetime, 1], outputRange: [.35, .35, 1.6, 1.6], extrapolate: "clamp" });
    return <Animated.View key={index} style={{ position: "absolute", left: point.x - size / 2, top: point.y + layout.size * .24, opacity, transform: [{ translateX: Animated.multiply(drift, -.3) }, { translateY: drift }, { scale }, { rotate: `${group.rotation}deg` }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100"><Defs><RadialGradient id={`smoke-rocket-${index}`}><Stop stopColor="#C1D4EA" stopOpacity=".14" /><Stop offset="1" stopColor={C.violet} stopOpacity="0" /></RadialGradient></Defs><Circle cx="50" cy="50" r="45" fill={`url(#smoke-rocket-${index})`} /><Path d={group.fill} fill={index % 2 ? C.gold : C.cyan} stroke={C.gold} strokeWidth="4" opacity=".15" /><Path d={group.fill} fill={index % 2 ? C.gold : C.cyan} /><Path d={group.sparks} fill="none" stroke={index % 2 ? C.orange : C.gold} strokeWidth="1.6" /></Svg>
    </Animated.View>;
  })}</>;
}

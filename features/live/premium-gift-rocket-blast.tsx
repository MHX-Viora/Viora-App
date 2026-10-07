import type { RocketProgress } from "./premium-gift-rocket-progress";
import { Animated } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { RocketGlow, RocketElectricArcs } from "./premium-gift-rocket-environment";
import { ROCKET_BLAST_TIMELINE as T } from "./premium-gift-rocket-energy-model";
import { ROCKET_COLORS as C } from "./premium-gift-rocket-model";

export function RocketBlastLayers({ point, radius, progress, reducedMotion }: { point: { x: number; y: number }; radius: number; progress: RocketProgress; reducedMotion: boolean }) {
  return <>
    <Animated.View style={{ position: "absolute", left: point.x - radius * .23, top: point.y - radius * .23, opacity: progress.interpolate({ inputRange: [0, T.arrival, T.arrival + .004, T.burst, T.burst + .015, 1], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: "clamp" }), transform: [{ scale: progress.interpolate({ inputRange: [0, T.arrival, T.burst, 1], outputRange: [.1, .1, 1, 1], extrapolate: "clamp" }) }] }}><RocketGlow color={C.gold} size={radius * .46} white /></Animated.View>
    {!reducedMotion ? <Animated.View style={{ position: "absolute", left: point.x - radius * 1.3, top: point.y - radius * 1.3,
      opacity: progress.interpolate({ inputRange: [0, T.hot, T.hot + .012, T.hot + .06, T.hot + .12, 1], outputRange: [0, 0, .95, .65, 0, 0], extrapolate: "clamp" }),
      transform: [{ scale: progress.interpolate({ inputRange: [0, T.hot, T.hot + .04, T.hot + .12, 1], outputRange: [.04, .04, 1, 1.15, 1.15], extrapolate: "clamp" }) }] }}>
      <Svg width={radius * 2.6} height={radius * 2.6} viewBox="-100 -100 200 200"><Defs><RadialGradient id="rocketHotRays"><Stop stopColor={C.white} /><Stop offset=".25" stopColor="#FFF4B0" /><Stop offset=".6" stopColor={C.gold} stopOpacity=".85" /><Stop offset="1" stopColor={C.orange} stopOpacity="0" /></RadialGradient></Defs><Path d={Array.from({ length: 24 }, (_, ray) => {
        const angle = ray * Math.PI / 12; const length = 65 + ray * 17 % 30;
        return `M${Math.cos(angle) * 5} ${Math.sin(angle) * 5} L${Math.cos(angle - .026) * length} ${Math.sin(angle - .026) * length} L${Math.cos(angle + .026) * length} ${Math.sin(angle + .026) * length}Z`;
      }).join(" ")} fill="url(#rocketHotRays)" /></Svg>
    </Animated.View> : null}
    {[C.gold, C.pink, C.cyan].map((color, index) => {
      const at = [T.hot, T.energy, T.shock][index];
      const opacity = progress.interpolate({ inputRange: [0, at, at + .015, at + .08, T.afterglow, 1], outputRange: [0, 0, reducedMotion ? .3 : .85 - index * .15, .42, .2, 0], extrapolate: "clamp" });
      const size = radius * (index === 0 ? 2.1 : 2.4);
      const scale = progress.interpolate({ inputRange: [0, at, at + .09, .90, 1], outputRange: [.06, .06, 1, 1.05, 1.05], extrapolate: "clamp" });
      return <Animated.View key={color} style={{ position: "absolute", left: point.x - size / 2, top: point.y - size / 2, opacity, transform: [{ scale }] }}>
        <Svg width={size} height={size} viewBox="-100 -100 200 200"><Defs><RadialGradient id={`rocketBlast-${index}`}><Stop stopColor={index === 0 ? C.white : color} stopOpacity=".9" /><Stop offset=".15" stopColor={index === 0 ? "#FFF4B0" : color} stopOpacity=".8" /><Stop offset=".4" stopColor={index === 0 ? C.orange : color} stopOpacity=".3" /><Stop offset="1" stopColor={color} stopOpacity="0" /></RadialGradient></Defs><Circle cx="0" cy="0" r="99" fill={`url(#rocketBlast-${index})`} />
          {!reducedMotion ? <Path d={Array.from({ length: index === 0 ? 24 : 16 }, (_, ray) => {
            const angle = ray * Math.PI * 2 / (index === 0 ? 24 : 16) + index * .14;
            const length = 57 + (ray * 13) % 36;
            return `M${Math.cos(angle) * 9} ${Math.sin(angle) * 9} L${Math.cos(angle - .012) * length} ${Math.sin(angle - .012) * length} L${Math.cos(angle + .012) * length} ${Math.sin(angle + .012) * length}Z`;
          }).join(" ")} fill={`url(#rocketBlast-${index})`} opacity=".8" /> : null}
        </Svg>
      </Animated.View>;
    })}
    <Animated.View style={{ position: "absolute", left: point.x - radius * .2, top: point.y - radius * .2, opacity: progress.interpolate({ inputRange: [0, T.hot, T.hot + .012, T.hot + .065, T.hot + .12, 1], outputRange: [0, 0, reducedMotion ? .2 : .95, .6, 0, 0], extrapolate: "clamp" }) }}><RocketGlow color={C.gold} size={radius * .4} white /></Animated.View>
    {!reducedMotion ? <RocketElectricArcs point={point} size={radius * 1.3} progress={progress} at={T.burst} /> : null}
  </>;
}

export function RocketBoostWaves({ point, size, progress }: { point: { x: number; y: number }; size: number; progress: RocketProgress }) {
  return <>
    <RocketElectricArcs point={point} size={size * 2} progress={progress} at={.417} />
    {[C.gold, C.cyan, C.pink].map((color, index) => {
      const at = .417 + index * .012;
      const opacity = progress.interpolate({ inputRange: [0, at, at + .008, at + .065, 1], outputRange: [0, 0, .9, 0, 0], extrapolate: "clamp" });
      const expand = progress.interpolate({ inputRange: [0, at, at + .065, 1], outputRange: [.2, .2, 2.5, 2.5], extrapolate: "clamp" });
      return <Animated.View key={color} style={{ position: "absolute", left: point.x - size / 2, top: point.y - size / 2, opacity, transform: [{ scale: expand }] }}><Svg width={size} height={size} viewBox="0 0 100 100"><Circle cx="50" cy="50" r="33" fill="none" stroke={color} strokeWidth="6" opacity=".13" /><Circle cx="50" cy="50" r="33" fill="none" stroke={index === 0 ? "#FFF4B0" : color} strokeWidth="1.2" /></Svg></Animated.View>;
    })}
  </>;
}

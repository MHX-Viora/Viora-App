import { useMemo } from "react";
import { Animated } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import type { RocketSceneProps as SceneProps, RocketProgress } from "./premium-gift-rocket-progress";
import { RocketGlow } from "./premium-gift-rocket-environment";
import { rocketBezier, rocketBurstPaths, rocketParticlePlan, ROCKET_COLORS as C, type RocketLayout } from "./premium-gift-rocket-model";

import { RocketBlastLayers, RocketBoostWaves } from "./premium-gift-rocket-blast";
import { ROCKET_BLAST_TIMELINE as T } from "./premium-gift-rocket-energy-model";

export function RocketFinale({ layout, progress, quality, reducedMotion }: SceneProps & { layout: RocketLayout }) {
  const plan = useMemo(() => rocketParticlePlan(quality), [quality]);
  const burstPaths = useMemo(() => plan.bursts.map((group) => rocketBurstPaths(group.points)), [plan]);
  const radius = layout.burstRadius * (reducedMotion ? .55 : 1);
  const end = reducedMotion ? { x: layout.core.x, y: layout.core.y - layout.size * .25 } : layout.end;
  return <>
    <RocketBlastLayers point={end} radius={radius} progress={progress} reducedMotion={reducedMotion} />
    <RocketPulse at={T.burst} point={end} progress={progress} radius={radius} color={C.gold} gentle={reducedMotion} />
    <Animated.View style={{ position: "absolute", left: end.x - radius, top: end.y - radius, opacity: progress.interpolate({ inputRange: [0, T.energy, T.energy + .018, .72, .875, 1], outputRange: [0, 0, .6, .4, .2, 0], extrapolate: "clamp" }), transform: [{ scale: progress.interpolate({ inputRange: [0, .567, .7, 1], outputRange: [.12, .12, 1, 1.3], extrapolate: "clamp" }) }] }}><RocketGlow size={radius * 2} color={C.violet} white /></Animated.View>
    {!reducedMotion ? <>
      {[C.cyan, C.pink, C.gold].map((color, index) => <Animated.View key={color} style={{ position: "absolute", left: end.x - radius, top: end.y - radius, opacity: progress.interpolate({ inputRange: [0, T.shock, .70, .875, 1], outputRange: [0, 0, .72, .35, 0], extrapolate: "clamp" }), transform: [{ scale: progress.interpolate({ inputRange: [0, T.shock, .73, 1], outputRange: [.1, .1, 1, 1.1], extrapolate: "clamp" }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${index % 2 ? -240 : 240}deg`] }) }] }}>
        <Svg width={radius * 2} height={radius * 2} viewBox="0 0 200 200"><Circle cx="100" cy="100" r={78 - index * 15} stroke={color} strokeWidth="5" fill="none" opacity=".1" /><Circle cx="100" cy="100" r={78 - index * 15} stroke={color} strokeWidth="1.5" strokeDasharray={`${26 + index * 9} 14 5 10`} fill="none" /><Ellipse cx="100" cy="100" rx="90" ry={38 + index * 12} stroke={color} strokeWidth=".8" fill="none" />{Array.from({ length: 8 }, (_, dot) => <Circle key={dot} cx={100 + Math.cos(dot * Math.PI / 4) * (78 - index * 15)} cy={100 + Math.sin(dot * Math.PI / 4) * (78 - index * 15)} r="2" fill={C.white} />)}</Svg>
      </Animated.View>)}
      {plan.bursts.map((group, index) => {
        const at = T.stars + group.delay;
        const opacity = progress.interpolate({ inputRange: [0, at, at + .028, .79 + group.delay, Math.min(.99, .91 + group.delay), 1], outputRange: [0, 0, 1, .65, 0, 0], extrapolate: "clamp" });
        const expand = progress.interpolate({ inputRange: [0, at, at + .08, .88, 1], outputRange: [.03, .03, .72, 1.12, 1.15], extrapolate: "clamp" });
        const fall = progress.interpolate({ inputRange: [0, .7, .85, 1], outputRange: [0, 0, radius * .2, radius * .48], extrapolate: "clamp" });
        return <Animated.View key={index} style={{ position: "absolute", left: end.x - radius, top: end.y - radius, opacity, transform: [{ translateY: fall }, { scale: expand }, { rotate: `${index * 7}deg` }] }}>
          <Svg width={radius * 2} height={radius * 2} viewBox="-100 -100 200 200"><Path d={burstPaths[index].filled} fill={group.color} stroke={group.color} strokeWidth="3" opacity=".15" /><Path d={burstPaths[index].filled} fill={group.color} /><Path d={burstPaths[index].streaks} fill="none" stroke={group.color} strokeWidth="4" opacity=".15" /><Path d={burstPaths[index].streaks} fill="none" stroke={group.color} strokeWidth="1.3" strokeLinecap="round" /></Svg>
        </Animated.View>;
      })}
      {plan.comets.slice(0, 7).map((comet, index) => {
        const at = T.comets + comet.delay;
        const duration = .07;
        const fly = progress.interpolate({ inputRange: [0, at, at + duration, 1], outputRange: [0, 0, 1, 1], extrapolate: "clamp" });
        const opacity = progress.interpolate({ inputRange: [0, at, at + .015, at + duration, at + duration + .01, 1], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: "clamp" });
        const sparks = progress.interpolate({ inputRange: [0, at + duration, at + duration + .025, .95, 1], outputRange: [0, 0, 1, 0, 0], extrapolate: "clamp" });
        const spread = progress.interpolate({ inputRange: [0, at + duration, .94, 1], outputRange: [.1, .1, 1.4, 1.4], extrapolate: "clamp" });
        return <Animated.View key={index} style={{ position: "absolute", left: end.x - 30, top: end.y - 30, transform: [{ translateX: Animated.multiply(fly, comet.x * radius) }, { translateY: Animated.multiply(fly, comet.y * radius) }] }}>
          <Animated.View style={{ opacity, transform: [{ rotate: `${comet.angle}deg` }] }}><Svg width={60} height={60} viewBox="0 0 60 60"><Path d="M4 30 L30 28" stroke={comet.color} strokeWidth="7" opacity=".17" /><Path d="M6 30 L30 30" stroke={C.orange} strokeWidth="2" /><Circle cx="30" cy="30" r="5" fill={C.gold} opacity=".28" /><Circle cx="30" cy="30" r="2.6" fill="#FFF4B0" /></Svg></Animated.View>
          <Animated.View style={{ position: "absolute", opacity: sparks, transform: [{ scale: spread }] }}><Svg width={60} height={60} viewBox="-30 -30 60 60"><Path d={Array.from({ length: 10 }, (_, dot) => {
            const angle = dot * Math.PI / 5;
            return `M${Math.cos(angle) * 10} ${Math.sin(angle) * 10} L${Math.cos(angle) * 23} ${Math.sin(angle) * 23}`;
          }).join(" ")} fill="none" stroke={comet.color} strokeWidth="1.5" /></Svg></Animated.View>
        </Animated.View>;
      })}
    </> : null}
  </>;
}

export function RocketBoost({layout,progress,reducedMotion}:SceneProps&{layout:RocketLayout}) {
  const boostT = ((.417 - .25) / (.567 - .25)) ** 1.8;
  const boostCenter = rocketBezier(layout, boostT);
  const boostAhead = rocketBezier(layout, boostT + .001);
  const boostBank = Math.atan2(boostAhead.x - boostCenter.x, boostCenter.y - boostAhead.y);
  const boostPoint = { x: boostCenter.x - Math.sin(boostBank) * layout.size * .32, y: boostCenter.y + Math.cos(boostBank) * layout.size * .32 };
  if(reducedMotion)return null;
  return <><RocketBoostWaves point={boostPoint} size={layout.size} progress={progress} /><RocketPulse at={.417} point={boostPoint} progress={progress} radius={layout.size*.6} color={C.gold} /></>;
}

function RocketPulse({ point, progress, radius, at, color, gentle = false }: { point: { x: number; y: number }; progress: RocketProgress; radius: number; at: number; color: string; gentle?: boolean }) {
  const opacity = progress.interpolate({ inputRange: [0, at, at + .009, at + .016, at + .021, 1], outputRange: [0, 0, gentle ? .25 : .9, .1, 0, 0], extrapolate: "clamp" });
  const ringOpacity = progress.interpolate({ inputRange: [0, at, at + .02, at + .16, 1], outputRange: [0, 0, .85, 0, 0], extrapolate: "clamp" });
  const expand = progress.interpolate({ inputRange: [0, at, at + .16, 1], outputRange: [.05, .05, 1.3, 1.3], extrapolate: "clamp" });
  return <>
    <Animated.View style={{ position: "absolute", left: point.x - radius, top: point.y - radius, opacity }}><RocketGlow size={radius * 2} color={color} white /></Animated.View>
    <Animated.View style={{ position: "absolute", left: point.x - radius, top: point.y - radius, opacity: ringOpacity, transform: [{ scale: expand }] }}><Svg width={radius * 2} height={radius * 2} viewBox="0 0 100 100"><Circle cx="50" cy="50" r="35" fill="none" stroke={C.cyan} strokeWidth="4" opacity=".14" /><Circle cx="50" cy="50" r="35" fill="none" stroke={color} strokeWidth="1.2" /></Svg></Animated.View>
  </>;
}

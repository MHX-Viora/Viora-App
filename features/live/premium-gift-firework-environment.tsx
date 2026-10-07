import { memo, useMemo } from "react";
import { Animated, StyleSheet } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { normalizeInputRange, type CinematicBounds, type CinematicQuality } from "./premium-gift-cinematic";
import { fireworkRocketPoint, type FireworkBurstPlan } from "./premium-gift-firework-model";
import { FireworkRocketEmbers } from "./premium-gift-firework-particles";

type LayerProps = {
  bounds: CinematicBounds;
  progress: Animated.Value;
  quality: CinematicQuality;
  reducedMotion: boolean;
  show: readonly FireworkBurstPlan[];
};

export const FireworkAtmosphereLayer = memo(function FireworkAtmosphereLayer({ progress }: LayerProps) {
  const veil = progress.interpolate({
    inputRange: [0, 0.08, 0.18, 0.91, 1],
    outputRange: [0, 0.08, 0.12, 0.04, 0],
    extrapolate: "clamp",
  });
  return <>
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.atmosphere, { opacity: veil }]}>
      <Svg height="100%" width="100%"><Defs><LinearGradient id="fireworkNight" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#071426" stopOpacity="0.72" /><Stop offset="0.58" stopColor="#0B1930" stopOpacity="0.3" /><Stop offset="1" stopColor="#13253A" stopOpacity="0" /></LinearGradient></Defs><Rect fill="url(#fireworkNight)" height="100%" width="100%" /></Svg>
    </Animated.View>
  </>;
});

export const FireworkProjectileLayer = memo(function FireworkProjectileLayer({ bounds, progress, quality, reducedMotion, show }: LayerProps) {
  if (reducedMotion) return null;
  return <>{show.map((burst, index) => <Animated.View key={burst.role} style={StyleSheet.absoluteFillObject}>
    <FireworkRocketEmbers bounds={bounds} burst={burst} count={burst.role === "main" ? quality === "low" ? 12 : 22 : quality === "low" ? 4 : 6} progress={progress} />
    <Projectile bounds={bounds} burst={burst} index={index} progress={progress} />
  </Animated.View>)}</>;
});

function Projectile({ bounds, burst, index, progress }: {
  bounds: CinematicBounds;
  burst: FireworkBurstPlan;
  index: number;
  progress: Animated.Value;
}) {
  const targetX = bounds.width * burst.x;
  const targetY = bounds.height * burst.y;
  const launch = fireworkRocketPoint(burst, 0);
  const launchX = bounds.width * launch.x;
  const launchY = bounds.height * launch.y;
  const mid = Number(((burst.launchAt + burst.arrivalAt) / 2).toFixed(4));
  const range = normalizeInputRange(`firework-projectile-${burst.role}`, [0, burst.launchAt, mid, burst.arrivalAt, burst.pauseAt, burst.coreAt, 1]);
  const opacity = burst.role === "main"
    ? progress.interpolate({ inputRange: [0, 0.02, 0.045, 0.065, burst.launchAt, mid, burst.arrivalAt, burst.coreAt, 1], outputRange: [0, 0.45, 0.18, 0.75, 0.9, 1, 1, 0, 0], extrapolate: "clamp" })
    : progress.interpolate({ inputRange: range, outputRange: [0, 0, 1, 1, 1, 0, 0], extrapolate: "clamp" });
  const trajectory = useMemo(() => {
    const points = Array.from({ length: 13 }, (_, i) => fireworkRocketPoint(burst, i / 12));
    return {
      time: [0, ...points.map((_, i) => burst.launchAt + i / 12 * (burst.arrivalAt - burst.launchAt)), 1],
      x: [0, ...points.map((point) => point.x * bounds.width - launchX), targetX - launchX],
      y: [0, ...points.map((point) => point.y * bounds.height - launchY), targetY - launchY],
    };
  }, [bounds, burst, launchX, launchY, targetX, targetY]);
  const translateX = progress.interpolate({ inputRange: trajectory.time, outputRange: trajectory.x, extrapolate: "clamp" });
  const translateY = progress.interpolate({ inputRange: trajectory.time, outputRange: trajectory.y, extrapolate: "clamp" });
  const trailScale = progress.interpolate({ inputRange: range, outputRange: [0.3, 0.3, 0.62, 1, 0.28, 0.12, 0.12], extrapolate: "clamp" });
  return <Animated.View style={[styles.projectile, {
    left: launchX - 18,
    opacity,
    top: launchY - 18,
    transform: [{ translateX }, { translateY }, { scale: trailScale }],
  }]}>
    <Svg height={36} viewBox="0 0 36 36" width={36}><Defs>
      <RadialGradient id={`projectileCore-${index}`}><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.28" stopColor="#FFF7D4" /><Stop offset="0.7" stopColor="#E8B764" stopOpacity="0.52" /><Stop offset="1" stopColor="#E8B764" stopOpacity="0" /></RadialGradient>
    </Defs>
      <Circle cx="18" cy="18" fill={`url(#projectileCore-${index})`} r={18} />
      <Circle cx="18" cy="18" fill="#FFFFFF" r={2.4} />
    </Svg>
  </Animated.View>;
}

export const FireworkLightingLayer = memo(function FireworkLightingLayer({ bounds, progress, quality, reducedMotion, show }: LayerProps) {
  if (reducedMotion) return null;
  return <>{show.map((burst, index) => {
    const hero = burst.role === "hero";
    const size = Math.min(bounds.width * (hero ? 0.74 : 0.48), hero ? 430 : 300);
    const decay = Number(Math.min(0.995, burst.burstAt + 0.13).toFixed(6));
    const opacity = progress.interpolate({
    inputRange: normalizeInputRange(`firework-light-${burst.role}`, [0, burst.coreAt, burst.burstAt, Number((burst.burstAt + 0.018).toFixed(6)), decay, 1]),
      outputRange: [0, 0, quality === "low" ? 0.2 : burst.role === "main" ? 0.72 : 0.4, 0.18, 0, 0],
      extrapolate: "clamp",
    });
    return <Animated.View key={burst.role} style={[styles.light, { height: size, left: bounds.width * burst.x - size / 2, opacity, top: bounds.height * burst.y - size / 2, width: size }]}>
      <Svg height="100%" viewBox="0 0 100 100" width="100%"><Defs><RadialGradient id={`fireworkLight-${index}`}><Stop offset="0" stopColor="#FFFDF3" stopOpacity="0.8" /><Stop offset="0.2" stopColor={burst.palette[1]} stopOpacity="0.36" /><Stop offset="1" stopColor={burst.palette[2]} stopOpacity="0" /></RadialGradient></Defs><Circle cx="50" cy="50" fill={`url(#fireworkLight-${index})`} r="50" /></Svg>
    </Animated.View>;
  })}</>;
});

export const FireworkSmokeLayer = memo(function FireworkSmokeLayer({ bounds, progress, quality, reducedMotion, show }: LayerProps) {
  if (reducedMotion || quality === "low") return null;
  return <>{show.map((burst, index) => {
    const size = Math.min(bounds.width * (burst.role === "hero" ? 0.34 : 0.24), 220);
    const end = Number(Math.min(0.998, burst.burstAt + (burst.role === "hero" ? 0.075 : 0.12)).toFixed(6));
    const range = normalizeInputRange(`firework-smoke-${burst.role}`, [0, burst.burstAt, Number(Math.min(end, burst.burstAt + 0.035).toFixed(6)), end, 1]);
    const opacity = progress.interpolate({ inputRange: range, outputRange: [0, 0, 0.18, 0, 0], extrapolate: "clamp" });
    const scale = progress.interpolate({ inputRange: range, outputRange: [0.54, 0.54, 0.82, 1.35, 1.35], extrapolate: "clamp" });
    const drift = progress.interpolate({ inputRange: range, outputRange: [0, 0, 0, index % 2 ? 18 : -16, index % 2 ? 18 : -16], extrapolate: "clamp" });
    return <Animated.View key={burst.role} style={[styles.smoke, { height: size, left: bounds.width * burst.x - size / 2, opacity, top: bounds.height * burst.y - size / 2, transform: [{ translateX: drift }, { scale }], width: size }]}>
      <Svg height="100%" viewBox="0 0 100 100" width="100%"><Defs><RadialGradient id={`smoke-${index}`}><Stop offset="0" stopColor="#B7C1CC" stopOpacity="0.26" /><Stop offset="0.45" stopColor="#758496" stopOpacity="0.14" /><Stop offset="1" stopColor="#38485D" stopOpacity="0" /></RadialGradient></Defs><Ellipse cx="46" cy="52" fill={`url(#smoke-${index})`} rx="43" ry="31" /><Ellipse cx="66" cy="43" fill={`url(#smoke-${index})`} rx="26" ry="22" /></Svg>
    </Animated.View>;
  })}</>;
});

const styles = StyleSheet.create({
  atmosphere: { zIndex: 0 },
  light: { position: "absolute", zIndex: 1 },
  projectile: { height: 36, position: "absolute", width: 36, zIndex: 3 },
  smoke: { position: "absolute", zIndex: 2 },
});

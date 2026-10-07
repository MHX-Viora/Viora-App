import { memo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

import { UserAvatar } from "@/components/common/user-avatar";
import { normalizeInputRange, type CinematicBounds, type CinematicQuality } from "./premium-gift-cinematic";
import type { PremiumGiftEffect } from "./premium-gift-effect-model";
import { fireworkBurstRadius, type FireworkBurstPlan } from "./premium-gift-firework-model";
import { FireworkGoldenRain, FireworkMovingSparks } from "./premium-gift-firework-particles";

type LayerProps = {
  bounds: CinematicBounds;
  progress: Animated.Value;
  quality: CinematicQuality;
  reducedMotion: boolean;
  show: readonly FireworkBurstPlan[];
};

export const FireworkExplosionLayer = memo(function FireworkExplosionLayer(props: LayerProps) {
  const { bounds, progress, reducedMotion, show } = props;
  if (reducedMotion) return <StaticFireworkShow bounds={bounds} progress={progress} />;
  return <>{show.map((burst, index) => <FireworkExplosion bounds={bounds} burst={burst} index={index} key={burst.role} progress={progress} />)}</>;
});

function FireworkExplosion({ bounds, burst, index, progress }: {
  bounds: CinematicBounds;
  burst: FireworkBurstPlan;
  index: number;
  progress: Animated.Value;
}) {
  const hero = burst.role === "hero";
  const radius = fireworkBurstRadius(bounds, burst);
  const size = radius * 2;
  const coreEnd = Number((burst.burstAt + 0.04).toFixed(6));
  const coreRange = normalizeInputRange(`firework-core-${burst.role}`, [0, burst.coreAt, burst.burstAt, coreEnd, 1]);
  const coreOpacity = progress.interpolate({ inputRange: coreRange, outputRange: [0, 0, 1, 0, 0], extrapolate: "clamp" });
  const coreScale = progress.interpolate({ inputRange: coreRange, outputRange: [0.08, 0.08, 1.45, 1.9, 1.9], extrapolate: "clamp" });
  return <>
    <Animated.View style={[styles.burst, { height: size * 0.72, left: bounds.width * burst.x - size * 0.36, opacity: coreOpacity, top: bounds.height * burst.y - size * 0.36, transform: [{ scale: coreScale }], width: size * 0.72 }]}>
      <Svg height="100%" viewBox="0 0 100 100" width="100%"><Defs><RadialGradient id={`fireworkCore-${index}`}><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.18" stopColor="#FFFCEB" stopOpacity="0.98" /><Stop offset="0.52" stopColor={burst.palette[1]} stopOpacity="0.62" /><Stop offset="1" stopColor={burst.palette[1]} stopOpacity="0" /></RadialGradient></Defs><Circle cx="50" cy="50" fill={`url(#fireworkCore-${index})`} r="49" /></Svg>
    </Animated.View>
    <FireworkMovingSparks bounds={bounds} burst={burst} progress={progress} />
    {hero ? <HeroShockwave bounds={bounds} burst={burst} progress={progress} radius={radius} /> : null}
  </>;
}

function HeroShockwave({ bounds, burst, progress, radius }: { bounds: CinematicBounds; burst: FireworkBurstPlan; progress: Animated.Value; radius: number }) {
  const range = normalizeInputRange("firework-hero-shockwave", [0, burst.burstAt, Math.min(0.97, burst.burstAt + 0.1), Math.min(0.99, burst.burstAt + 0.15), 1]);
  const opacity = progress.interpolate({ inputRange: range, outputRange: [0, 0, 0.48, 0, 0], extrapolate: "clamp" });
  const scale = progress.interpolate({ inputRange: range, outputRange: [0.15, 0.15, 1.1, 1.55, 1.55], extrapolate: "clamp" });
  return <Animated.View style={[styles.burst, { height: radius * 2.1, left: bounds.width * burst.x - radius * 1.05, opacity, top: bounds.height * burst.y - radius * 1.05, transform: [{ scale }], width: radius * 2.1 }]}>
    <Svg height="100%" viewBox="0 0 100 100" width="100%"><Defs><RadialGradient id="heroShockwave"><Stop offset="0" stopColor="#FFF8DB" stopOpacity="0" /><Stop offset="0.56" stopColor="#F6D797" stopOpacity="0.12" /><Stop offset="0.78" stopColor="#FFF4D1" stopOpacity="0.42" /><Stop offset="1" stopColor="#FFF4D1" stopOpacity="0" /></RadialGradient></Defs><Circle cx="50" cy="50" fill="url(#heroShockwave)" r="49" /></Svg>
  </Animated.View>;
}

export const FireworkForegroundLayer = memo(function FireworkForegroundLayer({ bounds, progress, quality, reducedMotion }: LayerProps) {
  if (reducedMotion) return null;
  return <FireworkGoldenRain bounds={bounds} count={quality === "low" ? 8 : 24} progress={progress} />;
});

export const FireworkRecognitionLayer = memo(function FireworkRecognitionLayer({ bounds, effect, progress, reducedMotion = false }: {
  bounds: CinematicBounds;
  effect: PremiumGiftEffect;
  progress: Animated.Value;
  reducedMotion?: boolean;
}) {
  const opacity = progress.interpolate({ inputRange: [0, 0.28, 0.34, 0.91, 1], outputRange: [0, 0, 1, 1, 0], extrapolate: "clamp" });
  const rise = progress.interpolate({ inputRange: [0, 0.28, 0.34, 1], outputRange: [14, 14, 0, 0], extrapolate: "clamp" });
  return <Animated.View accessible accessibilityLabel={`${effect.senderName} đã gửi Pháo Hoa ×${effect.quantity}`} style={[styles.recognition, { opacity, top: Math.min(bounds.height * 0.61, bounds.height - 100), transform: reducedMotion ? [] : [{ translateY: rise }] }]}>
    <UserAvatar displayName={effect.senderName} imageUrl={effect.senderAvatarUrl} size={32} />
    <View style={styles.senderText}>
      <Text numberOfLines={1} style={styles.name}>{effect.senderName}</Text>
      <Text style={styles.detail}>đã gửi Pháo Hoa <Text style={styles.combo}>×{effect.quantity}</Text></Text>
    </View>
  </Animated.View>;
});

function innerBurstPath(seed: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399963 + seed * 0.09;
    const inner = 7 + index % 3;
    const outer = 20 + index % 5 * 2;
    return `M ${100 + Math.cos(angle) * inner} ${100 + Math.sin(angle) * inner} Q ${100 + Math.cos(angle + 0.06) * (outer * 0.65)} ${100 + Math.sin(angle + 0.06) * (outer * 0.65)} ${100 + Math.cos(angle) * outer} ${100 + Math.sin(angle) * outer}`;
  }).join(" ");
}

function StaticFireworkShow({ bounds, progress }: { bounds: CinematicBounds; progress: Animated.Value }) {
  const opacity = progress.interpolate({ inputRange: [0, 0.08, 0.86, 1], outputRange: [0, 1, 1, 0], extrapolate: "clamp" });
  const size = Math.min(bounds.width * 0.58, bounds.height * 0.35, 260);
  return <Animated.View style={[styles.burst, { height: size, left: bounds.width * 0.5 - size / 2, opacity, top: bounds.height * 0.27 - size / 2, width: size }]}>
    <Svg height="100%" viewBox="0 0 200 200" width="100%"><Defs><RadialGradient id="staticFireworkV4"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.2" stopColor="#F5D99C" stopOpacity="0.82" /><Stop offset="1" stopColor="#D7B06C" stopOpacity="0" /></RadialGradient></Defs><Circle cx="100" cy="100" fill="url(#staticFireworkV4)" r="90" /><Path d={innerBurstPath(17, 18)} fill="none" stroke="#FFF2C8" strokeLinecap="round" strokeWidth="1.6" /></Svg>
  </Animated.View>;
}

const styles = StyleSheet.create({
  burst: { position: "absolute", zIndex: 4 },
  recognition: { alignItems: "center", alignSelf: "center", flexDirection: "row", gap: 10, maxWidth: "86%", position: "absolute", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: "rgba(18,15,12,0.72)", borderColor: "rgba(239,199,122,0.3)", borderWidth: 1, zIndex: 8 },
  senderText: { flexShrink: 1 },
  name: { color: "#FFF9EC", fontSize: 14, fontWeight: "600", lineHeight: 19 },
  detail: { color: "#F3DDAF", fontSize: 12, lineHeight: 18 },
  combo: { color: "#FFF2CE", fontWeight: "700" },
});

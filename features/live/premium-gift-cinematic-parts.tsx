import { memo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { bannerOriginForBounds, type CinematicBounds, type CinematicQuality } from "./premium-gift-cinematic";
import { CinematicCrownArt, CinematicRocketArt } from "./premium-gift-cinematic-art";
import type { PremiumGiftEffect } from "./premium-gift-effect-model";

type SceneProps = { bounds: CinematicBounds; effect: PremiumGiftEffect; progress: Animated.Value; quality: CinematicQuality; reducedMotion: boolean };
export type { SceneProps };

const stageOpacity = (progress: Animated.Value) => progress.interpolate({
  inputRange: [0, 0.035, 0.16, 0.79, 1], outputRange: [0, 0.8, 1, 0.8, 0], extrapolate: "clamp",
});

export const CinematicAtmosphere = memo(function CinematicAtmosphere({ progress, color, centerY = "38%", quality, reducedMotion }: {
  progress: Animated.Value; color: string; centerY?: string; quality: CinematicQuality; reducedMotion: boolean;
}) {
  const opacity = stageOpacity(progress);
  return <>
    <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: quality === "ultra" || quality === "high" ? "rgba(5,8,20,0.14)" : "rgba(5,8,20,0.12)", opacity }]} />
    {!reducedMotion ? <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: progress.interpolate({
      inputRange: [0, 0.12, 0.35, 0.77, 1], outputRange: [0, 0.18, 0.42, 0.3, 0], extrapolate: "clamp",
    }) }]}>
      <Svg height="100%" width="100%"><Defs><RadialGradient id="sceneAmbient" cx="50%" cy={centerY} rx="52%" ry="44%">
        <Stop offset="0%" stopColor={color} stopOpacity="0.65" /><Stop offset="50%" stopColor={color} stopOpacity="0.18" /><Stop offset="100%" stopColor={color} stopOpacity="0" />
      </RadialGradient></Defs><Rect fill="url(#sceneAmbient)" height="100%" width="100%" /></Svg>
    </Animated.View> : null}
  </>;
});

export const CinematicGiftMorph = memo(function CinematicGiftMorph({ bounds, effect, progress, reducedMotion, target }: SceneProps & {
  target: { x: number; y: number };
}) {
  if (reducedMotion) return null;
  const origin = bannerOriginForBounds(bounds, effect.bannerOrigin);
  const size = Math.min(bounds.width * 0.14, 60);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.11, 0.21, 0.33, 1], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: "clamp",
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.07, 0.18, 0.31, 1], outputRange: [0, 0, dx * 0.38, dx, dx], extrapolate: "clamp",
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.07, 0.18, 0.31, 1], outputRange: [0, 0, dy * 0.26 - 22, dy, dy], extrapolate: "clamp",
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.07, 0.2, 0.31, 1], outputRange: [0.85, 0.85, 1.18, 1.7, 1.7], extrapolate: "clamp",
  });
  return <Animated.View style={[styles.morph, { height: size, left: origin.x - size / 2, opacity, top: origin.y - size / 2,
    transform: [{ translateX }, { translateY }, { scale }] }]}>
    <Svg height="170%" style={styles.morphHalo} width="170%"><Defs><RadialGradient id="morphLight"><Stop offset="0" stopColor="#FFF8DC" stopOpacity="0.9" /><Stop offset="0.38" stopColor="#EAC677" stopOpacity="0.45" /><Stop offset="1" stopColor="#EAC677" stopOpacity="0" /></RadialGradient></Defs><Circle cx="50%" cy="50%" fill="url(#morphLight)" r="50%" /></Svg>
    {effect.effectType === 3 ? <View style={{ alignItems: "center", justifyContent: "center", height: size, width: size }}><CinematicCrownArt width={size * 0.88} /></View>
      : effect.effectType === 2 ? <View style={{ alignItems: "center", justifyContent: "center", height: size, width: size }}><CinematicRocketArt width={size * 0.48} /></View>
        : <Svg height={size} viewBox="0 0 60 60" width={size}><Defs><RadialGradient id="morphSpark"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.2" stopColor="#FFF4CF" /><Stop offset="0.56" stopColor="#EBC68C" stopOpacity="0.58" /><Stop offset="1" stopColor="#EBC68C" stopOpacity="0" /></RadialGradient></Defs><Circle cx="30" cy="30" fill="url(#morphSpark)" r="29" /><Circle cx="30" cy="30" fill="#FFFFFF" r="3" /></Svg>}
  </Animated.View>;
});

const LABELS = { 1: "SENT FIREWORKS", 2: "LAUNCHED A ROCKET", 3: "ROYAL GIFT" } as const;

export const CinematicRecognition = memo(function CinematicRecognition({ bounds, effect, progress, reducedMotion, accent }: SceneProps & { accent: string }) {
  const opacity = reducedMotion ? progress.interpolate({
    inputRange: [0, 0.06, 0.79, 1], outputRange: [0, 1, 1, 0], extrapolate: "clamp",
  }) : progress.interpolate({
    inputRange: [0, 0.48, 0.58, 0.78, 0.94, 1], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: "clamp",
  });
  const rise = progress.interpolate({ inputRange: [0, 0.49, 0.61, 1], outputRange: [14, 14, 0, 0], extrapolate: "clamp" });
  const sweep = progress.interpolate({
    inputRange: [0, 0.59, 0.72, 1], outputRange: [-190, -190, 190, 190], extrapolate: "clamp",
  });
  return <Animated.View style={[styles.recognition, { opacity, top: Math.min(bounds.height * 0.52, bounds.height - 112), transform: reducedMotion ? [] : [{ translateY: rise }] }]}>
    <Svg height={90} pointerEvents="none" style={styles.captionContrast} width="100%"><Defs><RadialGradient id="captionContrast"><Stop offset="0" stopColor="#07101A" stopOpacity="0.62" /><Stop offset="0.55" stopColor="#07101A" stopOpacity="0.26" /><Stop offset="1" stopColor="#07101A" stopOpacity="0" /></RadialGradient></Defs><Rect fill="url(#captionContrast)" height="100%" width="100%" /></Svg>
    <View style={styles.recognitionRule} />
    <View style={styles.nameClip}>
      <Text numberOfLines={1} style={[styles.name, bounds.width < 600 && styles.compactName]}>{effect.senderName.toLocaleUpperCase()}</Text>
      {!reducedMotion ? <Animated.View style={[styles.nameSweep, { transform: [{ translateX: sweep }, { rotate: "-18deg" }] }]}>
        <Svg height="100%" width="100%"><Defs><RadialGradient id="nameSweep"><Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.63" /><Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></RadialGradient></Defs><Rect fill="url(#nameSweep)" height="100%" width="100%" /></Svg>
      </Animated.View> : null}
    </View>
    <Text numberOfLines={1} style={[styles.recognitionDetail, { color: accent }]}>{LABELS[effect.effectType]}</Text>
  </Animated.View>;
});

const styles = StyleSheet.create({
  morph: { position: "absolute", zIndex: 3 },
  morphHalo: { left: "-35%", position: "absolute", top: "-35%" },
  recognition: { alignItems: "center", left: "7%", position: "absolute", right: "7%", zIndex: 4 },
  captionContrast: { left: 0, position: "absolute", top: -12 },
  recognitionRule: { backgroundColor: "rgba(255,239,197,0.72)", height: 1, marginBottom: 8, width: 34 },
  nameClip: { alignItems: "center", maxWidth: "100%", overflow: "hidden" },
  name: { color: "#FFF9EC", fontSize: 23, fontWeight: "700", letterSpacing: 3, lineHeight: 27, textAlign: "center", textShadowColor: "rgba(12,12,25,0.8)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  compactName: { fontSize: 17, letterSpacing: 2.1, lineHeight: 22 },
  nameSweep: { bottom: 0, left: "50%", position: "absolute", top: 0, width: 74 },
  recognitionDetail: { fontSize: 10, fontWeight: "600", letterSpacing: 2.4, marginTop: 5, textAlign: "center", textShadowColor: "rgba(8,8,15,0.85)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
});

import { memo, type ReactNode } from "react";
import { Animated, StyleSheet } from "react-native";

import {
  cinematicCameraKeyframes,
  type CinematicBounds,
  type CinematicQuality,
} from "./premium-gift-cinematic";
import type { PremiumGiftEffectType } from "./premium-gift-effect-model";

export const PremiumGiftVirtualCamera = memo(function PremiumGiftVirtualCamera({
  children,
  effectType,
  progress,
  reducedMotion,
}: {
  bounds: CinematicBounds;
  children: ReactNode;
  effectType: PremiumGiftEffectType;
  progress: Animated.Value;
  quality: CinematicQuality;
  reducedMotion: boolean;
}) {
  const camera = cinematicCameraKeyframes(effectType);
  const transform = reducedMotion ? [] : [
    { translateX: progress.interpolate({ inputRange: camera.inputRange, outputRange: camera.translateX, extrapolate: "clamp" }) },
    { translateY: progress.interpolate({ inputRange: camera.inputRange, outputRange: camera.translateY, extrapolate: "clamp" }) },
    { scale: progress.interpolate({ inputRange: camera.inputRange, outputRange: camera.scale, extrapolate: "clamp" }) },
  ];

  return <Animated.View pointerEvents="none" style={[styles.camera, { transform }]}>
    {children}
  </Animated.View>;
});

const styles = StyleSheet.create({
  camera: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});

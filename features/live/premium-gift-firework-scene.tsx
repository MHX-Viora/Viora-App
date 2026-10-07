import { memo } from "react";
import { StyleSheet, View } from "react-native";

import type { SceneProps } from "./premium-gift-cinematic-parts";
import { FireworksRenderer } from "./fireworks-renderer";
import { FireworksCaption } from "./fireworks-caption";

export const CinematicFireworkEffect = memo(function CinematicFireworkEffect(props: SceneProps) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFillObject}>
    <FireworksRenderer {...props} />
    <FireworksCaption {...props} />
  </View>;
});

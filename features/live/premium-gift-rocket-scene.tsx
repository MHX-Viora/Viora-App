import { memo, type ComponentType } from "react";
import { StyleSheet, View } from "react-native";
import type { SceneProps } from "./premium-gift-cinematic-parts";
import { RocketOrbitalEnvironment } from "./rocket-orbital-environment";
import { RocketOrbitalHero } from "./rocket-orbital-hero";
import { RocketSenderHero } from "./rocket-sender-hero";

export const RocketCinematicScene = memo(function RocketCinematicScene(props: SceneProps & { journeyRenderer?: ComponentType<SceneProps> }) {
  const Environment = props.journeyRenderer ?? RocketOrbitalEnvironment;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFillObject}>
    <Environment {...props} />
    <RocketOrbitalHero {...props} />
    <RocketSenderHero {...props} />
  </View>;
});

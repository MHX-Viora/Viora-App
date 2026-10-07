import type { Animated } from "react-native";
import type { SceneProps } from "./premium-gift-cinematic-parts";
export type RocketProgress=Animated.Value|Animated.AnimatedInterpolation<number>;
export type RocketSceneProps=Omit<SceneProps,"progress">&{progress:RocketProgress};

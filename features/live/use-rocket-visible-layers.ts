import { useEffect, useState } from "react";
import { Animated, Platform } from "react-native";
import { rocketVisibleLayers } from "./rocket-visible-layers";

export function useRocketVisibleLayers(progress: Animated.Value) {
  const initial = () => Platform.OS === "web" ? rocketVisibleLayers((progress as unknown as { __getValue(): number }).__getValue()) : 31;
  const [layers, setLayers] = useState(initial);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    let previous = initial(); setLayers(previous);
    const listener = progress.addListener(({ value }) => {
      const next = rocketVisibleLayers(value);
      // React updates only when a phase boundary changes, never each frame.
      if (next !== previous) { previous = next; setLayers(next); }
    });
    return () => progress.removeListener(listener);
  }, [progress]);
  return layers;
}

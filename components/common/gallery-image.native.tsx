import { useState } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { AdaptiveMediaImage } from "./adaptive-media-image";
import type { GalleryImageProps } from "./gallery-image";

/** Paging is suspended for the duration of a pinch and while the image remains zoomed. */
export function GalleryImage({ uri, label, onZoomChange, scrollGesture }: GalleryImageProps) {
  const [zoomed, setZoomed] = useState(false);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const reportZoom = (value: boolean) => { setZoomed(value); onZoomChange?.(value); };
  const pinch = Gesture.Pinch()
    .blocksExternalGesture(...(scrollGesture ? [scrollGesture] : []))
    .onStart(() => { startScale.value = scale.value; runOnJS(reportZoom)(true); })
    .onUpdate(event => { scale.value = Math.min(4, Math.max(1, startScale.value * event.scale)); })
    .onFinalize(() => {
      if (scale.value <= 1.01) {
        scale.value = withTiming(1); x.value = withTiming(0); y.value = withTiming(0);
        runOnJS(reportZoom)(false);
      } else {
        const maxX = width.value * (scale.value - 1) / 2;
        const maxY = height.value * (scale.value - 1) / 2;
        x.value = withTiming(Math.max(-maxX, Math.min(maxX, x.value)));
        y.value = withTiming(Math.max(-maxY, Math.min(maxY, y.value)));
        runOnJS(reportZoom)(true);
      }
    });
  const pan = Gesture.Pan().enabled(zoomed).maxPointers(1)
    .onStart(() => { startX.value = x.value; startY.value = y.value; })
    .onUpdate(event => {
      const maxX = width.value * (scale.value - 1) / 2;
      const maxY = height.value * (scale.value - 1) / 2;
      x.value = Math.max(-maxX, Math.min(maxX, startX.value + event.translationX));
      y.value = Math.max(-maxY, Math.min(maxY, startY.value + event.translationY));
    });
  const transform = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));
  return <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
    <Animated.View style={styles.frame} onLayout={event => {
      width.value = event.nativeEvent.layout.width; height.value = event.nativeEvent.layout.height;
    }}>
      <Animated.View style={[styles.frame, transform]}>
        <AdaptiveMediaImage accessibilityLabel={label} source={{ uri }} letterboxBackground={false} style={styles.frame} />
      </Animated.View>
    </Animated.View>
  </GestureDetector>;
}

const styles = StyleSheet.create({ frame: { flex: 1, width: "100%", backgroundColor: "transparent" } });

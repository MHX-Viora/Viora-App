import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { GalleryImage } from "./gallery-image";

type Props = { images: string[]; initialIndex: number; onClose: () => void };

export function ImageGalleryViewer({ images, initialIndex, onClose }: Props) {
  const { theme } = useTheme();
  const firstIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
  const [activeIndex, setActiveIndex] = useState(firstIndex);
  const [zoomed, setZoomed] = useState(false);
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<string>>(null);
  const scrollGesture = useMemo(() => Gesture.Native(), []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowLeft", "ArrowRight", "Escape"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") onClose();
      else setActiveIndex(index => Math.max(0, Math.min(images.length - 1, index + (event.key === "ArrowRight" ? 1 : -1))));
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [images.length, onClose]);

  useEffect(() => {
    if (Platform.OS !== "web") list.current?.scrollToIndex({ index: activeIndex, animated: false });
    // Reposition the current page when rotating the device.
  }, [width, activeIndex]);

  if (images.length === 0) return null;
  return <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.colors.visuals.rgb_0_0_0_0_94 }]}>
      <SafeAreaView style={styles.root}>
        <View style={styles.toolbar}>
          <Text accessibilityLiveRegion="polite" style={[styles.counter, { color: theme.colors.white }]}>{activeIndex + 1} / {images.length}</Text>
          <Pressable accessibilityLabel="Đóng ảnh" accessibilityRole="button" hitSlop={10} onPress={onClose}
            style={[styles.button, { backgroundColor: theme.colors.visuals.rgb_255_255_255_0_14 }]}>
            <Ionicons name="close" color={theme.colors.white} size={28} />
          </Pressable>
        </View>
        <View style={styles.content}>
          {Platform.OS === "web" ? <GalleryImage key={activeIndex} uri={images[activeIndex]} label={`Ảnh ${activeIndex + 1} / ${images.length}`} /> : <GestureDetector gesture={scrollGesture}><FlatList
            ref={list} data={images} horizontal pagingEnabled scrollEnabled={!zoomed}
            disableIntervalMomentum decelerationRate="fast" snapToInterval={width}
            initialScrollIndex={firstIndex} getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            keyExtractor={(uri, index) => `${index}-${uri}`} showsHorizontalScrollIndicator={false}
            initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3}
            onMomentumScrollEnd={event => {
              setActiveIndex(Math.max(0, Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
              setZoomed(false);
            }}
            renderItem={({ item, index }) => <View style={{ width, flex: 1 }}>
              <GalleryImage uri={item} label={`Ảnh ${index + 1} / ${images.length}`} scrollGesture={scrollGesture} onZoomChange={index === activeIndex ? setZoomed : undefined} />
            </View>}
          /></GestureDetector>}
          {Platform.OS === "web" && images.length > 1 ? <>
            <Pressable accessibilityLabel="Ảnh trước" accessibilityRole="button" disabled={activeIndex === 0}
              onPress={() => setActiveIndex(index => Math.max(0, index - 1))}
              style={[styles.arrow, styles.left, { backgroundColor: theme.colors.visuals.rgb_0_0_0_0_54 }, activeIndex === 0 && styles.disabled]}>
              <Ionicons name="chevron-back" color={theme.colors.white} size={32} />
            </Pressable>
            <Pressable accessibilityLabel="Ảnh tiếp theo" accessibilityRole="button" disabled={activeIndex === images.length - 1}
              onPress={() => setActiveIndex(index => Math.min(images.length - 1, index + 1))}
              style={[styles.arrow, styles.right, { backgroundColor: theme.colors.visuals.rgb_0_0_0_0_54 }, activeIndex === images.length - 1 && styles.disabled]}>
              <Ionicons name="chevron-forward" color={theme.colors.white} size={32} />
            </Pressable>
          </> : null}
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { flex: 1, overflow: "hidden" },
  toolbar: { minHeight: 64, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  counter: { fontSize: 16, fontWeight: "700" },
  button: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  arrow: { position: "absolute", top: "45%", width: 48, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  left: { left: 12 }, right: { right: 12 }, disabled: { opacity: 0.25 },
});

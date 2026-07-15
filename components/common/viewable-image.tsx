import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, type ImageProps } from "expo-image";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

type ViewableImageProps = Omit<ImageProps, "style"> & {
  style: StyleProp<ViewStyle>;
};

export function ViewableImage({
  accessibilityLabel = "Ảnh",
  contentFit = "cover",
  source,
  style,
  ...imageProps
}: ViewableImageProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityLabel={`${accessibilityLabel}. Nhấn để xem ảnh`}
        accessibilityRole="imagebutton"
        onPress={() => setVisible(true)}
        style={[style, styles.previewWrap]}
      >
        <Image
          accessibilityLabel={accessibilityLabel}
          contentFit={contentFit}
          source={source}
          style={StyleSheet.absoluteFill}
          {...imageProps}
        />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <SafeAreaView style={styles.viewer}>
          <Pressable
            accessibilityLabel="Đóng ảnh"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setVisible(false)}
            style={styles.closeButton}
          >
            <Ionicons color={colors.white} name="close" size={28} />
          </Pressable>
          <Image
            accessibilityLabel={accessibilityLabel}
            contentFit="contain"
            source={source}
            style={styles.fullImage}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    top: spacing.xl,
    width: 40,
    zIndex: 2,
  },
  fullImage: { flex: 1, width: "100%" },
  previewWrap: { overflow: "hidden" },
  viewer: {
    backgroundColor: "rgba(0,0,0,0.94)",
    flex: 1,
  },
});

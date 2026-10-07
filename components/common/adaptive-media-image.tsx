import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, type ImageProps } from "expo-image";
import { memo, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { hasLetterbox, mediaHeight } from "./adaptive-media-model";

type Props = Omit<ImageProps, "style" | "contentFit"> & {
  style?: StyleProp<ViewStyle>;
  naturalSize?: boolean;
  maxHeight?: number;
};

/** Key the loading state to the source so recycled cells never retain old dimensions/errors. */
export const AdaptiveMediaImage = memo(function AdaptiveMediaImage(props: Props) {
  return <MediaLayers key={JSON.stringify(props.source)} {...props} />;
});

function MediaLayers({ source, style, naturalSize = false, maxHeight,
  accessibilityLabel = "Ảnh", onLoad, onError, ...imageProps }: Props) {
  const { theme } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ratio, setRatio] = useState(1);
  const missingSource = !source || (typeof source === "string" && !source.trim()) ||
    (typeof source === "object" && "uri" in source && !source.uri?.trim());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(missingSource ? "error" : "loading");
  const letterbox = status === "ready" && hasLetterbox(size.width, size.height, ratio);

  return <View
    onLayout={({ nativeEvent: { layout } }) => setSize(current =>
      current.width === layout.width && current.height === layout.height ? current : layout)}
    style={[styles.frame, { backgroundColor: theme.colors.secondaryBackground }, style,
      naturalSize && { height: mediaHeight(size.width || 240, ratio, maxHeight) }]}
  >
    {letterbox ? <>
      <Image source={source} contentFit="cover" blurRadius={25} cachePolicy="memory-disk"
        accessible={false} pointerEvents="none" transition={0}
        style={[StyleSheet.absoluteFill, styles.background]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill,
        { backgroundColor: theme.isDark ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.06)" }]} />
    </> : null}
    {status === "error" ? <View accessibilityRole="text" style={styles.placeholder}>
      <Ionicons name="image-outline" size={28} color={theme.colors.textMuted} />
      <Text style={{ color: theme.colors.textMuted }}>Ảnh không tải được</Text>
    </View> : <Image {...imageProps} source={source} accessibilityLabel={accessibilityLabel}
      contentFit="contain" cachePolicy="memory-disk" transition={180}
      style={StyleSheet.absoluteFill}
      onLoad={event => {
        if (event.source.width > 0 && event.source.height > 0) {
          setRatio(event.source.width / event.source.height);
        }
        setStatus("ready");
        onLoad?.(event);
      }}
      onError={event => { setStatus("error"); onError?.(event); }}
    />}
    {status === "loading" ? <View pointerEvents="none" accessibilityLabel="Đang tải ảnh"
      style={[styles.placeholder, { backgroundColor: theme.colors.secondaryBackground }]}>
      <Ionicons name="image-outline" size={28} color={theme.colors.textMuted} />
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", position: "relative", width: "100%" },
  // Overscan beyond the blur radius prevents transparent edges in small gallery cells.
  background: { top: -32, bottom: -32, left: -32, right: -32, transform: [{ scale: 1.08 }] },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 8 },
});

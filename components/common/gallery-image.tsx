import { StyleSheet } from "react-native";
import type { GestureType } from "react-native-gesture-handler";
import { AdaptiveMediaImage } from "./adaptive-media-image";

export type GalleryImageProps = {
  uri: string;
  label: string;
  onZoomChange?: (zoomed: boolean) => void;
  scrollGesture?: GestureType;
};

export function GalleryImage({ uri, label }: GalleryImageProps) {
  return <AdaptiveMediaImage accessibilityLabel={label} source={{ uri }} letterboxBackground={false} style={styles.image} />;
}

const styles = StyleSheet.create({ image: { flex: 1, width: "100%", backgroundColor: "transparent" } });

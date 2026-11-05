import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { AdaptiveMediaImage } from "@/components/common/adaptive-media-image";
import { ImageGalleryViewer } from "@/components/common/image-gallery-viewer";
import { getPostImageTiles, postImagePreviewUrl } from "@/features/feed/post-images";
import { useTheme } from "@/theme";

type Props = {
  images: string[];
  previews?: string[];
  author: string;
  maxHeight: number;
  style?: StyleProp<ViewStyle>;
  singleImageStyle?: StyleProp<ViewStyle>;
};

export function PostImageGallery({ images, previews, author, maxHeight, style, singleImageStyle }: Props) {
  const { theme } = useTheme();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const single = images.length === 1;
  return <>
    <View style={[styles.grid, style]}>
      {getPostImageTiles(images.length, "feed").map(({ index, wide, overlayCount }) => <Pressable
        accessibilityLabel={`Ảnh ${index + 1} trong bài viết của ${author}${overlayCount ? `. Xem ${overlayCount} ảnh từ vị trí này` : ""}`}
        accessibilityRole="button" key={`${index}-${images[index]}`}
        onPress={event => { event.stopPropagation(); setViewerIndex(index); }}
        style={[styles.tile, wide && styles.wide, single && styles.single, single && singleImageStyle]}
      >
        <AdaptiveMediaImage accessibilityLabel={`Ảnh ${index + 1}`} source={{ uri: previews?.[index] || postImagePreviewUrl(images[index]) }}
          naturalSize={single && !singleImageStyle} maxHeight={maxHeight}
          style={single && !singleImageStyle ? undefined : StyleSheet.absoluteFill} />
        {overlayCount > 0 ? <View pointerEvents="none" style={[styles.overlay, { backgroundColor: theme.colors.visuals.rgb_0_0_0_0_54 }]}>
          <Text style={[styles.overlayText, { color: theme.colors.white }]}>+{overlayCount}</Text>
        </View> : null}
      </Pressable>)}
    </View>
    {viewerIndex !== null ? <ImageGalleryViewer images={images} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} /> : null}
  </>;
}

const styles = StyleSheet.create({
  grid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 2 },
  tile: { flexBasis: "45%", flexGrow: 1, height: 180, overflow: "hidden" },
  wide: { flexBasis: "100%", width: "100%" }, single: { height: undefined },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  overlayText: { fontSize: 36, fontWeight: "800" },
});

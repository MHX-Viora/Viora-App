import { Image, type ImageProps } from "expo-image";
import { useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { DEFAULT_LIVE_COVER, LIVE_COVER_ASPECT_RATIO } from "./live-cover";
import { liveCoverSourceKey, normalizeLiveCoverSource } from "./live-cover-source";

type Props = {
  source?: ImageProps["source"];
  fallbackSource?: ImageProps["source"];
  aspectRatio?: number;
  borderRadius?: number;
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
};

export function LiveCoverImage({ source, fallbackSource, aspectRatio = LIVE_COVER_ASPECT_RATIO, borderRadius = 0, overlay, style, fill = false }: Props) {
  const sources = [source, fallbackSource, DEFAULT_LIVE_COVER].map(normalizeLiveCoverSource).filter(value => value !== undefined);
  // A new selection remounts only the image layers, so old request errors cannot replace its preview.
  const sourceKey = JSON.stringify(sources.map(liveCoverSourceKey));
  return <View pointerEvents="none" style={[styles.frame, fill ? StyleSheet.absoluteFillObject : { aspectRatio }, { borderRadius }, style]}>
    <CoverLayers key={sourceKey} sources={sources} />
    {overlay}
  </View>;
}

function CoverLayers({ sources }: { sources: ImageProps["source"][] }) {
  const [index, setIndex] = useState(0);
  const source = sources[index];
  return <>
    <Image accessible={false} blurRadius={28} cachePolicy="memory-disk" contentFit="cover" source={source} style={styles.blurredBackdrop} transition={0} />
    <View style={styles.backdropTint} />
    <Image accessibilityLabel="Ảnh bìa Live" cachePolicy="memory-disk" contentFit="contain" source={source} style={StyleSheet.absoluteFillObject} transition={0}
      onError={() => setIndex(current => current === index ? Math.min(current + 1, sources.length - 1) : current)} />
  </>;
}

const styles = StyleSheet.create({
  frame: { backgroundColor: "#091725", overflow: "hidden", width: "100%" },
  backdropTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5, 12, 24, 0.18)" },
  blurredBackdrop: { ...StyleSheet.absoluteFillObject, opacity: 0.65, transform: [{ scale: 1.08 }] },
});

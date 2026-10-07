import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { UserAvatar } from "@/components/common/user-avatar";
import type { LiveStreamPreview } from "./live-stream-model";

export function LiveCreatorAvatar({
  stream,
  size,
  style,
}: {
  stream: LiveStreamPreview;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (!stream.avatarSource) {
    return <UserAvatar displayName={stream.creator} imageUrl={stream.avatarUrl} size={size} style={style} />;
  }

  return <View accessibilityLabel={`Ảnh đại diện của ${stream.creator}`} accessibilityRole="image" style={[{ borderRadius: size / 2, height: size, overflow: "hidden", width: size }, style]}>
    <Image contentFit="cover" source={stream.avatarSource} style={StyleSheet.absoluteFillObject} />
  </View>;
}

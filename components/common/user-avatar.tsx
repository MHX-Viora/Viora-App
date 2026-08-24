import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { type ThemeColors, useTheme } from "@/theme";
import { getAvatarInitial } from "@/utils/avatar";

type UserAvatarProps = {
  displayName?: string | null;
  imageUrl?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function UserAvatar({
  displayName,
  imageUrl,
  size,
  style,
  textStyle,
}: UserAvatarProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors, size), [size, theme.colors]);
  const normalizedImageUrl = imageUrl?.trim() ?? "";
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const shouldShowImage = Boolean(
    normalizedImageUrl && normalizedImageUrl !== failedImageUrl,
  );
  const accessibleName = displayName?.trim() || "người dùng";

  return (
    <View
      accessibilityLabel={`Ảnh đại diện của ${accessibleName}`}
      accessibilityRole="image"
      style={[styles.container, style]}
    >
      <Text style={[styles.initial, textStyle]}>{getAvatarInitial(displayName)}</Text>
      {shouldShowImage ? (
        <Image
          contentFit="cover"
          onError={() => setFailedImageUrl(normalizedImageUrl)}
          source={{ uri: normalizedImageUrl }}
          style={styles.image}
        />
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors, size: number) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: size / 2,
      height: size,
      justifyContent: "center",
      width: size,
    },
    image: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: size / 2,
    },
    initial: {
      color: colors.primary,
      fontSize: Math.max(12, Math.round(size * 0.38)),
      fontWeight: "800",
      lineHeight: Math.max(14, Math.round(size * 0.44)),
      textAlign: "center",
    },
  });

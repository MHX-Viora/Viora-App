import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { getFeedDownloadPromoLayout } from "@/components/layout/responsive-layout";
import { useResponsive } from "@/hooks/use-responsive";
import { layout, spacing, type AppTheme, useTheme } from "@/theme";

const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.ankt.app";

const mosaicIcons = ["images", "play", "people", "newspaper"] as const;

export function DesktopDownloadPromo() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isDesktopWeb, width } = useResponsive();
  const desktopLayout = getFeedDownloadPromoLayout({
    feedMaxWidth: layout.feedMaxWidth,
    isDesktopWeb,
    pageGutter: layout.pageGutter,
    viewportWidth: width,
  });

  if (!desktopLayout) return null;

  const openGooglePlay = () => void Linking.openURL(GOOGLE_PLAY_URL);

  return (
    <View
      accessibilityLabel="Khám phá thêm nội dung trên ứng dụng ANKT"
      style={[
        styles.card,
        { right: desktopLayout.right, width: desktopLayout.width },
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.mosaic}
      >
        {mosaicIcons.map((icon, index) => (
          <View key={icon} style={[styles.tile, index % 2 === 1 && styles.tileOffset]}>
            <Ionicons color={theme.colors.primary} name={icon} size={22} />
          </View>
        ))}
      </View>
      <View style={styles.shade} />

      <View style={styles.content}>
        <Text style={styles.title}>Khám phá thêm nội dung trên ứng dụng ANKT</Text>
        <Text style={styles.description}>
          Trải nghiệm mượt mà hơn với nhiều tính năng hấp dẫn
        </Text>
        <Pressable
          accessibilityHint="Mở trang ANKT trên Google Play"
          accessibilityLabel="Tải ANKT trên Google Play"
          accessibilityRole="link"
          onPress={openGooglePlay}
          style={({ pressed }) => [
            styles.downloadButton,
            pressed && styles.downloadButtonPressed,
          ]}
        >
          <Ionicons
            color={theme.colors.primaryContrast}
            name="logo-google-playstore"
            size={25}
          />
          <Text numberOfLines={1} style={styles.downloadText}>
            Tải ngay trên Google Play
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      minHeight: 240,
      overflow: "hidden",
      padding: spacing.lg,
      position: "absolute",
      top: spacing.lg,
    },
    content: { flex: 1, justifyContent: "space-between", zIndex: 2 },
    description: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 235,
    },
    downloadButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 48,
      paddingHorizontal: spacing.md,
    },
    downloadButtonPressed: { opacity: 0.76 },
    downloadText: {
      color: theme.colors.primaryContrast,
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "900",
    },
    mosaic: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      opacity: 0.38,
      position: "absolute",
      right: -24,
      top: -18,
      transform: [{ rotate: "8deg" }],
      width: 142,
    },
    shade: {
      backgroundColor: theme.colors.surface,
      bottom: 0,
      left: 0,
      opacity: 0.64,
      position: "absolute",
      right: 58,
      top: 0,
    },
    tile: {
      alignItems: "center",
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.borderSubtle,
      borderRadius: 10,
      borderWidth: 1,
      height: 58,
      justifyContent: "center",
      width: 58,
    },
    tileOffset: { transform: [{ translateY: 18 }] },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: "900",
      lineHeight: 27,
      maxWidth: 230,
    },
  });

import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { getFeedCategorySidebarLayout } from "@/components/layout/responsive-layout";
import { useResponsive } from "@/hooks/use-responsive";
import { layout, spacing, type ThemeColors, useTheme } from "@/theme";

export type FeedCategory = "community" | "reels" | "articles";

export function FeedCategoryHeader({
  activeCategory,
  onArticlesPress,
  onCommunityPress,
  onReelsPress,
}: {
  activeCategory: FeedCategory;
  onArticlesPress: () => void;
  onCommunityPress: () => void;
  onReelsPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDesktopWeb, width } = useResponsive();
  const desktopLayout = getFeedCategorySidebarLayout({
    feedMaxWidth: layout.feedMaxWidth,
    isDesktopWeb,
    pageGutter: layout.pageGutter,
    viewportWidth: width,
  });
  const usesDesktopSideRails = desktopLayout !== null;
  const items = [
    {
      active: activeCategory === "community",
      icon: "people-outline" as const,
      label: "Cộng đồng",
      onPress: onCommunityPress,
    },
    {
      active: activeCategory === "reels",
      icon: "play-circle-outline" as const,
      label: "Video ngắn",
      onPress: onReelsPress,
    },
    {
      active: activeCategory === "articles",
      icon: "newspaper-outline" as const,
      label: "Báo",
      onPress: onArticlesPress,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        usesDesktopSideRails && styles.desktopContainer,
        desktopLayout,
        Platform.OS !== "web" && styles.nativeContainer,
      ]}
    >
      {items.map((item) => (
        <Pressable
          accessibilityLabel={item.label}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.active }}
          key={item.label}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.item,
            usesDesktopSideRails && styles.desktopItem,
            item.active && styles.activeItem,
            item.active && usesDesktopSideRails && styles.desktopActiveItem,
            pressed && styles.pressedItem,
          ]}
        >
          <Ionicons
            color={item.active ? colors.primary : colors.textMuted}
            name={item.icon}
            size={24}
            style={[styles.icon, usesDesktopSideRails && styles.desktopIcon]}
          />
          {usesDesktopSideRails ? <Text style={styles.label}>{item.label}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    activeItem: { borderBottomColor: colors.primary },
    container: {
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      height: 50,
      paddingHorizontal: spacing.sm,
    },
    desktopActiveItem: {
      backgroundColor: colors.primarySoft,
      borderBottomColor: "transparent",
    },
    desktopContainer: {
      backgroundColor: "transparent",
      borderBottomWidth: 0,
      flexDirection: "column",
      gap: spacing.xs,
      height: "auto",
      paddingHorizontal: 0,
      position: "absolute",
      top: spacing.lg,
    },
    desktopIcon: { transform: [] },
    desktopItem: {
      borderBottomWidth: 0,
      borderRadius: 8,
      flex: undefined,
      flexDirection: "row",
      gap: spacing.md,
      justifyContent: "flex-start",
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingTop: 0,
      width: "100%",
    },
    icon: { transform: [{ translateY: 5 }] },
    item: {
      alignItems: "center",
      borderBottomColor: "transparent",
      borderBottomWidth: 2,
      flex: 1,
      justifyContent: "center",
      paddingTop: spacing.md,
    },
    label: {
      color: colors.text,
      flexShrink: 1,
      fontSize: 15,
      fontWeight: "700",
    },
    nativeContainer: { height: 55, paddingTop: 5 },
    pressedItem: { opacity: 0.68 },
  });

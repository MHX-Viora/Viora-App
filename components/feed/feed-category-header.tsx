import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { getFeedCategorySidebarLayout } from "@/components/layout/responsive-layout";
import { useResponsive } from "@/hooks/use-responsive";
import { layout, spacing, type ThemeColors, useTheme } from "@/theme";

export type FeedCategory = "community" | "reels" | "articles" | "live";

export function FeedCategoryHeader({
  activeCategory,
  onArticlesPress,
  onCommunityPress,
  onLivePress,
  onReelsPress,
}: {
  activeCategory: FeedCategory;
  onArticlesPress: () => void;
  onCommunityPress: () => void;
  onLivePress: () => void;
  onReelsPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors, theme.isDark), [colors, theme.isDark]);
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
      icon: "people" as const,
      color: "#1971C2", darkColor: "#74C0FC",
      label: "Cộng đồng",
      onPress: onCommunityPress,
    },
    {
      active: activeCategory === "reels",
      icon: "play-circle" as const,
      color: "#7048E8", darkColor: "#B197FC",
      label: "Video ngắn",
      onPress: onReelsPress,
    },
    {
      active: activeCategory === "articles",
      icon: "newspaper" as const,
      color: "#D9480F", darkColor: "#FFA94D",
      label: "Báo",
      onPress: onArticlesPress,
    },
    {
      active: activeCategory === "live",
      icon: "radio" as const,
      color: "#D6336C", darkColor: "#FF7096",
      label: "Live",
      onPress: onLivePress,
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
            color={theme.isDark ? item.darkColor : item.color}
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

const createStyles = (colors: ThemeColors, isDark: boolean) =>
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
      backgroundColor: isDark ? "transparent" : "#FFFFFF",
      borderColor: colors.borderSubtle,
      borderWidth: isDark ? 0 : 1,
      borderBottomWidth: isDark ? 0 : 1,
      borderRadius: 16,
      flexDirection: "column",
      gap: spacing.xs,
      height: "auto",
      paddingHorizontal: isDark ? 0 : spacing.sm,
      paddingVertical: isDark ? 0 : spacing.sm,
      position: "absolute",
      top: spacing.lg,
      ...(!isDark && Platform.OS === "web" ? { boxShadow: "0 4px 16px rgba(16, 24, 40, 0.06)" } : {}),
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

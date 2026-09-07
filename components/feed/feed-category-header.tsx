import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { spacing, type ThemeColors, useTheme } from "@/theme";

export type FeedCategory = "community" | "articles";

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
  const items = [
    {
      active: activeCategory === "community",
      icon: "people-outline" as const,
      label: "Cộng đồng",
      onPress: onCommunityPress,
    },
    {
      active: false,
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
            item.active && styles.activeItem,
            pressed && styles.pressedItem,
          ]}
        >
          <Ionicons
            color={item.active ? colors.primary : colors.textMuted}
            name={item.icon}
            size={24}
          />
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
    item: {
      alignItems: "center",
      borderBottomColor: "transparent",
      borderBottomWidth: 2,
      flex: 1,
      justifyContent: "center",
    },
    nativeContainer: { height: 55, paddingTop: 5 },
    pressedItem: { opacity: 0.68 },
  });

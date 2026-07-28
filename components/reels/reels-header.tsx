import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import type { ReelSort } from "@/types/reel";
import { type ThemeColors, useTheme } from "@/theme";


const REELS_HEADER_HEIGHT = 90;
const REELS_HEADER_PADDING_TOP = 40;

const SORT_TABS: { label: string; value: ReelSort }[] = [
  { label: "Bạn bè", value: "friends" },
  { label: "Theo dõi", value: "following" },
  { label: "Đề xuất", value: "popular" },
];

export function ReelsHeader({
  activeSort,
  onCreatePress,
  onSearchPress,
  onSortChange,
}: {
  activeSort: ReelSort;
  onCreatePress: () => void;
  onSearchPress: () => void;
  onSortChange: (sort: ReelSort) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.reels;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityHint="Mở màn hình tạo bài đăng video mới"
          accessibilityLabel="Tạo bài đăng video mới"
          accessibilityRole="button"
          onPress={onCreatePress}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
        >
          <Ionicons color={colors.white} name="add" size={22} />
        </Pressable>
        {SORT_TABS.map((tab) => {
          const active = activeSort === tab.value;
          return (
            <Pressable
              accessibilityLabel={`Xem reels ${tab.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={tab.value}
              onPress={() => onSortChange(tab.value)}
              style={styles.tab}
            >
              <Text style={active ? styles.active : styles.inactive}>
                {tab.label}
              </Text>
              {active && <View style={styles.underline} />}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel="Tìm kiếm reels"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onSearchPress}
        >
          <Ionicons color={colors.white} name="search" size={24} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  active: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  container: {
    height: REELS_HEADER_HEIGHT,
    justifyContent: "flex-end",
    left: 0,
    paddingTop: REELS_HEADER_PADDING_TOP,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  createButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 19,
    borderWidth: 1,
    height: 33,
    justifyContent: "center",
    marginTop: -12,
    width: 33,
  },
  createButtonPressed: {
    backgroundColor: colors.primarySoft,
    transform: [{ scale: 0.94 }],
  },
  inactive: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tab: { alignItems: "center", gap: 6, minWidth: 58 },
  underline: {
    backgroundColor: colors.primary,
    borderRadius: 1,
    height: 2,
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    width: 30,
  },
});

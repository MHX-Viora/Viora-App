import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import type { ReelSort } from "@/types/reel";
import { type ThemeColors, useTheme } from "@/theme";


const SORT_TABS: { label: string; value: ReelSort }[] = [
  { label: "Bạn bè", value: "friends" },
  { label: "Theo dõi", value: "following" },
  { label: "Đề xuất", value: "popular" },
];

export function ReelsHeader({
  activeSort,
  height = 90,
  onCreatePress,
  onSearchPress,
  onSortChange,
  paddingTop = 40,
  overlay = false,
  top = 0,
}: {
  activeSort: ReelSort;
  height?: number;
  onCreatePress: () => void;
  onSearchPress: () => void;
  onSortChange: (sort: ReelSort) => void;
  paddingTop?: number;
  overlay?: boolean;
  top?: number;
}) {
  const { theme } = useTheme();
  const colors = overlay ? theme.reels : theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.container, { height, paddingTop, top }, overlay && styles.overlay]}>
      <View style={[styles.row, overlay && styles.overlayRow]}>
        <Pressable
          accessibilityHint="Mở màn hình tạo bài đăng video mới"
          accessibilityLabel="Tạo bài đăng video mới"
          accessibilityRole="button"
          onPress={onCreatePress}
          style={({ pressed }) => [
            styles.createButton,
            overlay && styles.overlayCreateButton,
            pressed && styles.createButtonPressed,
          ]}
        >
          <Ionicons color={colors.text} name="add" size={22} />
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
              <Text style={[active ? styles.active : styles.inactive, overlay && !active && styles.overlayText]}>
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
          <Ionicons color={colors.text} name="search" size={24} />
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
    backgroundColor: colors.background,
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  overlay: { backgroundColor: "transparent", justifyContent: "center" },
  overlayRow: { alignItems: "center", paddingBottom: 0 },
  overlayCreateButton: { marginTop: 0 },
  overlayText: { color: colors.text },
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

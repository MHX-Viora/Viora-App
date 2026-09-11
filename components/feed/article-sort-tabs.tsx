import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, type ThemeColors, useTheme } from "@/theme";
import type { PostFeedSort } from "@/types/feed";

export function ArticleSortTabs({
  onChange,
  value,
}: {
  onChange: (sort: PostFeedSort) => void;
  value: PostFeedSort;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityRole="tablist" style={styles.row}>
      <SortButton
        active={value === "recommended"}
        icon="sparkles-outline"
        label="Đề xuất"
        onPress={() => onChange("recommended")}
      />
      <SortButton
        active={value === "latest"}
        icon="time-outline"
        label="Mới nhất"
        onPress={() => onChange("latest")}
      />
      <SortButton
        active={value === "trending"}
        icon="flame-outline"
        label="Xu hướng"
        onPress={() => onChange("trending")}
      />
    </View>
  );
}

function SortButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: "flame-outline" | "sparkles-outline" | "time-outline";
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        active && styles.buttonActive,
        pressed && styles.buttonPressed,
      ]}
    >
      <Ionicons color={active ? colors.primary : colors.textMuted} name={icon} size={18} />
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  buttonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  buttonPressed: { opacity: 0.68 },
  row: { flexDirection: "row", gap: spacing.sm },
  text: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  textActive: { color: colors.primary },
});

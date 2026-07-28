import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { UtilityItem } from "@/features/utilities/data";
import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function UtilityGrid({ items }: { items: readonly UtilityItem[] }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh mục</Text>
        <Pressable
          accessibilityLabel="Xem tất cả tiện ích"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.seeAll}>Tất cả</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            accessibilityLabel={`Mở tiện ích ${item.label}`}
            accessibilityRole="button"
            key={item.id}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
            ]}
          >
            <View style={styles.iconWrap}>
              <Ionicons color={colors.visuals.hex_4773A8} name={item.icon} size={21} />
            </View>
            <Text numberOfLines={1} style={styles.label}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 20 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.visuals.hex_F4F6F9,
    borderColor: colors.visuals.hex_E8ECF1,
    borderRadius: 13,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  item: { alignItems: "center", gap: 7, width: "25%" },
  itemPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  label: {
    color: colors.visuals.hex_596474,
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 74,
    textAlign: "center",
  },
  seeAll: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  section: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
});

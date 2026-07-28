import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import type React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


type SettingsRowProps = {
  danger?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  isLoading?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
  title: string;
};

export function SettingsRow({
  danger,
  icon,
  isLoading,
  onPress,
  right,
  title,
}: SettingsRowProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress || isLoading}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
    >
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <Ionicons
          color={danger ? colors.danger : colors.primary}
          name={icon}
          size={20}
        />
      </View>
      <Text style={[styles.rowTitle, danger && styles.dangerText]}>
        {title}
      </Text>
      {isLoading ? (
        <ActivityIndicator color={danger ? colors.danger : colors.primary} />
      ) : (
        right ?? <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  dangerIcon: { backgroundColor: colors.visuals.rgb_239_71_111_0_12 },
  dangerText: { color: colors.danger },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  rowPressed: { opacity: 0.72 },
  rowTitle: { color: colors.text, flex: 1, fontSize: 15, fontWeight: "800" },
});

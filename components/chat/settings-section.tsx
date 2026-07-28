import { useMemo } from "react";
import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


type SettingsSectionProps = {
  children: React.ReactNode;
  title?: string;
};

export function SettingsSection({ children, title }: SettingsSectionProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { gap: spacing.sm },
  sectionBody: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.visuals.rgb_152_80_232_0_56,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    paddingHorizontal: spacing.xs,
    textTransform: "uppercase",
  },
});

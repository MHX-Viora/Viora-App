import type React from "react";
import { StyleSheet, Text, View } from "react-native";

import { communityColors as colors } from "@/features/feed/community-colors";
import { spacing } from "@/theme";

type SettingsSectionProps = {
  children: React.ReactNode;
  title?: string;
};

export function SettingsSection({ children, title }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionBody: {
    backgroundColor: colors.surfaceElevated,
    borderColor: "rgba(152, 80, 232, 0.56)",
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

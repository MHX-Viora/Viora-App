import { StyleSheet, View } from "react-native";

import { colors, spacing } from "@/theme";

export function SettingsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
      </View>
      <View style={styles.skeletonSection}>
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonAvatar: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  skeletonContent: { gap: spacing.lg, padding: spacing.md },
  skeletonRow: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 54,
  },
  skeletonSection: { gap: spacing.sm },
  skeletonTitle: {
    alignSelf: "center",
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 20,
    width: 180,
  },
});

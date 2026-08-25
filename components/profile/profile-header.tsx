import { useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { spacing } from "@/theme";
import { type ThemeColors, useTheme } from "@/theme";


export function ProfileHeader({
  onOpenFriends,
  onOpenQr,
  onOpenSettings,
}: {
  onOpenFriends: () => void;
  onOpenQr: () => void;
  onOpenSettings: () => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <View style={styles.leftActions}>
        <Pressable
          accessibilityHint="Mở danh sách bạn bè và tìm bạn mới"
          accessibilityLabel="Bạn bè"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onOpenFriends}
          style={styles.headerAction}
        >
          <Ionicons color={colors.text} name="people-outline" size={24} />
        </Pressable>
        <Pressable
          accessibilityHint="Hiện mã QR cá nhân hoặc quét mã của người khác"
          accessibilityLabel="QR hồ sơ"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onOpenQr}
          style={styles.headerAction}
        >
          <Ionicons color={colors.text} name="qr-code-outline" size={23} />
        </Pressable>
      </View>
      <Pressable
        accessibilityLabel="Cài đặt hồ sơ"
        accessibilityRole="button"
        hitSlop={10}
        onPress={onOpenSettings}
        style={styles.headerAction}
      >
        <Ionicons color={colors.text} name="settings-outline" size={23} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerAction: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  leftActions: { flexDirection: "row", gap: spacing.xs },
});

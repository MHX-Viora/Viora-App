import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, spacing } from "@/theme";

export function ProfileHeader({
  onOpenFriends,
  onOpenQr,
  onOpenSettings,
}: {
  onOpenFriends: () => void;
  onOpenQr: () => void;
  onOpenSettings: () => void;
}) {
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

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: "#F7F8FD",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: 40,
  },
  headerAction: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  leftActions: { flexDirection: "row", gap: spacing.xs },
});

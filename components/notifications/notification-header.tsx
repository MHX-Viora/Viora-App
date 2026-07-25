import { Pressable, StyleSheet, Text, View } from "react-native";

import { notificationColors as colors } from "@/features/notifications/notification-colors";
import { spacing } from "@/theme";

type Props = {
  onMarkAllRead: () => void;
  unreadCount: number;
};

export function NotificationHeader({ onMarkAllRead, unreadCount }: Props) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>Thông báo</Text>
        {unreadCount > 0 && (
          <Text style={styles.caption}>{unreadCount} thông báo chưa đọc</Text>
        )}
      </View>
      {unreadCount > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={onMarkAllRead}
          style={styles.action}
        >
          <Text style={styles.actionText}>Đánh dấu tất cả đã đọc</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  caption: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: 54,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "900" },
});

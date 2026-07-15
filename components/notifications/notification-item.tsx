import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatNotificationTime } from "@/features/notifications/notification-time";
import { colors, spacing } from "@/theme";
import type { NotificationItemModel } from "@/types/notification";

type Props = {
  notification: NotificationItemModel;
  onPress: (notification: NotificationItemModel) => void;
};

function NotificationItemComponent({ notification, onPress }: Props) {
  const senderName = notification.sender?.displayName ?? notification.title;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(notification)}
      style={[styles.item, !notification.isRead && styles.unreadItem]}
    >
      {notification.sender?.avatarUrl ? (
        <Image
          accessibilityLabel={`Ảnh đại diện của ${senderName}`}
          source={{ uri: notification.sender.avatarUrl }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.systemAvatar}>
          <Ionicons color={colors.primary} name="notifications" size={22} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.sender}>
            {senderName}
          </Text>
          {notification.sender?.isVerified && (
            <Ionicons
              accessibilityLabel="Tài khoản đã xác minh"
              color={colors.primary}
              name="checkmark-circle"
              size={15}
            />
          )}
        </View>
        <Text numberOfLines={2} style={styles.message}>
          {notification.content}
        </Text>
        <Text style={styles.time}>
          {formatNotificationTime(notification.createdAt)}
        </Text>
      </View>

      {notification.imageUrl && (
        <Image
          accessibilityLabel="Ảnh liên quan đến thông báo"
          source={{ uri: notification.imageUrl }}
          style={styles.thumbnail}
        />
      )}

      {!notification.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

export const NotificationItem = memo(
  NotificationItemComponent,
  (previous, next) =>
    previous.notification === next.notification && previous.onPress === next.onPress,
);

const styles = StyleSheet.create({
  avatar: { borderRadius: 26, height: 52, width: 52 },
  content: { flex: 1, gap: 2 },
  item: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 84,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  message: { color: colors.text, fontSize: 14, lineHeight: 19 },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  sender: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  systemAvatar: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  thumbnail: {
    backgroundColor: colors.border,
    borderRadius: 10,
    height: 56,
    width: 56,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  unreadItem: { backgroundColor: colors.primarySoft },
});

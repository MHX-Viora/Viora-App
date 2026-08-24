import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { memo, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";

import { spacing } from "@/theme";
import { VerifiedBadge } from "@/components/common/verified-badge";
import { UserAvatar } from "@/components/common/user-avatar";
import type { NotificationItemModel } from "@/types/notification";
import { formatNotificationTime } from "@/utils/notification-time";
import { type ThemeColors, useTheme } from "@/theme";


type Props = {
  isMarkingRead?: boolean;
  notification: NotificationItemModel;
  onMarkRead: (notification: NotificationItemModel) => void;
  onPress: (notification: NotificationItemModel) => void;
};

function NotificationItemComponent({
  isMarkingRead = false,
  notification,
  onMarkRead,
  onPress,
}: Props) {
  const { theme } = useTheme();
  const colors = theme.notifications;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const senderName = notification.sender?.displayName ?? notification.title;
  const handleMarkRead = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onMarkRead(notification);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(notification)}
      style={[styles.item, !notification.isRead && styles.unreadItem]}
    >
      {notification.sender ? (
        <UserAvatar
          displayName={senderName}
          imageUrl={notification.sender.avatarUrl}
          size={52}
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
            <VerifiedBadge
              accessibilityLabel="Tài khoản đã xác minh"
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

      {!notification.isRead && (
        <View style={styles.unreadActions}>
          <Pressable
            accessibilityLabel="Đánh dấu thông báo này đã đọc"
            accessibilityRole="button"
            disabled={isMarkingRead}
            hitSlop={8}
            onPress={handleMarkRead}
            style={({ pressed }) => [
              styles.readButton,
              pressed && styles.readButtonPressed,
              isMarkingRead && styles.readButtonDisabled,
            ]}
          >
            {isMarkingRead ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons
                color={colors.primary}
                name="checkmark-done"
                size={15}
              />
            )}
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

export const NotificationItem = memo(
  NotificationItemComponent,
  (previous, next) =>
    previous.isMarkingRead === next.isMarkingRead &&
    previous.notification === next.notification &&
    previous.onMarkRead === next.onMarkRead &&
    previous.onPress === next.onPress,
);

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  avatar: {
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    width: 52,
  },
  content: { flex: 1, gap: 2, paddingRight: spacing.md },
  item: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderRead,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 84,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "relative",
  },
  message: { color: colors.text, fontSize: 14, lineHeight: 19 },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  readButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26,
    shadowColor: colors.primary,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 7,
  },
  readButtonDisabled: { opacity: 0.62 },
  readButtonPressed: { opacity: 0.72 },
  sender: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  systemAvatar: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
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
  unreadActions: {
    alignItems: "center",
    position: "absolute",
    right: spacing.sm,
    top: spacing.xs,
  },
  unreadItem: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
});

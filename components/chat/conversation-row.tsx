import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";
import type { Conversation } from "@/types/chat";
import { formatChatTime } from "@/utils/chat-time";
import {
  getConversationAvatar,
  getConversationTitle,
  getLastMessageText,
} from "@/utils/conversation-list";

type ConversationRowProps = {
  conversation: Conversation;
  isPinLoading: boolean;
  onOpen: (conversation: Conversation) => void;
  onOpenMenu: (conversation: Conversation) => void;
};

export function ConversationRow({
  conversation,
  isPinLoading,
  onOpen,
  onOpenMenu,
}: ConversationRowProps) {
  const title = getConversationTitle(conversation);
  const avatar = getConversationAvatar(conversation);
  const isPrivate = conversation.conversationType === "Private";
  const otherParticipant = conversation.otherParticipant;
  const showVerified = isPrivate && otherParticipant?.isVerified === true;
  const showStrangerBadge = isPrivate && otherParticipant?.isStranger === true;

  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={() => onOpenMenu(conversation)}
      onPress={() => onOpen(conversation)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons
            color={colors.primary}
            name="chatbubble-ellipses"
            size={22}
          />
        </View>
      )}
      <View style={styles.rowBody}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {showVerified ? (
            <Ionicons
              color={colors.primary}
              name="checkmark-circle"
              size={16}
            />
          ) : null}
          {conversation.isMuted && (
            <Ionicons
              color={colors.textMuted}
              name="notifications-off"
              size={18}
            />
          )}
        </View>
        {showStrangerBadge ? (
          <View style={styles.strangerBadge}>
            <Text style={styles.strangerBadgeText}>Người lạ</Text>
          </View>
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            styles.preview,
            conversation.unreadCount > 0 && styles.unreadPreview,
          ]}
        >
          {getLastMessageText(conversation)}
        </Text>
      </View>
      <View style={styles.meta}>
        {conversation.isPinned && (
          <Ionicons color={colors.primary} name="pricetag" size={15} />
        )}
        <Text style={styles.time}>
          {conversation.lastMessage
            ? formatChatTime(conversation.lastMessage.createdAt)
            : ""}
        </Text>
        {conversation.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Text>
          </View>
        )}
        {isPinLoading && (
          <ActivityIndicator color={colors.primary} size="small" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: 28, height: 56, width: 56 },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 999,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  meta: { alignItems: "flex-end", gap: 4, minWidth: 42 },
  preview: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 82,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowBody: { flex: 1, gap: 4 },
  rowPressed: { opacity: 0.72 },
  strangerBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  strangerBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  time: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  title: { color: colors.text, flex: 1, fontSize: 16, fontWeight: "800" },
  titleLine: { alignItems: "center", flexDirection: "row", gap: 3 },
  unreadPreview: { color: colors.text, fontWeight: "800" },
});

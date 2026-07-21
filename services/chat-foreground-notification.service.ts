import * as Notifications from "expo-notifications";

import { getActiveChatConversation } from "@/features/chat/chat-events";
import type { NewMessageNotificationEvent } from "@/types/chat";
import { claimChatNotification } from "@/utils/chat-notification-dedupe";

const getMessagePreview = (event: NewMessageNotificationEvent) => {
  const content = event.message.content.trim();
  if (content) return content;

  const attachmentType = event.message.attachments[0]?.type;
  if (attachmentType === "image" || event.message.messageType === 1) {
    return "Đã gửi một ảnh";
  }
  if (attachmentType === "video" || event.message.messageType === 2) {
    return "Đã gửi một video";
  }
  if (attachmentType === "audio" || event.message.messageType === 4) {
    return "Đã gửi một âm thanh";
  }
  if (attachmentType === "file" || event.message.messageType === 3) {
    return "Đã gửi một tài liệu";
  }
  return "Bạn có tin nhắn mới";
};

export const showChatRealtimeNotification = async (
  event: NewMessageNotificationEvent,
) => {
  if (event.isMuted) return;
  if (getActiveChatConversation() === event.conversationId) return;

  const dedupeKey = event.message.id || event.conversationId;
  if (!claimChatNotification(dedupeKey)) {
    console.info("[ChatSync] message deduped", {
      conversationId: event.conversationId,
      messageId: event.message.id,
      source: "signalr",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        body: getMessagePreview(event),
        data: {
          conversationId: event.conversationId,
          deliverySource: "signalr-local",
          messageId: event.message.id,
          type: "chat",
        },
        title: event.sender?.displayName ?? event.conversationName,
      },
      trigger: { channelId: "default" },
    });
  } catch (error) {
    console.info(
      "[Chat] foreground notification skipped",
      error instanceof Error ? error.message : String(error),
    );
  }
};

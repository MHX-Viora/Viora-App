import * as Notifications from "expo-notifications";

import { getActiveChatConversation } from "@/features/chat/chat-events";
import type { NotificationItemModel } from "@/types/notification";
import { getCurrentNotificationData } from "@/utils/push-notification-time";
import { ensureNotificationSoundChannel, notificationSoundTrigger } from "./notification-channel.service";
import { NOTIFICATION_SOUND_FILE } from "./notification-sound";

const shownNotifications = new Map<string, number>();
const DEDUPE_MS = 10_000;

export const showRealtimeNotification = async (
  notification: NotificationItemModel,
) => {
  if (notification.isRead) return;
  const data = notification as unknown as {
    conversationId?: string;
    id?: string;
    type?: string | number;
  };
  if (data.type === "chat" && data.conversationId) {
    if (getActiveChatConversation() === data.conversationId) return;
  }

  const dedupeKey = notification.id;
  const now = Date.now();
  const lastShownAt = shownNotifications.get(dedupeKey) ?? 0;
  shownNotifications.set(dedupeKey, now);
  if (now - lastShownAt < DEDUPE_MS) return;

  try {
    await ensureNotificationSoundChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        sound: NOTIFICATION_SOUND_FILE,
        body: notification.content || undefined,
        data: getCurrentNotificationData({
          notificationId: notification.id,
          notificationType: notification.type,
          referenceId: notification.reference?.id,
          referenceType: notification.reference?.type,
        }),
        title: notification.title,
      },
      trigger: notificationSoundTrigger(),
    });
  } catch (error) {
    console.info(
      "[Push] foreground notification skipped",
      error instanceof Error ? error.message : String(error),
    );
  }
};

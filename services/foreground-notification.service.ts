import * as Notifications from "expo-notifications";

import type { NotificationItemModel } from "@/types/notification";

export const showRealtimeNotification = async (
  notification: NotificationItemModel,
) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        body: notification.content || undefined,
        data: {
          notificationId: notification.id,
          notificationType: notification.type,
          referenceId: notification.reference?.id,
          referenceType: notification.reference?.type,
        },
        title: notification.title,
      },
      trigger: null,
    });
  } catch (error) {
    console.info(
      "[Push] foreground notification skipped",
      error instanceof Error ? error.message : String(error),
    );
  }
};

import { showAppToast } from "@/components/common/app-toast";
import type { NotificationItemModel } from "@/types/notification";
import { playNotificationSound } from "./notification-sound.service";

const shownNotifications = new Map<string, number>();
const DEDUPE_MS = 10_000;
const SOCIAL_TYPES = new Set([1, 2, 3]); // Friend request, accepted, follow.

export const showRealtimeNotification = async (
  notification: NotificationItemModel,
): Promise<void> => {
  if (notification.isRead || notification.type === 9) return;
  const now = Date.now();
  for (const [id, shownAt] of shownNotifications) {
    if (now - shownAt >= DEDUPE_MS) shownNotifications.delete(id);
  }
  if (shownNotifications.has(notification.id)) return;
  shownNotifications.set(notification.id, now);
  await playNotificationSound(notification.id);
  if (!SOCIAL_TYPES.has(notification.type)) return;
  showAppToast({ title: notification.title, message: notification.content || notification.title, type: "success" });
};

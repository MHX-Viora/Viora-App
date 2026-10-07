import { showAppToast } from "@/components/common/app-toast";
import type { NotificationItemModel } from "@/types/notification";

const shownNotifications = new Map<string, number>();
const DEDUPE_MS = 10_000;
const SOCIAL_TYPES = new Set([1, 2, 3]); // Friend request, accepted, follow.

export const showRealtimeNotification = async (
  notification: NotificationItemModel,
): Promise<void> => {
  if (notification.isRead || !SOCIAL_TYPES.has(notification.type)) return;
  const now = Date.now();
  for (const [id, shownAt] of shownNotifications) {
    if (now - shownAt >= DEDUPE_MS) shownNotifications.delete(id);
  }
  if (shownNotifications.has(notification.id)) return;
  shownNotifications.set(notification.id, now);
  showAppToast({ title: notification.title, message: notification.content || notification.title, type: "success" });
};

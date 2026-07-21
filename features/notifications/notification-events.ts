import { mapNotification } from "@/features/notifications/notification.mapper";
import type { NotificationItemModel } from "@/types/notification";
import {
  getNotificationUnreadCount,
  setNotificationUnreadCount,
} from "@/utils/notification-unread-count";

type Listener = (notification: NotificationItemModel) => void;

const listeners = new Set<Listener>();
const emittedNotificationIds = new Set<string>();

export const emitRealtimeNotification = (payload: unknown) => {
  const notification = mapNotification(payload);
  if (emittedNotificationIds.has(notification.id)) {
    return notification;
  }

  emittedNotificationIds.add(notification.id);
  setNotificationUnreadCount(getNotificationUnreadCount() + 1);
  listeners.forEach((listener) => listener(notification));
  return notification;
};

export const subscribeRealtimeNotifications = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

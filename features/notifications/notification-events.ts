import { mapNotification } from "@/features/notifications/notification.mapper";
import {
  getNotificationUnreadCount,
  setNotificationUnreadCount,
} from "@/features/notifications/notification-unread-count";
import type {
  NotificationItemModel,
} from "@/types/notification";

type Listener = (notification: NotificationItemModel) => void;

const listeners = new Set<Listener>();

export const emitRealtimeNotification = (payload: unknown) => {
  const notification = mapNotification(payload);
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

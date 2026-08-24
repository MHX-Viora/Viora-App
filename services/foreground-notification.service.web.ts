import type { NotificationItemModel } from "@/types/notification";
// The notification screen and unread counters remain active on Web. This
// adapter only suppresses native foreground banners.
export const showRealtimeNotification = async (
  _notification: NotificationItemModel,
): Promise<void> => undefined;

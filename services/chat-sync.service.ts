import { getChatUnreadSummary } from "@/services/chat.service";
import { setChatUnreadCount } from "@/utils/chat-unread-count";

export type ChatSyncReason =
  | "cold-start"
  | "conversation-focus"
  | "fcm-foreground"
  | "mark-read"
  | "resume"
  | "signalr"
  | "signalr-reconnected";

let unreadSyncPromise: Promise<number | null> | null = null;

export const syncChatUnreadCount = (
  _reason: ChatSyncReason,
): Promise<number | null> => {
  if (unreadSyncPromise) return unreadSyncPromise;

  unreadSyncPromise = getChatUnreadSummary()
    .then(({ totalUnreadCount }) => {
      setChatUnreadCount(totalUnreadCount);
      return totalUnreadCount;
    })
    .catch(() => null)
    .finally(() => {
      unreadSyncPromise = null;
    });

  return unreadSyncPromise;
};

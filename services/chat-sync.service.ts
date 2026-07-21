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
  reason: ChatSyncReason,
): Promise<number | null> => {
  if (unreadSyncPromise) return unreadSyncPromise;

  unreadSyncPromise = getChatUnreadSummary()
    .then(({ totalUnreadCount }) => {
      setChatUnreadCount(totalUnreadCount);
      console.info("[ChatSync] unread count fetched", {
        source: "api",
        reason,
        timestamp: new Date().toISOString(),
        unreadCount: totalUnreadCount,
      });
      return totalUnreadCount;
    })
    .catch((error: unknown) => {
      console.info("[ChatSync] unread count fetch failed", {
        message: error instanceof Error ? error.message : String(error),
        reason,
        source: "api",
        timestamp: new Date().toISOString(),
      });
      return null;
    })
    .finally(() => {
      unreadSyncPromise = null;
    });

  return unreadSyncPromise;
};

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

import { emitRealtimeNotification } from "@/features/notifications/notification-events";
import {
  emitRealtimeConversationRead,
  emitRealtimeConversation,
  emitRealtimeConversationBlockedChanged,
  emitRealtimeConversationMutedChanged,
  emitRealtimeConversationPinnedChanged,
  emitRealtimeConversationDissolved,
  emitRealtimeMessage,
  emitRealtimeMessageDeleted,
  emitRealtimeMessageDelivered,
  emitRealtimeNewMessageNotification,
  emitRealtimeSyncRequest,
  getActiveChatConversation,
} from "@/features/chat/chat-events";
import { showChatRealtimeNotification } from "@/services/chat-foreground-notification.service";
import { syncChatUnreadCount } from "@/services/chat-sync.service";
import { showRealtimeNotification } from "@/services/foreground-notification.service";
import { getAccessToken } from "@/stores/session-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

let connection: HubConnection | null = null;
let shouldRunRealtime = false;
let startPromise: Promise<void> | null = null;
const joinedGroups = new Set<string>();

const handleNotificationPayload = (payload: unknown, eventName: string) => {
  try {
    const notification = emitRealtimeNotification(payload);
    console.info(`[Realtime] ${eventName}`, notification.id);
    void showRealtimeNotification(notification);
  } catch {
    console.info(`[Realtime] ignored ${eventName} payload`, payload);
  }
};

const getRealtimeConnection = () => {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/realtime`, {
        accessTokenFactory: async () => {
          const token = (await getAccessToken()) ?? "";
          console.info("[Realtime] access token exists", { exists: !!token });
          return token;
        },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.None)
      .build();

    connection.on("ReceiveNotification", (payload) => {
      handleNotificationPayload(payload, "ReceiveNotification");
    });

    connection.onreconnecting((error) => {
      console.info("[Realtime] reconnecting", error?.message);
    });

    connection.onreconnected(() => {
      console.info("[ChatSync] SignalR reconnected", {
        source: "signalr",
        timestamp: new Date().toISOString(),
      });
      emitRealtimeSyncRequest();
      void syncChatUnreadCount("signalr-reconnected");
      for (const groupName of joinedGroups) {
        console.info("[Realtime] rejoin group", { groupName });
        void connection?.invoke("JoinGroup", groupName).catch((error: unknown) => {
          console.info(
            "[Realtime] rejoin group failed",
            error instanceof Error ? error.message : String(error),
          );
        });
      }
    });

    connection.onclose((error) => {
      console.info("[Realtime] closed", error?.message);
    });

    connection.on("ReceiveMessage", (payload) => {
      emitRealtimeMessage(payload);
    });
    connection.on("MessageDelivered", (payload) => {
      emitRealtimeMessageDelivered(payload);
    });
    connection.on("MessageEdited", () => undefined);
    connection.on("MessageUpdated", () => undefined);
    connection.on("MessageDeleted", (payload) => {
      emitRealtimeMessageDeleted(payload);
    });
    connection.on("ConversationRead", (payload) => {
      emitRealtimeConversationRead(payload);
    });
    connection.on("MessageRead", (payload) => {
      emitRealtimeConversationRead(payload);
    });
    connection.on("MessagesRead", (payload) => {
      emitRealtimeConversationRead(payload);
    });
    connection.on("ConversationUpdated", (payload) => {
      emitRealtimeConversation(payload);
    });
    connection.on("ConversationCreated", (payload) => {
      emitRealtimeConversation(payload);
    });
    connection.on("NewMessageNotification", (payload) => {
      const event = emitRealtimeNewMessageNotification(payload);
      if (!event || getActiveChatConversation() === event.conversationId) {
        return;
      }
      void syncChatUnreadCount("signalr");
      void showChatRealtimeNotification(event);
    });
    connection.on("FriendRequestReceived", (payload) => {
      handleNotificationPayload(payload, "FriendRequestReceived");
    });
    connection.on("FriendRequestAccepted", (payload) => {
      handleNotificationPayload(payload, "FriendRequestAccepted");
    });
    connection.on("UserFollowed", (payload) => {
      handleNotificationPayload(payload, "UserFollowed");
    });
    connection.on("TypingStarted", () => undefined);
    connection.on("TypingStopped", () => undefined);
    connection.on("UserOnline", () => undefined);
    connection.on("UserOffline", () => undefined);
    connection.on("ReactionAdded", () => undefined);
    connection.on("ReactionRemoved", () => undefined);
    connection.on("ConversationPinned", (payload) => {
      emitRealtimeConversationPinnedChanged(payload);
    });
    connection.on("ConversationPinnedChanged", (payload) => {
      emitRealtimeConversationPinnedChanged(payload);
    });
    connection.on("ConversationMuted", (payload) => {
      emitRealtimeConversationMutedChanged(payload);
    });
    connection.on("ConversationMutedChanged", (payload) => {
      emitRealtimeConversationMutedChanged(payload);
    });
    connection.on("ConversationBlockedChanged", (payload) => {
      emitRealtimeConversationBlockedChanged(payload);
    });
    connection.on("ConversationDissolved", (payload) => {
      emitRealtimeConversationDissolved(payload);
    });
    connection.on("ConversationRenamed", () => undefined);
    connection.on("ConversationAvatarChanged", () => undefined);
    connection.on("MemberAdded", (payload) => {
      console.info("[Realtime] MemberAdded", payload);
      emitRealtimeSyncRequest();
    });
    connection.on("MemberRemoved", (payload) => {
      console.info("[Realtime] MemberRemoved", payload);
      emitRealtimeSyncRequest();
    });
    connection.on("MemberLeft", (payload) => {
      console.info("[Realtime] MemberLeft", payload);
      emitRealtimeSyncRequest();
    });
  }

  return connection;
};

export const startRealtime = async () => {
  shouldRunRealtime = true;
  if (!BASE_URL) return;
  if (startPromise) return startPromise;

  const realtimeConnection = getRealtimeConnection();
  if (realtimeConnection.state === HubConnectionState.Disconnected) {
    startPromise = realtimeConnection
      .start()
      .then(() => {
        console.info("[ChatSync] SignalR connected", {
          source: "signalr",
          timestamp: new Date().toISOString(),
        });
      })
      .catch((error: unknown) => {
        if (shouldRunRealtime) {
          console.info(
            "[Realtime] connection failed",
            error instanceof Error ? error.message : String(error),
          );
        }
      })
      .finally(() => {
        startPromise = null;
      });

    await startPromise;
  }
};

export const stopRealtime = async () => {
  shouldRunRealtime = false;
  if (startPromise) {
    await startPromise;
  }

  if (connection && connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }
};

export const restartRealtime = async () => {
  await stopRealtime();
  await startRealtime();
};

export const joinRealtimeGroup = async (groupName: string) => {
  if (!groupName.trim()) return;
  joinedGroups.add(groupName);
  await startRealtime();
  if (!connection || connection.state !== HubConnectionState.Connected) {
    console.info("[Realtime] JoinGroup skipped: not connected", {
      groupName,
      state: connection?.state,
    });
    return;
  }
  console.info("[Realtime] JoinGroup", { groupName });
  await connection.invoke("JoinGroup", groupName);
};

export const leaveRealtimeGroup = async (groupName: string) => {
  if (!groupName.trim()) return;
  joinedGroups.delete(groupName);
  if (!connection || connection.state !== HubConnectionState.Connected) {
    console.info("[Realtime] LeaveGroup skipped: not connected", {
      groupName,
      state: connection?.state,
    });
    return;
  }
  console.info("[Realtime] LeaveGroup", { groupName });
  await connection.invoke("LeaveGroup", groupName);
};

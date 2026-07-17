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
  emitRealtimeMessage,
  emitRealtimeMessageDeleted,
  emitRealtimeMessageDelivered,
  emitRealtimeNewMessageNotification,
  emitRealtimeSyncRequest,
  getActiveChatConversation,
} from "@/features/chat/chat-events";
import { showChatRealtimeNotification } from "@/services/chat-foreground-notification.service";
import { showRealtimeNotification } from "@/services/foreground-notification.service";
import { getAccessToken } from "@/stores/session-store";
import { setChatUnreadCount } from "@/utils/chat-unread-count";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

let connection: HubConnection | null = null;
let shouldRunRealtime = false;
let startPromise: Promise<void> | null = null;

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
        accessTokenFactory: async () => (await getAccessToken()) ?? "",
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
      console.info("[Realtime] reconnected");
      emitRealtimeSyncRequest();
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
      setChatUnreadCount(event.unreadCount);
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
    connection.on("ConversationRenamed", () => undefined);
    connection.on("ConversationAvatarChanged", () => undefined);
    connection.on("MemberAdded", () => undefined);
    connection.on("MemberRemoved", () => undefined);
    connection.on("MemberLeft", () => undefined);
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
        console.info("[Realtime] connected");
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
  if (!connection || connection.state !== HubConnectionState.Connected) return;
  await connection.invoke("JoinGroup", groupName);
};

export const leaveRealtimeGroup = async (groupName: string) => {
  if (!connection || connection.state !== HubConnectionState.Connected) return;
  await connection.invoke("LeaveGroup", groupName);
};

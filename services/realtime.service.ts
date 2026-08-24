import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { AppState } from "react-native";

import { emitRealtimeNotification } from "@/features/notifications/notification-events";
import {
  emitCallAccepted,
  emitCallLifecycle,
  emitIncomingCall,
} from "@/features/calls/call-events";
import { shouldShowIncomingCallNotification } from "@/features/calls/call-waiting";
import {
  dismissIncomingCallNotification,
  scheduleIncomingCallNotification,
} from "@/services/incoming-call-notification.service";
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
import { clearPendingIncomingCall } from "@/services/pending-incoming-call.service";
import { startWithRetry } from "@/services/realtime-start-retry";
import { getAccessToken } from "@/stores/session-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const INITIAL_RECONNECT_DELAYS_MS = [0, 2000, 5000, 10000, 30000] as const;

let connection: HubConnection | null = null;
let shouldRunRealtime = false;
let startPromise: Promise<void> | null = null;
const joinedGroups = new Set<string>();
const realtimeErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "type" in error
      ? `WebSocket ${String((error as { type?: unknown }).type)}`
      : String(error);

const handleNotificationPayload = (payload: unknown, eventName: string) => {
  try {
    const notification = emitRealtimeNotification(payload);
    console.info(`[Realtime] ${eventName}`, notification.id);
    void showRealtimeNotification(notification);
  } catch {
    console.info(`[Realtime] ignored ${eventName} payload`, payload);
  }
};

const handleCallLifecyclePayload = (payload: unknown, eventName: string) => {
  const event = emitCallLifecycle(eventName, payload);
  if (event) {
    void clearPendingIncomingCall(event.callId);
    void dismissIncomingCallNotification(event.callId).catch(() => undefined);
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
      if (shouldRunRealtime) {
        void startRealtime().catch((startError: unknown) => {
          console.info("[Realtime] restart failed", realtimeErrorMessage(startError));
        });
      }
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
    connection.on("IncomingCall", (payload) => {
      emitIncomingCall(payload);
    });
    connection.on("GroupCallStarted", (payload) => {
      const invitation =
        typeof payload === "object" && payload !== null
          ? { ...payload, type: "GroupCall", isGroupCall: true }
          : null;
      if (!invitation) return;
      emitIncomingCall(invitation);
      if (!shouldShowIncomingCallNotification(AppState.currentState)) return;

      const data = invitation as Record<string, unknown>;
      const callerName =
        typeof data.callerDisplayName === "string"
          ? data.callerDisplayName
          : "Cuộc gọi nhóm";
      void scheduleIncomingCallNotification({
        body: `${callerName} đang mời bạn tham gia cuộc gọi video nhóm`,
        data,
        title: callerName,
      });
    });
    connection.on("GroupCallEnded", (payload) => {
      handleCallLifecyclePayload(payload, "GroupCallEnded");
    });
    connection.on("CallAccepted", (payload) => {
      emitCallAccepted(payload);
    });
    connection.on("CallRejected", (payload) => {
      handleCallLifecyclePayload(payload, "CallRejected");
    });
    connection.on("CallCancelled", (payload) => {
      handleCallLifecyclePayload(payload, "CallCancelled");
    });
    connection.on("CallEnded", (payload) => {
      handleCallLifecyclePayload(payload, "CallEnded");
    });
    connection.on("CallMissed", (payload) => {
      handleCallLifecyclePayload(payload, "CallMissed");
    });
    connection.on("CallTimeout", (payload) => {
      handleCallLifecyclePayload(payload, "CallTimeout");
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
    startPromise = startWithRetry({
      delaysMs: INITIAL_RECONNECT_DELAYS_MS,
      isConnected: () =>
        realtimeConnection.state === HubConnectionState.Connected,
      onFailure: (error, nextDelayMs) => {
        if (!shouldRunRealtime) return;
        console.info("[Realtime] initial connection failed; retrying", {
          message: error instanceof Error ? error.message : String(error),
          nextDelayMs,
        });
      },
      shouldContinue: () => shouldRunRealtime,
      sleep: (delayMs) =>
        new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        }),
      start: () => realtimeConnection.start(),
    })
      .then(async (connected) => {
        if (!connected) return;
        console.info("[ChatSync] SignalR connected", {
          source: "signalr",
          timestamp: new Date().toISOString(),
        });

        if (!shouldRunRealtime) {
          await realtimeConnection.stop().catch((error: unknown) => {
            console.info("[Realtime] late stop ignored", realtimeErrorMessage(error));
          });
        }
      })
      .finally(() => {
        startPromise = null;
      });

    await startPromise.catch((error: unknown) => {
      console.info("[Realtime] start stopped after socket error", realtimeErrorMessage(error));
    });
  }
};

export const stopRealtime = async () => {
  shouldRunRealtime = false;

  if (connection && connection.state !== HubConnectionState.Disconnected) {
    await connection.stop().catch((error: unknown) => {
      // React Native WebSocket rejects with an Event object when the socket
      // closes concurrently. The connection is already stopping, so this is
      // a successful terminal state rather than an app error.
      console.info("[Realtime] stop completed after socket close", realtimeErrorMessage(error));
    });
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

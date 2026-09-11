import {
  mapConversationBlockedChangedEvent,
  mapConversation,
  mapConversationMutedChangedEvent,
  mapConversationPinnedChangedEvent,
  mapConversationReadEvent,
  mapMessage,
  mapMessageDeletedEvent,
  mapMessageDeliveredEvent,
  mapNewMessageNotificationEvent,
} from "@/features/chat/chat.mapper";
import type {
  ChatMessage,
  Conversation,
  ConversationBlockedChangedEvent,
  ConversationMutedChangedEvent,
  ConversationPinnedChangedEvent,
  ConversationReadEvent,
  MessageDeliveredEvent,
  MessageDeletedEvent,
  NewMessageNotificationEvent,
} from "@/types/chat";
import { isMessageFromCurrentUser } from "./chat-realtime-policy";

type MessageListener = (message: ChatMessage) => void;
type ConversationListener = (conversation: Conversation) => void;
type ConversationPinnedChangedListener = (
  event: ConversationPinnedChangedEvent,
) => void;
type ConversationMutedChangedListener = (
  event: ConversationMutedChangedEvent,
) => void;
type ConversationBlockedChangedListener = (
  event: ConversationBlockedChangedEvent,
) => void;
type ConversationReadListener = (event: ConversationReadEvent) => void;
type ConversationDissolvedEvent = { conversationId: string };
type ConversationDissolvedListener = (
  event: ConversationDissolvedEvent,
) => void;
type MessageDeliveredListener = (event: MessageDeliveredEvent) => void;
type MessageDeletedListener = (event: MessageDeletedEvent) => void;
type NewMessageNotificationListener = (
  event: NewMessageNotificationEvent,
) => void;
type SyncListener = () => void;

const messageListeners = new Set<MessageListener>();
const conversationListeners = new Set<ConversationListener>();
const conversationPinnedChangedListeners =
  new Set<ConversationPinnedChangedListener>();
const conversationMutedChangedListeners =
  new Set<ConversationMutedChangedListener>();
const conversationBlockedChangedListeners =
  new Set<ConversationBlockedChangedListener>();
const conversationReadListeners = new Set<ConversationReadListener>();
const conversationDissolvedListeners =
  new Set<ConversationDissolvedListener>();
const messageDeliveredListeners = new Set<MessageDeliveredListener>();
const messageDeletedListeners = new Set<MessageDeletedListener>();
const newMessageNotificationListeners =
  new Set<NewMessageNotificationListener>();
const syncListeners = new Set<SyncListener>();
let activeConversationId: string | null = null;

const subscribe = <T>(listeners: Set<(value: T) => void>, listener: (value: T) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const subscribeRealtimeMessages = (listener: MessageListener) => {
  return subscribe(messageListeners, listener);
};

export const subscribeRealtimeConversations = (listener: ConversationListener) => {
  return subscribe(conversationListeners, listener);
};

export const subscribeRealtimeConversationPinnedChanges = (
  listener: ConversationPinnedChangedListener,
) => subscribe(conversationPinnedChangedListeners, listener);

export const subscribeRealtimeConversationMutedChanges = (
  listener: ConversationMutedChangedListener,
) => subscribe(conversationMutedChangedListeners, listener);

export const subscribeRealtimeConversationBlockedChanges = (
  listener: ConversationBlockedChangedListener,
) => subscribe(conversationBlockedChangedListeners, listener);

export const subscribeRealtimeConversationReads = (
  listener: ConversationReadListener,
) => subscribe(conversationReadListeners, listener);

export const subscribeRealtimeConversationDissolved = (
  listener: ConversationDissolvedListener,
) => subscribe(conversationDissolvedListeners, listener);

export const subscribeRealtimeMessageDelivered = (
  listener: MessageDeliveredListener,
) => subscribe(messageDeliveredListeners, listener);

export const subscribeRealtimeMessageDeleted = (
  listener: MessageDeletedListener,
) => subscribe(messageDeletedListeners, listener);

export const subscribeRealtimeNewMessageNotifications = (
  listener: NewMessageNotificationListener,
) => subscribe(newMessageNotificationListeners, listener);

export const subscribeRealtimeSyncRequests = (listener: SyncListener) => {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
};

export const setActiveChatConversation = (conversationId: string | null) => {
  activeConversationId = conversationId;
};

export const getActiveChatConversation = () => activeConversationId;

export const emitRealtimeMessage = (payload: unknown) => {
  const message = mapMessage(payload);
  if (!message) return null;
  messageListeners.forEach((listener) => listener(message));
  return message;
};

export const emitRealtimeConversation = (payload: unknown) => {
  const conversation = mapConversation(payload);
  if (!conversation) return null;
  conversationListeners.forEach((listener) => listener(conversation));
  return conversation;
};

export const emitRealtimeConversationPinnedChanged = (payload: unknown) => {
  const event = mapConversationPinnedChangedEvent(payload);
  if (!event) return null;
  conversationPinnedChangedListeners.forEach((listener) => listener(event));
  return event;
};

export const emitRealtimeConversationMutedChanged = (payload: unknown) => {
  const event = mapConversationMutedChangedEvent(payload);
  if (!event) return null;
  conversationMutedChangedListeners.forEach((listener) => listener(event));
  return event;
};

export const emitRealtimeConversationBlockedChanged = (payload: unknown) => {
  const event = mapConversationBlockedChangedEvent(payload);
  if (!event) return null;
  conversationBlockedChangedListeners.forEach((listener) => listener(event));
  return event;
};

export const emitRealtimeConversationRead = (payload: unknown) => {
  const event = mapConversationReadEvent(payload);
  if (!event) return null;
  conversationReadListeners.forEach((listener) => listener(event));
  return event;
};

export const emitRealtimeConversationDissolved = (payload: unknown) => {
  if (typeof payload === "string") {
    const event = { conversationId: payload };
    conversationDissolvedListeners.forEach((listener) => listener(event));
    return event;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const raw = payload as { conversationId?: unknown; id?: unknown };
  const conversationId =
    typeof raw.conversationId === "string"
      ? raw.conversationId
      : typeof raw.id === "string"
        ? raw.id
        : "";
  if (!conversationId) return null;
  const event = { conversationId };
  conversationDissolvedListeners.forEach((listener) => listener(event));
  return event;
};

export const emitRealtimeMessageDelivered = (payload: unknown) => {
  const event = mapMessageDeliveredEvent(payload);
  if (!event) return null;
  messageDeliveredListeners.forEach((listener) => listener(event));
  return event;
};

export const emitRealtimeMessageDeleted = (payload: unknown) => {
  const event = mapMessageDeletedEvent(payload);
  if (!event) return null;
  messageDeletedListeners.forEach((listener) => listener(event));
  return event;
};

export const emitRealtimeNewMessageNotification = (
  payload: unknown,
  currentUserId?: string | null,
) => {
  const event = mapNewMessageNotificationEvent(payload);
  if (!event) return null;
  if (isMessageFromCurrentUser(event.sender?.id, currentUserId)) return null;
  newMessageNotificationListeners.forEach((listener) => listener(event));
  return event;
};

export const emitRealtimeSyncRequest = () => {
  syncListeners.forEach((listener) => listener());
};

import type { ChatMessage, SendMessageAttachment } from "@/types/chat";
import { createStore } from "zustand/vanilla";

export const MESSAGE_CACHE_TTL_MS = 30_000;
export const MAX_MESSAGE_CACHE_ROOMS = 12;
export const MAX_MESSAGES_PER_CONVERSATION = 1_000;

export type MessageCacheEntry = {
  backgroundRefreshing: boolean;
  initialized: boolean;
  initialLoading: boolean;
  lastFetchedAt: number;
  loadingMore: boolean;
  messages: ChatMessage[];
  page: number;
  totalPages: number;
};

export type MessageRetryPayload = {
  attachments: SendMessageAttachment[];
  content: string;
  conversationId: string;
  mentionUserIds?: string[];
  replyToMessageId?: string;
  stickerId?: string;
};

type MessageCacheState = {
  entries: Map<string, MessageCacheEntry>;
  retries: Map<string, Map<string, MessageRetryPayload>>;
};

export const messageCacheStore = createStore<MessageCacheState>(() => ({
  entries: new Map(),
  retries: new Map(),
}));

const emptyEntry = (): MessageCacheEntry => ({
  backgroundRefreshing: false,
  initialized: false,
  initialLoading: true,
  lastFetchedAt: 0,
  loadingMore: false,
  messages: [],
  page: 1,
  totalPages: 1,
});

const mergeUnique = (first: ChatMessage[], second: ChatMessage[]) => {
  const seen = new Set<string>();
  return [...first, ...second].filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
};

const isPending = (message: ChatMessage) =>
  message.id.startsWith("pending-") ||
  message.sendStatus === "sending" ||
  message.sendStatus === "failed";

const storeEntry = (conversationId: string, entry: MessageCacheEntry) => {
  const state = messageCacheStore.getState();
  const entries = new Map(state.entries);
  const retries = new Map(state.retries);
  entries.delete(conversationId);
  entries.set(conversationId, {
    ...entry,
    messages: entry.messages.slice(0, MAX_MESSAGES_PER_CONVERSATION),
  });
  while (entries.size > MAX_MESSAGE_CACHE_ROOMS) {
    const oldestId = entries.keys().next().value as string | undefined;
    if (oldestId === undefined) break;
    entries.delete(oldestId);
    retries.delete(oldestId);
  }
  messageCacheStore.setState({ entries, retries });
  return entries.get(conversationId)!;
};

export const getMessageCache = (conversationId: string) => {
  return messageCacheStore.getState().entries.get(conversationId);
};

export const getCachedMessages = (conversationId: string) =>
  getMessageCache(conversationId)?.messages ?? [];

export const setCachedMessages = (
  conversationId: string,
  messages: ChatMessage[],
) => {
  const current = messageCacheStore.getState().entries.get(conversationId) ?? emptyEntry();
  const next = { ...current, messages };
  return storeEntry(conversationId, next);
};

export const setCachedMessagePage = (
  conversationId: string,
  messages: ChatMessage[],
  page: number,
  totalPages: number,
  fetchedAt = Date.now(),
) => {
  const current = messageCacheStore.getState().entries.get(conversationId) ?? emptyEntry();
  const nextMessages =
    page === 1
      ? mergeUnique(
          current.messages.filter(isPending),
          mergeUnique(messages, current.messages.filter((item) => !isPending(item))),
        )
      : mergeUnique(current.messages, messages);
  const next: MessageCacheEntry = {
    backgroundRefreshing: current.backgroundRefreshing,
    initialized: true,
    initialLoading: false,
    lastFetchedAt: page === 1 ? fetchedAt : current.lastFetchedAt,
    loadingMore: current.loadingMore,
    messages: nextMessages,
    page: page === 1 ? Math.max(1, current.page) : Math.max(current.page, page),
    totalPages,
  };
  return storeEntry(conversationId, next);
};

export const upsertCachedMessage = (
  conversationId: string,
  message: ChatMessage,
) => {
  const current = messageCacheStore.getState().entries.get(conversationId) ?? emptyEntry();
  const index = current.messages.findIndex((item) => item.id === message.id);
  const messages = index < 0
    ? [message, ...current.messages]
    : current.messages.map((item, itemIndex) => itemIndex === index ? message : item);
  return setCachedMessages(conversationId, messages);
};

export const replaceCachedMessage = (
  conversationId: string,
  optimisticId: string,
  confirmed: ChatMessage,
) => {
  const current = messageCacheStore.getState().entries.get(conversationId) ?? emptyEntry();
  const withoutConfirmedDuplicate = current.messages.filter(
    (item) => item.id === optimisticId || item.id !== confirmed.id,
  );
  const hasOptimistic = withoutConfirmedDuplicate.some(
    (item) => item.id === optimisticId,
  );
  return setCachedMessages(
    conversationId,
    hasOptimistic
      ? withoutConfirmedDuplicate.map((item) =>
          item.id === optimisticId ? confirmed : item,
        )
      : [confirmed, ...withoutConfirmedDuplicate],
  );
};

export const isMessageCacheStale = (
  conversationId: string,
  now = Date.now(),
) => {
  const entry = messageCacheStore.getState().entries.get(conversationId);
  return !entry?.initialized || now - entry.lastFetchedAt >= MESSAGE_CACHE_TTL_MS;
};

export const setMessageRetry = (
  conversationId: string,
  messageId: string,
  payload: MessageRetryPayload,
) => {
  const state = messageCacheStore.getState();
  const retries = new Map(state.retries);
  const conversationRetries = new Map(retries.get(conversationId) ?? new Map());
  conversationRetries.set(messageId, payload);
  retries.set(conversationId, conversationRetries);
  messageCacheStore.setState({ retries });
};

export const getMessageRetry = (conversationId: string, messageId: string) =>
  messageCacheStore.getState().retries.get(conversationId)?.get(messageId);

export const deleteMessageRetry = (
  conversationId: string,
  messageId: string,
) => {
  const retries = new Map(messageCacheStore.getState().retries);
  const conversationRetries = retries.get(conversationId);
  if (conversationRetries) {
    const nextConversationRetries = new Map(conversationRetries);
    nextConversationRetries.delete(messageId);
    if (nextConversationRetries.size === 0) retries.delete(conversationId);
    else retries.set(conversationId, nextConversationRetries);
    messageCacheStore.setState({ retries });
  }
};

export const setMessageLoadingState = (
  conversationId: string,
  patch: Partial<Pick<MessageCacheEntry, "initialLoading" | "backgroundRefreshing" | "loadingMore">>,
) => {
  const current = messageCacheStore.getState().entries.get(conversationId) ?? emptyEntry();
  return storeEntry(conversationId, { ...current, ...patch });
};

export const setCachedMessageHasNoMore = (conversationId: string) => {
  const current = messageCacheStore.getState().entries.get(conversationId) ?? emptyEntry();
  return storeEntry(conversationId, { ...current, totalPages: current.page });
};

export const clearMessageCache = (conversationId?: string) => {
  const state = messageCacheStore.getState();
  if (conversationId) {
    const entries = new Map(state.entries);
    const retries = new Map(state.retries);
    entries.delete(conversationId);
    retries.delete(conversationId);
    messageCacheStore.setState({ entries, retries });
  } else {
    messageCacheStore.setState({ entries: new Map(), retries: new Map() });
  }
};

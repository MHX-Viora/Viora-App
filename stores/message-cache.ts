import type { ChatMessage } from "@/types/chat";

export const MESSAGE_CACHE_TTL_MS = 30_000;

export type MessageCacheEntry = {
  initialized: boolean;
  lastFetchedAt: number;
  messages: ChatMessage[];
  page: number;
  totalPages: number;
};

const entries = new Map<string, MessageCacheEntry>();

const emptyEntry = (): MessageCacheEntry => ({
  initialized: false,
  lastFetchedAt: 0,
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

export const getMessageCache = (conversationId: string) =>
  entries.get(conversationId);

export const getCachedMessages = (conversationId: string) =>
  entries.get(conversationId)?.messages ?? [];

export const setCachedMessages = (
  conversationId: string,
  messages: ChatMessage[],
) => {
  const current = entries.get(conversationId) ?? emptyEntry();
  const next = { ...current, messages };
  entries.set(conversationId, next);
  return next;
};

export const setCachedMessagePage = (
  conversationId: string,
  messages: ChatMessage[],
  page: number,
  totalPages: number,
  fetchedAt = Date.now(),
) => {
  const current = entries.get(conversationId) ?? emptyEntry();
  const nextMessages =
    page === 1
      ? mergeUnique(
          current.messages.filter(isPending),
          mergeUnique(messages, current.messages.filter((item) => !isPending(item))),
        )
      : mergeUnique(current.messages, messages);
  const next: MessageCacheEntry = {
    initialized: true,
    lastFetchedAt: page === 1 ? fetchedAt : current.lastFetchedAt,
    messages: nextMessages,
    page: page === 1 ? Math.max(1, current.page) : Math.max(current.page, page),
    totalPages,
  };
  entries.set(conversationId, next);
  return next;
};

export const upsertCachedMessage = (
  conversationId: string,
  message: ChatMessage,
) => {
  const current = entries.get(conversationId) ?? emptyEntry();
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
  const current = entries.get(conversationId) ?? emptyEntry();
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
  const entry = entries.get(conversationId);
  return !entry?.initialized || now - entry.lastFetchedAt >= MESSAGE_CACHE_TTL_MS;
};

export const clearMessageCache = (conversationId?: string) => {
  if (conversationId) entries.delete(conversationId);
  else entries.clear();
};


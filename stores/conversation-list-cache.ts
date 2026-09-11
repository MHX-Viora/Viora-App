import type { Conversation } from "@/types/chat";

let conversations: Conversation[] = [];
let lastFetchedAt = 0;

export const CONVERSATION_LIST_CACHE_TTL_MS = 30_000;

export const getConversationListCache = () => conversations;

export const setConversationListCache = (
  items: Conversation[],
  fetchedAt?: number,
) => {
  conversations = items;
  if (fetchedAt !== undefined) lastFetchedAt = fetchedAt;
};

export const isConversationListCacheStale = (now = Date.now()) =>
  conversations.length === 0 ||
  now - lastFetchedAt >= CONVERSATION_LIST_CACHE_TTL_MS;

export const clearConversationListCache = () => {
  conversations = [];
  lastFetchedAt = 0;
};

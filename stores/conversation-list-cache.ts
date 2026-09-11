import type { Conversation } from "@/types/chat";
import { createStore } from "zustand/vanilla";

type ConversationCacheState = {
  conversations: Conversation[];
  lastFetchedAt: number;
};

export const conversationCacheStore = createStore<ConversationCacheState>(() => ({
  conversations: [],
  lastFetchedAt: 0,
}));

export const CONVERSATION_LIST_CACHE_TTL_MS = 30_000;

export const getConversationListCache = () =>
  conversationCacheStore.getState().conversations;

export const setConversationListCache = (
  items: Conversation[],
  fetchedAt?: number,
) => {
  conversationCacheStore.setState((current) => ({
    conversations: items,
    lastFetchedAt: fetchedAt ?? current.lastFetchedAt,
  }));
};

export const isConversationListCacheStale = (now = Date.now()) => {
  const { conversations, lastFetchedAt } = conversationCacheStore.getState();
  return conversations.length === 0 ||
    now - lastFetchedAt >= CONVERSATION_LIST_CACHE_TTL_MS;
};

export const clearConversationListCache = () => {
  conversationCacheStore.setState({ conversations: [], lastFetchedAt: 0 });
};

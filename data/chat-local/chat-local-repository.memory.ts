import type { ChatMessage, Conversation } from "@/types/chat";
import type { StickerPackDetail, StickerPackPage } from "@/types/sticker";
import type {
  ChatLocalRepository,
  LocalCacheEntry,
  MessageCursor,
} from "./chat-local-repository.types";

// Kept local so Node's type-stripping test runner does not need to resolve a TS runtime import.
const MAX_LOCAL_MESSAGES_PER_CONVERSATION = 5_000;
const MAX_LOCAL_CONVERSATIONS = 500;
const MAX_LOCAL_STICKER_PAGES = 24;
const MAX_LOCAL_STICKER_DETAILS = 96;

const conversationSortAt = (conversation: Conversation) =>
  conversation.lastMessage?.createdAt ?? "";

const ownerKey = (ownerId: string, id: string) => `${ownerId}\u0000${id}`;
const compareMessagesNewestFirst = (left: ChatMessage, right: ChatMessage) =>
  right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id);
const pruneOwnedCache = <T extends LocalCacheEntry<unknown>>(
  cache: Map<string, T>,
  ownerId: string,
  limit: number,
) => {
  const oldest = [...cache.entries()]
    .filter(([key]) => key.startsWith(`${ownerId}\u0000`))
    .sort(([, left], [, right]) => right.cachedAt - left.cachedAt)
    .slice(limit);
  oldest.forEach(([key]) => cache.delete(key));
};

export const createMemoryChatLocalRepository = (): ChatLocalRepository => {
  const messages = new Map<string, ChatMessage>();
  const conversations = new Map<string, Conversation>();
  const stickerPages = new Map<string, LocalCacheEntry<StickerPackPage>>();
  const stickerDetails = new Map<string, LocalCacheEntry<StickerPackDetail>>();

  const roomMessages = (ownerId: string, conversationId: string) =>
    [...messages.entries()]
      .filter(([key, value]) => key.startsWith(`${ownerId}\u0000`) && value.conversationId === conversationId)
      .map(([, value]) => value)
      .sort(compareMessagesNewestFirst);
  const pruneOwnedConversations = (ownerId: string) => {
    const owned = [...conversations.entries()]
      .filter(([key]) => key.startsWith(`${ownerId}\u0000`))
      .sort(([, left], [, right]) => conversationSortAt(right).localeCompare(conversationSortAt(left)));
    owned.slice(MAX_LOCAL_CONVERSATIONS).forEach(([key]) => conversations.delete(key));
  };

  const repository: ChatLocalRepository = {
    async initialize() {},
    async getRecentMessages(ownerId, conversationId, limit) {
      return roomMessages(ownerId, conversationId).slice(0, limit);
    },
    async getOlderMessages(ownerId, conversationId, before: MessageCursor, limit) {
      return roomMessages(ownerId, conversationId)
        .filter((item) =>
          item.createdAt < before.createdAt ||
          (item.createdAt === before.createdAt && item.id < before.messageId),
        )
        .slice(0, limit);
    },
    async getLatestMessage(ownerId, conversationId) {
      return roomMessages(ownerId, conversationId)[0] ?? null;
    },
    async upsertMessage(ownerId, message) {
      messages.set(ownerKey(ownerId, message.id), message);
      const room = roomMessages(ownerId, message.conversationId);
      room.slice(MAX_LOCAL_MESSAGES_PER_CONVERSATION).forEach((item) =>
        messages.delete(ownerKey(ownerId, item.id)),
      );
    },
    async upsertMessages(ownerId, values) {
      for (const value of values) await repository.upsertMessage(ownerId, value);
    },
    async replaceMessage(ownerId, optimisticId, confirmed) {
      messages.delete(ownerKey(ownerId, optimisticId));
      await repository.upsertMessage(ownerId, confirmed);
    },
    async removeMessage(ownerId, messageId) {
      messages.delete(ownerKey(ownerId, messageId));
    },
    async getConversations(ownerId) {
      return [...conversations.entries()]
        .filter(([key]) => key.startsWith(`${ownerId}\u0000`))
        .map(([, value]) => value)
        .sort((left, right) => conversationSortAt(right).localeCompare(conversationSortAt(left)));
    },
    async upsertConversation(ownerId, conversation) {
      conversations.set(ownerKey(ownerId, conversation.id), conversation);
      pruneOwnedConversations(ownerId);
    },
    async upsertConversations(ownerId, values) {
      for (const value of values) conversations.set(ownerKey(ownerId, value.id), value);
      pruneOwnedConversations(ownerId);
    },
    async removeConversation(ownerId, conversationId) {
      conversations.delete(ownerKey(ownerId, conversationId));
    },
    async getStickerPage(ownerId, cacheKey) {
      return stickerPages.get(ownerKey(ownerId, cacheKey)) ?? null;
    },
    async putStickerPage(ownerId, cacheKey, value, cachedAt) {
      stickerPages.set(ownerKey(ownerId, cacheKey), { cachedAt, value });
      pruneOwnedCache(stickerPages, ownerId, MAX_LOCAL_STICKER_PAGES);
    },
    async getStickerDetail(ownerId, packId) {
      return stickerDetails.get(ownerKey(ownerId, packId)) ?? null;
    },
    async putStickerDetail(ownerId, packId, value, cachedAt) {
      stickerDetails.set(ownerKey(ownerId, packId), { cachedAt, value });
      pruneOwnedCache(stickerDetails, ownerId, MAX_LOCAL_STICKER_DETAILS);
    },
    async clearOwner(ownerId) {
      for (const cache of [messages, conversations, stickerPages, stickerDetails]) {
        for (const key of cache.keys()) if (key.startsWith(`${ownerId}\u0000`)) cache.delete(key);
      }
    },
  };
  return repository;
};

import type { ChatMessage, Conversation } from "@/types/chat";
import type { StickerPackDetail, StickerPackPage } from "@/types/sticker";

export const CHAT_LOCAL_DATABASE_VERSION = 2;
export const MAX_LOCAL_MESSAGES_PER_CONVERSATION = 5_000;
export const MAX_LOCAL_CONVERSATIONS = 500;
export const MAX_LOCAL_STICKER_PAGES = 24;
export const MAX_LOCAL_STICKER_DETAILS = 96;

export type MessageCursor = {
  createdAt: string;
  messageId: string;
};

export type LocalCacheEntry<T> = {
  cachedAt: number;
  value: T;
};

export interface ChatLocalRepository {
  initialize(): Promise<void>;
  getRecentMessages(ownerId: string, conversationId: string, limit: number): Promise<ChatMessage[]>;
  getOlderMessages(ownerId: string, conversationId: string, before: MessageCursor, limit: number): Promise<ChatMessage[]>;
  getLatestMessage(ownerId: string, conversationId: string): Promise<ChatMessage | null>;
  upsertMessage(ownerId: string, message: ChatMessage): Promise<void>;
  upsertMessages(ownerId: string, messages: ChatMessage[]): Promise<void>;
  replaceMessage(ownerId: string, optimisticId: string, confirmed: ChatMessage): Promise<void>;
  removeMessage(ownerId: string, messageId: string): Promise<void>;
  getConversations(ownerId: string): Promise<Conversation[]>;
  upsertConversation(ownerId: string, conversation: Conversation): Promise<void>;
  upsertConversations(ownerId: string, conversations: Conversation[]): Promise<void>;
  removeConversation(ownerId: string, conversationId: string): Promise<void>;
  getStickerPage(ownerId: string, cacheKey: string): Promise<LocalCacheEntry<StickerPackPage> | null>;
  putStickerPage(ownerId: string, cacheKey: string, value: StickerPackPage, cachedAt: number): Promise<void>;
  getStickerDetail(ownerId: string, packId: string): Promise<LocalCacheEntry<StickerPackDetail> | null>;
  putStickerDetail(ownerId: string, packId: string, value: StickerPackDetail, cachedAt: number): Promise<void>;
  clearOwner(ownerId: string): Promise<void>;
}

export const messageCursor = (message: ChatMessage): MessageCursor => ({
  createdAt: message.createdAt,
  messageId: message.id,
});

export const conversationSortAt = (conversation: Conversation) =>
  conversation.lastMessage?.createdAt ?? "";

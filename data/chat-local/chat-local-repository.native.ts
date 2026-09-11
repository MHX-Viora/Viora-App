import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import type { ChatMessage, Conversation } from "@/types/chat";
import type { StickerPackDetail, StickerPackPage } from "@/types/sticker";
import {
  CHAT_LOCAL_DATABASE_VERSION,
  type ChatLocalRepository,
  type LocalCacheEntry,
  type MessageCursor,
  MAX_LOCAL_CONVERSATIONS,
  MAX_LOCAL_MESSAGES_PER_CONVERSATION,
  MAX_LOCAL_STICKER_DETAILS,
  MAX_LOCAL_STICKER_PAGES,
  conversationSortAt,
} from "./chat-local-repository.types";

type PayloadRow = { payload: string };
type CacheRow = PayloadRow & { cached_at: number };

const parse = <T>(row: PayloadRow | null): T | null => {
  if (!row) return null;
  try { return JSON.parse(row.payload) as T; } catch { return null; }
};

const parseMany = <T>(rows: PayloadRow[]) =>
  rows.map((row) => parse<T>(row)).filter((value): value is T => value !== null);

class NativeChatLocalRepository implements ChatLocalRepository {
  private dbPromise: Promise<SQLiteDatabase> | null = null;

  private async db() {
    if (!this.dbPromise) this.dbPromise = this.open();
    return this.dbPromise;
  }

  private async open() {
    const db = await openDatabaseAsync("ankt-chat-cache.db");
    const current = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    if ((current?.user_version ?? 0) < 1) {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS messages (
          owner_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          client_render_id TEXT,
          created_at TEXT NOT NULL,
          payload TEXT NOT NULL,
          PRIMARY KEY (owner_id, message_id)
        );
        CREATE INDEX IF NOT EXISTS idx_messages_owner_conversation_created
          ON messages(owner_id, conversation_id, created_at DESC, message_id DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_owner_client_render
          ON messages(owner_id, client_render_id);
        CREATE TABLE IF NOT EXISTS conversations (
          owner_id TEXT NOT NULL,
          conversation_id TEXT NOT NULL,
          sort_at TEXT NOT NULL,
          payload TEXT NOT NULL,
          PRIMARY KEY (owner_id, conversation_id)
        );
        CREATE INDEX IF NOT EXISTS idx_conversations_owner_sort
          ON conversations(owner_id, sort_at DESC);
        CREATE TABLE IF NOT EXISTS sticker_pages (
          owner_id TEXT NOT NULL,
          cache_key TEXT NOT NULL,
          cached_at INTEGER NOT NULL,
          payload TEXT NOT NULL,
          PRIMARY KEY (owner_id, cache_key)
        );
        CREATE TABLE IF NOT EXISTS sticker_details (
          owner_id TEXT NOT NULL,
          pack_id TEXT NOT NULL,
          cached_at INTEGER NOT NULL,
          payload TEXT NOT NULL,
          PRIMARY KEY (owner_id, pack_id)
        );
      `);
    }
    if ((current?.user_version ?? 0) < 2) {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_sticker_pages_owner_cached
          ON sticker_pages(owner_id, cached_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sticker_details_owner_cached
          ON sticker_details(owner_id, cached_at DESC);
      `);
    }
    await db.execAsync(`PRAGMA user_version = ${CHAT_LOCAL_DATABASE_VERSION}`);
    return db;
  }

  async initialize() { await this.db(); }

  async getRecentMessages(ownerId: string, conversationId: string, limit: number) {
    const db = await this.db();
    return parseMany<ChatMessage>(await db.getAllAsync<PayloadRow>(
      `SELECT payload FROM messages WHERE owner_id = ? AND conversation_id = ?
       ORDER BY created_at DESC, message_id DESC LIMIT ?`,
      ownerId, conversationId, limit,
    ));
  }

  async getOlderMessages(ownerId: string, conversationId: string, before: MessageCursor, limit: number) {
    const db = await this.db();
    return parseMany<ChatMessage>(await db.getAllAsync<PayloadRow>(
      `SELECT payload FROM messages
       WHERE owner_id = ? AND conversation_id = ?
         AND (created_at < ? OR (created_at = ? AND message_id < ?))
       ORDER BY created_at DESC, message_id DESC LIMIT ?`,
      ownerId, conversationId, before.createdAt, before.createdAt, before.messageId, limit,
    ));
  }

  async getLatestMessage(ownerId: string, conversationId: string) {
    const db = await this.db();
    return parse<ChatMessage>(await db.getFirstAsync<PayloadRow>(
      `SELECT payload FROM messages WHERE owner_id = ? AND conversation_id = ?
       ORDER BY created_at DESC, message_id DESC LIMIT 1`,
      ownerId, conversationId,
    ));
  }

  async upsertMessage(ownerId: string, message: ChatMessage) {
    await this.upsertMessages(ownerId, [message]);
  }

  async upsertMessages(ownerId: string, messages: ChatMessage[]) {
    if (messages.length === 0) return;
    const db = await this.db();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const message of messages) {
        await transaction.runAsync(
          `INSERT INTO messages(owner_id, conversation_id, message_id, client_render_id, created_at, payload)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(owner_id, message_id) DO UPDATE SET
             conversation_id = excluded.conversation_id,
             client_render_id = excluded.client_render_id,
             created_at = excluded.created_at,
             payload = excluded.payload`,
          ownerId, message.conversationId, message.id, message.clientRenderId ?? null,
          message.createdAt, JSON.stringify(message),
        );
      }
      await transaction.runAsync(
        `DELETE FROM messages WHERE owner_id = ? AND rowid IN (
           SELECT rowid FROM (
             SELECT rowid, ROW_NUMBER() OVER (
               PARTITION BY conversation_id ORDER BY created_at DESC, message_id DESC
             ) AS cache_rank FROM messages WHERE owner_id = ?
           ) WHERE cache_rank > ?
         )`,
        ownerId, ownerId, MAX_LOCAL_MESSAGES_PER_CONVERSATION,
      );
    });
  }

  async replaceMessage(ownerId: string, optimisticId: string, confirmed: ChatMessage) {
    const db = await this.db();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync("DELETE FROM messages WHERE owner_id = ? AND message_id = ?", ownerId, optimisticId);
      await transaction.runAsync(
        `INSERT INTO messages(owner_id, conversation_id, message_id, client_render_id, created_at, payload)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(owner_id, message_id) DO UPDATE SET payload = excluded.payload,
           conversation_id = excluded.conversation_id, client_render_id = excluded.client_render_id,
           created_at = excluded.created_at`,
        ownerId, confirmed.conversationId, confirmed.id, confirmed.clientRenderId ?? optimisticId,
        confirmed.createdAt, JSON.stringify(confirmed),
      );
    });
  }

  async removeMessage(ownerId: string, messageId: string) {
    await (await this.db()).runAsync("DELETE FROM messages WHERE owner_id = ? AND message_id = ?", ownerId, messageId);
  }

  async getConversations(ownerId: string) {
    return parseMany<Conversation>(await (await this.db()).getAllAsync<PayloadRow>(
      `SELECT payload FROM conversations WHERE owner_id = ?
       ORDER BY sort_at DESC, conversation_id DESC LIMIT ?`,
      ownerId, MAX_LOCAL_CONVERSATIONS,
    ));
  }

  async upsertConversation(ownerId: string, conversation: Conversation) {
    await this.upsertConversations(ownerId, [conversation]);
  }

  async upsertConversations(ownerId: string, conversations: Conversation[]) {
    const db = await this.db();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const conversation of conversations) {
        await transaction.runAsync(
          `INSERT INTO conversations(owner_id, conversation_id, sort_at, payload) VALUES (?, ?, ?, ?)
           ON CONFLICT(owner_id, conversation_id) DO UPDATE SET sort_at = excluded.sort_at, payload = excluded.payload`,
          ownerId, conversation.id, conversationSortAt(conversation), JSON.stringify(conversation),
        );
      }
      await transaction.runAsync(
        `DELETE FROM conversations WHERE owner_id = ? AND rowid IN (
           SELECT rowid FROM conversations WHERE owner_id = ?
           ORDER BY sort_at DESC, conversation_id DESC LIMIT -1 OFFSET ?
         )`,
        ownerId, ownerId, MAX_LOCAL_CONVERSATIONS,
      );
    });
  }

  async removeConversation(ownerId: string, conversationId: string) {
    await (await this.db()).runAsync("DELETE FROM conversations WHERE owner_id = ? AND conversation_id = ?", ownerId, conversationId);
  }

  private async getCache<T>(table: "sticker_pages" | "sticker_details", keyColumn: "cache_key" | "pack_id", ownerId: string, key: string): Promise<LocalCacheEntry<T> | null> {
    const row = await (await this.db()).getFirstAsync<CacheRow>(
      `SELECT cached_at, payload FROM ${table} WHERE owner_id = ? AND ${keyColumn} = ?`, ownerId, key,
    );
    const value = parse<T>(row);
    return row && value ? { cachedAt: row.cached_at, value } : null;
  }

  async getStickerPage(ownerId: string, cacheKey: string) {
    return this.getCache<StickerPackPage>("sticker_pages", "cache_key", ownerId, cacheKey);
  }

  async putStickerPage(ownerId: string, cacheKey: string, value: StickerPackPage, cachedAt: number) {
    const db = await this.db();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO sticker_pages(owner_id, cache_key, cached_at, payload) VALUES (?, ?, ?, ?)
         ON CONFLICT(owner_id, cache_key) DO UPDATE SET cached_at = excluded.cached_at, payload = excluded.payload`,
        ownerId, cacheKey, cachedAt, JSON.stringify(value),
      );
      await transaction.runAsync(
        `DELETE FROM sticker_pages WHERE owner_id = ? AND rowid IN (
           SELECT rowid FROM sticker_pages WHERE owner_id = ?
           ORDER BY cached_at DESC, cache_key DESC LIMIT -1 OFFSET ?
         )`,
        ownerId, ownerId, MAX_LOCAL_STICKER_PAGES,
      );
    });
  }

  async getStickerDetail(ownerId: string, packId: string) {
    return this.getCache<StickerPackDetail>("sticker_details", "pack_id", ownerId, packId);
  }

  async putStickerDetail(ownerId: string, packId: string, value: StickerPackDetail, cachedAt: number) {
    const db = await this.db();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO sticker_details(owner_id, pack_id, cached_at, payload) VALUES (?, ?, ?, ?)
         ON CONFLICT(owner_id, pack_id) DO UPDATE SET cached_at = excluded.cached_at, payload = excluded.payload`,
        ownerId, packId, cachedAt, JSON.stringify(value),
      );
      await transaction.runAsync(
        `DELETE FROM sticker_details WHERE owner_id = ? AND rowid IN (
           SELECT rowid FROM sticker_details WHERE owner_id = ?
           ORDER BY cached_at DESC, pack_id DESC LIMIT -1 OFFSET ?
         )`,
        ownerId, ownerId, MAX_LOCAL_STICKER_DETAILS,
      );
    });
  }

  async clearOwner(ownerId: string) {
    const db = await this.db();
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const table of ["messages", "conversations", "sticker_pages", "sticker_details"]) {
        await transaction.runAsync(`DELETE FROM ${table} WHERE owner_id = ?`, ownerId);
      }
    });
  }
}

export const chatLocalRepository: ChatLocalRepository = new NativeChatLocalRepository();
export * from "./chat-local-repository.types";

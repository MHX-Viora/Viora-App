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

type MessageRecord = ChatMessage & { ownerId: string };
type ConversationRecord = { id: string; ownerId: string; payload: Conversation; sortAt: string };
type StickerRecord<T> = { cachedAt: number; id: string; ownerId: string; payload: T };

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error);
  transaction.onerror = () => reject(transaction.error);
});

const cursorValues = <T>(request: IDBRequest<IDBCursorWithValue | null>, limit: number) =>
  new Promise<T[]>((resolve, reject) => {
    const values: T[] = [];
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || values.length >= limit) return resolve(values);
      values.push(cursor.value as T);
      cursor.continue();
    };
  });

class WebChatLocalRepository implements ChatLocalRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("ankt-chat-cache", CHAT_LOCAL_DATABASE_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("messages")) {
            const store = db.createObjectStore("messages", { keyPath: ["ownerId", "id"] });
            store.createIndex("ownerConversationCreated", ["ownerId", "conversationId", "createdAt", "id"]);
          }
          if (!db.objectStoreNames.contains("conversations")) {
            const store = db.createObjectStore("conversations", { keyPath: ["ownerId", "id"] });
            store.createIndex("ownerSortAt", ["ownerId", "sortAt", "id"]);
          }
          const stickerPages = db.objectStoreNames.contains("stickerPages")
            ? request.transaction!.objectStore("stickerPages")
            : db.createObjectStore("stickerPages", { keyPath: ["ownerId", "id"] });
          if (!stickerPages.indexNames.contains("ownerCachedAt")) {
            stickerPages.createIndex("ownerCachedAt", ["ownerId", "cachedAt", "id"]);
          }
          const stickerDetails = db.objectStoreNames.contains("stickerDetails")
            ? request.transaction!.objectStore("stickerDetails")
            : db.createObjectStore("stickerDetails", { keyPath: ["ownerId", "id"] });
          if (!stickerDetails.indexNames.contains("ownerCachedAt")) {
            stickerDetails.createIndex("ownerCachedAt", ["ownerId", "cachedAt", "id"]);
          }
        };
      });
    }
    return this.dbPromise;
  }

  async initialize() { await this.db(); }

  private messageRange(ownerId: string, conversationId: string) {
    return IDBKeyRange.bound(
      [ownerId, conversationId, "", ""],
      [ownerId, conversationId, "\uffff", "\uffff"],
    );
  }

  async getRecentMessages(ownerId: string, conversationId: string, limit: number) {
    const transaction = (await this.db()).transaction("messages", "readonly");
    const index = transaction.objectStore("messages").index("ownerConversationCreated");
    const records = await cursorValues<MessageRecord>(index.openCursor(this.messageRange(ownerId, conversationId), "prev"), limit);
    return records.map(({ ownerId: _ownerId, ...message }) => message);
  }

  async getOlderMessages(ownerId: string, conversationId: string, before: MessageCursor, limit: number) {
    const transaction = (await this.db()).transaction("messages", "readonly");
    const index = transaction.objectStore("messages").index("ownerConversationCreated");
    const range = IDBKeyRange.bound(
      [ownerId, conversationId, "", ""],
      [ownerId, conversationId, before.createdAt, before.messageId],
      false,
      true,
    );
    const records = await cursorValues<MessageRecord>(index.openCursor(range, "prev"), limit);
    return records.map(({ ownerId: _ownerId, ...message }) => message);
  }

  async getLatestMessage(ownerId: string, conversationId: string) {
    return (await this.getRecentMessages(ownerId, conversationId, 1))[0] ?? null;
  }

  async upsertMessage(ownerId: string, message: ChatMessage) {
    await this.upsertMessages(ownerId, [message]);
  }

  async upsertMessages(ownerId: string, messages: ChatMessage[]) {
    if (messages.length === 0) return;
    const transaction = (await this.db()).transaction("messages", "readwrite");
    const store = transaction.objectStore("messages");
    messages.forEach((message) => store.put({ ...message, ownerId } satisfies MessageRecord));
    await transactionDone(transaction);
    await this.pruneMessages(ownerId, [...new Set(messages.map(({ conversationId }) => conversationId))]);
  }

  private async pruneMessages(ownerId: string, conversationIds: string[]) {
    for (const conversationId of conversationIds) {
      const transaction = (await this.db()).transaction("messages", "readwrite");
      const store = transaction.objectStore("messages");
      const index = store.index("ownerConversationCreated");
      let seen = 0;
      await new Promise<void>((resolve, reject) => {
        const request = index.openCursor(this.messageRange(ownerId, conversationId), "prev");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return resolve();
          seen += 1;
          if (seen > MAX_LOCAL_MESSAGES_PER_CONVERSATION) cursor.delete();
          cursor.continue();
        };
      });
      await transactionDone(transaction);
    }
  }

  async replaceMessage(ownerId: string, optimisticId: string, confirmed: ChatMessage) {
    const transaction = (await this.db()).transaction("messages", "readwrite");
    const store = transaction.objectStore("messages");
    store.delete([ownerId, optimisticId]);
    store.put({ ...confirmed, ownerId } satisfies MessageRecord);
    await transactionDone(transaction);
  }

  async removeMessage(ownerId: string, messageId: string) {
    const transaction = (await this.db()).transaction("messages", "readwrite");
    transaction.objectStore("messages").delete([ownerId, messageId]);
    await transactionDone(transaction);
  }

  async getConversations(ownerId: string) {
    const transaction = (await this.db()).transaction("conversations", "readonly");
    const index = transaction.objectStore("conversations").index("ownerSortAt");
    const range = IDBKeyRange.bound([ownerId, "", ""], [ownerId, "\uffff", "\uffff"]);
    const records = await cursorValues<ConversationRecord>(index.openCursor(range, "prev"), MAX_LOCAL_CONVERSATIONS);
    return records.map(({ payload }) => payload);
  }

  async upsertConversation(ownerId: string, conversation: Conversation) {
    await this.upsertConversations(ownerId, [conversation]);
  }

  async upsertConversations(ownerId: string, conversations: Conversation[]) {
    const transaction = (await this.db()).transaction("conversations", "readwrite");
    const store = transaction.objectStore("conversations");
    conversations.forEach((conversation) => store.put({
      id: conversation.id, ownerId, payload: conversation, sortAt: conversationSortAt(conversation),
    } satisfies ConversationRecord));
    await transactionDone(transaction);
    await this.pruneByIndex("conversations", "ownerSortAt", ownerId, MAX_LOCAL_CONVERSATIONS);
  }

  async removeConversation(ownerId: string, conversationId: string) {
    const transaction = (await this.db()).transaction("conversations", "readwrite");
    transaction.objectStore("conversations").delete([ownerId, conversationId]);
    await transactionDone(transaction);
  }

  private async getSticker<T>(storeName: "stickerPages" | "stickerDetails", ownerId: string, id: string): Promise<LocalCacheEntry<T> | null> {
    const transaction = (await this.db()).transaction(storeName, "readonly");
    const record = await requestResult(transaction.objectStore(storeName).get([ownerId, id])) as StickerRecord<T> | undefined;
    return record ? { cachedAt: record.cachedAt, value: record.payload } : null;
  }

  private async pruneByIndex(
    storeName: "conversations" | "stickerPages" | "stickerDetails",
    indexName: "ownerSortAt" | "ownerCachedAt",
    ownerId: string,
    limit: number,
  ) {
    const transaction = (await this.db()).transaction(storeName, "readwrite");
    const index = transaction.objectStore(storeName).index(indexName);
    const range = indexName === "ownerSortAt"
      ? IDBKeyRange.bound([ownerId, "", ""], [ownerId, "\uffff", "\uffff"])
      : IDBKeyRange.bound([ownerId, -Number.MAX_VALUE, ""], [ownerId, Number.MAX_VALUE, "\uffff"]);
    let seen = 0;
    await new Promise<void>((resolve, reject) => {
      const request = index.openCursor(range, "prev");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return resolve();
        seen += 1;
        if (seen > limit) cursor.delete();
        cursor.continue();
      };
    });
    await transactionDone(transaction);
  }

  async getStickerPage(ownerId: string, cacheKey: string) {
    return this.getSticker<StickerPackPage>("stickerPages", ownerId, cacheKey);
  }

  async putStickerPage(ownerId: string, cacheKey: string, value: StickerPackPage, cachedAt: number) {
    const transaction = (await this.db()).transaction("stickerPages", "readwrite");
    transaction.objectStore("stickerPages").put({ cachedAt, id: cacheKey, ownerId, payload: value } satisfies StickerRecord<StickerPackPage>);
    await transactionDone(transaction);
    await this.pruneByIndex("stickerPages", "ownerCachedAt", ownerId, MAX_LOCAL_STICKER_PAGES);
  }

  async getStickerDetail(ownerId: string, packId: string) {
    return this.getSticker<StickerPackDetail>("stickerDetails", ownerId, packId);
  }

  async putStickerDetail(ownerId: string, packId: string, value: StickerPackDetail, cachedAt: number) {
    const transaction = (await this.db()).transaction("stickerDetails", "readwrite");
    transaction.objectStore("stickerDetails").put({ cachedAt, id: packId, ownerId, payload: value } satisfies StickerRecord<StickerPackDetail>);
    await transactionDone(transaction);
    await this.pruneByIndex("stickerDetails", "ownerCachedAt", ownerId, MAX_LOCAL_STICKER_DETAILS);
  }

  async clearOwner(ownerId: string) {
    const db = await this.db();
    for (const storeName of ["messages", "conversations", "stickerPages", "stickerDetails"]) {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.openCursor();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return resolve();
          if ((cursor.value as { ownerId?: string }).ownerId === ownerId) cursor.delete();
          cursor.continue();
        };
      });
      await transactionDone(transaction);
    }
  }
}

export const chatLocalRepository: ChatLocalRepository = new WebChatLocalRepository();
export * from "./chat-local-repository.types";

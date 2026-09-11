import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MESSAGE_CACHE_TTL_MS,
  clearMessageCache,
  getMessageCache,
  isMessageCacheStale,
  deleteMessageRetry,
  getMessageRetry,
  replaceCachedMessage,
  setMessageRetry,
  setCachedMessagePage,
  upsertCachedMessage,
} from "./message-cache.ts";

const sessionStore = readFileSync(new URL("./session-store.ts", import.meta.url), "utf8");

const message = (id, overrides = {}) => ({
  attachments: [],
  content: id,
  conversationId: "room-a",
  createdAt: "2026-01-01T00:00:00.000Z",
  id,
  isDeleted: false,
  isEdited: false,
  isMine: false,
  messageType: 0,
  reactions: [],
  reply: null,
  sender: { avatarUrl: null, displayName: "User", id: "user-1" },
  ...overrides,
});

test("message cache keeps pages isolated by conversation and deduplicates IDs", () => {
  clearMessageCache();
  setCachedMessagePage("room-a", [message("m2"), message("m1")], 1, 2, 100);
  setCachedMessagePage("room-a", [message("m1"), message("m0")], 2, 2, 110);
  setCachedMessagePage("room-b", [message("b1", { conversationId: "room-b" })], 1, 1, 120);

  assert.deepEqual(getMessageCache("room-a")?.messages.map(({ id }) => id), ["m2", "m1", "m0"]);
  assert.deepEqual(getMessageCache("room-b")?.messages.map(({ id }) => id), ["b1"]);
  assert.equal(getMessageCache("room-a")?.page, 2);
});

test("first-page revalidation preserves pending messages and loaded history", () => {
  clearMessageCache();
  setCachedMessagePage("room-a", [message("pending-1", { isMine: true, sendStatus: "failed" }), message("old")], 2, 2, 100);
  setCachedMessagePage("room-a", [message("new"), message("old")], 1, 3, 200);

  assert.deepEqual(getMessageCache("room-a")?.messages.map(({ id }) => id), ["pending-1", "new", "old"]);
  assert.equal(getMessageCache("room-a")?.page, 2);
  assert.equal(getMessageCache("room-a")?.totalPages, 3);
});

test("realtime upsert and optimistic replacement do not create duplicates", () => {
  clearMessageCache();
  upsertCachedMessage("room-a", message("pending-1", { clientRenderId: "pending-1", isMine: true }));
  replaceCachedMessage("room-a", "pending-1", message("server-1", { clientRenderId: "pending-1", isMine: true }));
  upsertCachedMessage("room-a", message("server-1", { isMine: true }));

  assert.deepEqual(getMessageCache("room-a")?.messages.map(({ id }) => id), ["server-1"]);
});

test("message cache freshness uses the bounded TTL", () => {
  clearMessageCache();
  assert.equal(isMessageCacheStale("room-a", 10), true);
  setCachedMessagePage("room-a", [message("m1")], 1, 1, 1_000);
  assert.equal(isMessageCacheStale("room-a", 1_000 + MESSAGE_CACHE_TTL_MS - 1), false);
  assert.equal(isMessageCacheStale("room-a", 1_000 + MESSAGE_CACHE_TTL_MS), true);
});

test("failed optimistic messages keep bounded in-memory retry payloads", () => {
  clearMessageCache();
  const payload = { attachments: [], content: "retry", conversationId: "room-a" };
  setMessageRetry("room-a", "pending-1", payload);
  assert.equal(getMessageRetry("room-a", "pending-1"), payload);
  deleteMessageRetry("room-a", "pending-1");
  assert.equal(getMessageRetry("room-a", "pending-1"), undefined);
});

test("ending the session clears message history cache", () => {
  assert.match(sessionStore, /clearSession[\s\S]*clearMessageCache\(\)/);
});

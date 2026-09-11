import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createMemoryChatLocalRepository } from "./chat-local-repository.memory.ts";

const message = (id, conversationId, createdAt) => ({
  attachments: [],
  content: id,
  conversationId,
  createdAt,
  id,
  isDeleted: false,
  isEdited: false,
  isMine: false,
  messageType: 0,
  reactions: [],
  reply: null,
  sender: { avatarUrl: null, displayName: "User", id: "sender-1" },
});

test("local repository upserts messages and isolates owners and rooms", async () => {
  const repository = createMemoryChatLocalRepository();
  await repository.initialize();
  await repository.upsertMessages("owner-a", [
    message("m1", "room-a", "2026-09-11T01:00:00.000Z"),
    message("m2", "room-a", "2026-09-11T02:00:00.000Z"),
    message("b1", "room-b", "2026-09-11T03:00:00.000Z"),
  ]);
  await repository.upsertMessages("owner-a", [
    message("m2", "room-a", "2026-09-11T02:00:00.000Z"),
  ]);
  await repository.upsertMessages("owner-b", [
    message("m3", "room-a", "2026-09-11T04:00:00.000Z"),
  ]);

  assert.deepEqual(
    (await repository.getRecentMessages("owner-a", "room-a", 10)).map(({ id }) => id),
    ["m2", "m1"],
  );
  assert.deepEqual(
    (await repository.getRecentMessages("owner-b", "room-a", 10)).map(({ id }) => id),
    ["m3"],
  );
});

test("local pagination returns only messages older than the supplied cursor", async () => {
  const repository = createMemoryChatLocalRepository();
  await repository.upsertMessages("owner-a", [
    message("m1", "room-a", "2026-09-11T01:00:00.000Z"),
    message("m2", "room-a", "2026-09-11T02:00:00.000Z"),
    message("m3", "room-a", "2026-09-11T03:00:00.000Z"),
  ]);

  const older = await repository.getOlderMessages(
    "owner-a",
    "room-a",
    { createdAt: "2026-09-11T03:00:00.000Z", messageId: "m3" },
    2,
  );
  assert.deepEqual(older.map(({ id }) => id), ["m2", "m1"]);
});

test("local repository persists conversations and sticker metadata without binary fields", async () => {
  const repository = createMemoryChatLocalRepository();
  const conversation = { id: "room-a", name: "Room A", unreadCount: 2 };
  const page = { items: [{ id: "pack-1", name: "Pack" }], page: 1 };
  const detail = {
    pack: { id: "pack-1", name: "Pack" },
    stickers: [{ id: "sticker-1", imageUrl: "https://cdn/sticker.webp" }],
  };

  await repository.upsertConversations("owner-a", [conversation]);
  await repository.putStickerPage("owner-a", "usable:1:50", page, 100);
  await repository.putStickerDetail("owner-a", "pack-1", detail, 200);

  assert.deepEqual(await repository.getConversations("owner-a"), [conversation]);
  assert.equal((await repository.getStickerPage("owner-a", "usable:1:50"))?.cachedAt, 100);
  assert.equal((await repository.getStickerDetail("owner-a", "pack-1"))?.cachedAt, 200);
  assert.doesNotMatch(JSON.stringify(detail), /base64|data:/i);
});

test("platform adapters keep SQLite out of web and IndexedDB out of native", () => {
  const nativeSource = readFileSync(new URL("./chat-local-repository.native.ts", import.meta.url), "utf8");
  const webSource = readFileSync(new URL("./chat-local-repository.web.ts", import.meta.url), "utf8");

  assert.match(nativeSource, /from "expo-sqlite"/);
  assert.match(nativeSource, /PRAGMA user_version/);
  assert.match(nativeSource, /idx_messages_owner_conversation_created/);
  assert.doesNotMatch(nativeSource, /indexedDB/);
  assert.match(webSource, /indexedDB\.open/);
  assert.match(webSource, /ownerConversationCreated/);
  assert.doesNotMatch(webSource, /expo-sqlite/);
});

test("local metadata caches evict old records instead of growing without a bound", async () => {
  const repository = createMemoryChatLocalRepository();
  for (let index = 0; index < 501; index += 1) {
    await repository.upsertConversation("owner-a", {
      id: `room-${index}`,
      lastMessage: { createdAt: new Date(index).toISOString() },
    });
  }
  for (let index = 0; index < 25; index += 1) {
    await repository.putStickerPage("owner-a", `page-${index}`, { items: [], page: index }, index);
  }
  for (let index = 0; index < 97; index += 1) {
    await repository.putStickerDetail("owner-a", `pack-${index}`, { pack: {}, stickers: [] }, index);
  }

  assert.equal((await repository.getConversations("owner-a")).length, 500);
  assert.equal(await repository.getStickerPage("owner-a", "page-0"), null);
  assert.equal(await repository.getStickerDetail("owner-a", "pack-0"), null);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  clearConversationListCache,
  getConversationListCache,
  isConversationListCacheStale,
  setConversationListCache,
} from "./conversation-list-cache.ts";

const conversationsScreen = readFileSync(
  new URL("../features/chat/conversations-screen.tsx", import.meta.url),
  "utf8",
);
const sessionStore = readFileSync(
  new URL("./session-store.ts", import.meta.url),
  "utf8",
);
const cacheSource = readFileSync(new URL("./conversation-list-cache.ts", import.meta.url), "utf8");

test("conversation list cache survives screen remounts until the session ends", () => {
  const conversations = [{ id: "room-1" }, { id: "room-2" }];

  setConversationListCache(conversations);
  assert.deepEqual(getConversationListCache(), conversations);

  clearConversationListCache();
  assert.deepEqual(getConversationListCache(), []);
});

test("conversation list cache is fresh for thirty seconds", () => {
  clearConversationListCache();
  setConversationListCache([{ id: "room-1" }], 1_000);
  assert.equal(isConversationListCacheStale(30_999), false);
  assert.equal(isConversationListCacheStale(31_000), true);
});

test("conversation sidebar restores cached rows without a full loading state", () => {
  assert.match(conversationsScreen, /useStore\(\s*conversationCacheStore/);
  assert.match(
    conversationsScreen,
    /useState<Conversation\[\]>\(getConversationListCache\)/,
  );
  assert.match(conversationsScreen, /useState\(items\.length === 0\)/);
  assert.match(conversationsScreen, /isConversationListCacheStale\(\)/);
  assert.match(conversationsScreen, /setConversationListCache\(result\.items, Date\.now\(\)\)/);
  assert.match(conversationsScreen, /lastMessage: \{[\s\S]{0,300}\.\.\.event\.message/);
  assert.match(conversationsScreen, /readLocalConversations\(\)/);
  assert.match(conversationsScreen, /setIsLoading\(false\)/);
  assert.match(conversationsScreen, /persistLocalConversations\(next\)/);
});

test("conversation memory cache is Zustand-backed", () => {
  assert.match(cacheSource, /from "zustand\/vanilla"/);
  assert.match(cacheSource, /createStore<ConversationCacheState>/);
});

test("ending the session clears cached conversation content", () => {
  assert.match(sessionStore, /clearSession[\s\S]*clearConversationListCache\(\)/);
  assert.match(sessionStore, /clearSession[\s\S]*deleteItemAsync/);
});

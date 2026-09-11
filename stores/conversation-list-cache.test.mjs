import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  clearConversationListCache,
  getConversationListCache,
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

test("conversation list cache survives screen remounts until the session ends", () => {
  const conversations = [{ id: "room-1" }, { id: "room-2" }];

  setConversationListCache(conversations);
  assert.deepEqual(getConversationListCache(), conversations);

  clearConversationListCache();
  assert.deepEqual(getConversationListCache(), []);
});

test("conversation sidebar restores cached rows without a full loading state", () => {
  assert.match(
    conversationsScreen,
    /useState<Conversation\[\]>\(getConversationListCache\)/,
  );
  assert.match(conversationsScreen, /useState\(items\.length === 0\)/);
  assert.match(conversationsScreen, /setConversationListCache\(items\)/);
});

test("ending the session clears cached conversation content", () => {
  assert.match(
    sessionStore,
    /clearSession[\s\S]*clearConversationListCache\(\)[\s\S]*deleteItemAsync/,
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");

test("chat loads the first message page only when entering or changing rooms", () => {
  assert.match(
    chatScreen,
    /getMessageCache\(conversationId\)/,
  );
  assert.match(chatScreen, /isMessageCacheStale\(conversationId\)/);
  assert.match(chatScreen, /cached\?\.initialized \? "background" : "initial"/);
  assert.match(chatScreen, /setCachedMessagePage\(/);
  assert.doesNotMatch(chatScreen, /subscribeRealtimeSyncRequests/);
});

test("cached messages render without the full-screen loading state", () => {
  assert.match(chatScreen, /useState<ChatMessage\[\]>\(\(\) =>[\s\S]{0,80}getCachedMessages\(conversationId\)/);
  assert.match(chatScreen, /useState\([\s\S]{0,80}\(\) => !getMessageCache\(conversationId\)\?\.initialized/);
  assert.match(chatScreen, /mode: "initial" \| "background" \| "more"/);
});

test("older messages remain user-driven through list pagination", () => {
  assert.match(
    chatScreen,
    /onEndReached=\{\(\) => \{\s*if \(!isLoadingMore && page < totalPages\) load\(page \+ 1, "more"\);/,
  );
});

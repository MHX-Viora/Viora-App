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
  assert.match(chatScreen, /hydrated\?\.initialized \? "background" : "initial"/);
  assert.match(chatScreen, /setCachedMessagePage\(/);
  assert.doesNotMatch(chatScreen, /subscribeRealtimeSyncRequests/);
});

test("cached messages render without the full-screen loading state", () => {
  assert.match(chatScreen, /useStore\(\s*messageCacheStore/);
  assert.match(chatScreen, /useState<ChatMessage\[\]>\(\(\) =>[\s\S]{0,80}getCachedMessages\(conversationId\)/);
  assert.match(chatScreen, /useState\([\s\S]{0,80}\(\) => !getMessageCache\(conversationId\)\?\.initialized/);
  assert.match(chatScreen, /mode: "initial" \| "background" \| "more"/);
});

test("room startup hydrates persistent messages before background server sync", () => {
  assert.match(chatScreen, /readRecentLocalMessages\(conversationId, CHAT_PAGE_SIZE\)/);
  assert.match(chatScreen, /localMessages\.length > 0[\s\S]{0,500}setIsLoading\(false\)/);
  assert.match(chatScreen, /hydrated\?\.initialized \? "background" : "initial"/);
  assert.match(chatScreen, /persistLocalMessages\(nextItems\)/);
  assert.match(chatScreen, /afterMessageId: mode === "background" \? newestConfirmed\?\.id/);
  assert.match(chatScreen, /deltaBatches < 10/);
  assert.match(chatScreen, /nextCursor = result\.items\.at\(-1\)\?\.id/);
});

test("group rooms refresh message permissions even when messages are cached", () => {
  assert.match(chatScreen, /useFocusEffect\(\s*useCallback\(\(\) => \{[\s\S]{0,300}if \(!isGroupConversation\) return;[\s\S]{0,180}load\(1, "background"\)/);
  assert.match(chatScreen, /messagePermissions === null[\s\S]{0,220}Đang kiểm tra quyền gửi tin nhắn/);
  assert.match(chatScreen, /!canSendInConversation[\s\S]{0,350}ChatComposerNotice/);
});

test("older messages remain user-driven through list pagination", () => {
  assert.match(
    chatScreen,
    /onEndReached=\{\(\) => \{\s*if \(!isLoadingMore && page < totalPages\) load\(page \+ 1, "more"\);/,
  );
  assert.match(chatScreen, /readOlderLocalMessages\(/);
  assert.match(chatScreen, /if \(localItems\.length === CHAT_PAGE_SIZE\) return/);
  assert.match(chatScreen, /current\.length >= MAX_MESSAGES_PER_CONVERSATION/);
});

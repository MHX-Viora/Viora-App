import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");

test("chat loads the first message page only when entering or changing rooms", () => {
  assert.match(
    chatScreen,
    /useEffect\(\(\) => \{\s*load\(1, "initial"\);\s*\}, \[load\]\);/,
  );
  assert.doesNotMatch(chatScreen, /subscribeRealtimeSyncRequests/);
});

test("older messages remain user-driven through list pagination", () => {
  assert.match(
    chatScreen,
    /onEndReached=\{\(\) => \{\s*if \(!isLoadingMore && page < totalPages\) load\(page \+ 1, "more"\);/,
  );
});

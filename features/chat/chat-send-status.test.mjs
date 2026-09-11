import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");
const chatTypes = readFileSync(new URL("../../types/chat.ts", import.meta.url), "utf8");

test("outgoing send status appears after the timestamp with a compact separator", () => {
  assert.match(chatScreen, /function MessageSendStatus/);
  assert.match(
    chatScreen,
    /styles\.messageMeta[\s\S]{0,500}formatChatTime\(message\.createdAt\)[\s\S]{0,500}<MessageSendStatus/,
  );
  assert.match(chatScreen, /displayedStatus === "sending" \? "· Đang gửi" : "· Gửi lỗi"/);
  assert.doesNotMatch(chatScreen, /Đang gửi…/);
  assert.match(chatScreen, /sendStatus: \{[\s\S]{0,120}fontSize: 10/);
});

test("confirmed messages animate the pending label away without remounting", () => {
  assert.match(chatScreen, /Animated\.timing/);
  assert.match(chatTypes, /clientRenderId\?: string/);
  assert.match(chatScreen, /keyExtractor=\{\(item\) => item\.clientRenderId \?\? item\.id\}/);
  assert.match(chatScreen, /clientRenderId: optimisticId/g);
});

test("own realtime confirmation waits for its optimistic message instead of rendering a duplicate", () => {
  assert.match(
    chatScreen,
    /pendingOutgoingIdsRef = useRef\(new Set<string>\(\)\)/,
  );
  assert.match(
    chatScreen,
    /nextMessage\.isMine && pendingOutgoingIdsRef\.current\.size > 0[\s\S]{0,180}bufferedMineMessagesRef\.current\.set\(nextMessage\.id, nextMessage\)/,
  );
  assert.equal(
    chatScreen.match(/pendingOutgoingIdsRef\.current\.add\(optimisticId\)/g)?.length,
    3,
  );
  assert.equal(
    chatScreen.match(/finishPendingOutgoing\(optimisticId, sentMessage\.id\)/g)?.length,
    3,
  );
});

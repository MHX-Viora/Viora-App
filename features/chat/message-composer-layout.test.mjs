import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getMessageInputHeight,
  isMessageInputScrollable,
  MAX_MESSAGE_INPUT_HEIGHT,
  MIN_MESSAGE_INPUT_HEIGHT,
} from "./message-composer-layout.ts";

const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");

test("message input height stays between 44 and 116 pixels", () => {
  assert.equal(MIN_MESSAGE_INPUT_HEIGHT, 44);
  assert.equal(MAX_MESSAGE_INPUT_HEIGHT, 116);
  assert.equal(getMessageInputHeight(20), 44);
  assert.equal(getMessageInputHeight(72), 72);
  assert.equal(getMessageInputHeight(400), 116);
  assert.equal(getMessageInputHeight(Number.NaN), 44);
});

test("message input scrolls only after reaching its maximum height", () => {
  assert.equal(isMessageInputScrollable(115), false);
  assert.equal(isMessageInputScrollable(116), true);
  assert.equal(isMessageInputScrollable(400), true);
});

test("shared composer controls height and preserves existing action handlers", () => {
  assert.match(chatScreen, /onContentSizeChange=\{handleMessageInputContentSizeChange\}/);
  assert.match(chatScreen, /scrollEnabled=\{isMessageInputScrollableState\}/);
  assert.match(chatScreen, /style=\{\[styles\.input, \{ height: messageInputHeight \}\]\}/);
  assert.match(chatScreen, /setMessageInputHeight\(MIN_MESSAGE_INPUT_HEIGHT\)/);
  assert.match(chatScreen, /name=\{showChatTools \? "close" : "add"\}/);
  assert.match(
    chatScreen,
    /accessibilityLabel=\{\s*showChatTools \? "Ẩn đính kèm" : "Đính kèm"\s*\}/,
  );
  assert.match(chatScreen, /onPress=\{send\}/);
  assert.match(chatScreen, /onSelect=\{\(sticker\) => void sendSticker\(sticker\)\}/);
  assert.match(chatScreen, /takePhoto\(\)/);
  assert.match(chatScreen, /pickMedia\(\["images"\]\)/);
  assert.match(chatScreen, /pickMedia\(\["videos"\]\)/);
  assert.match(chatScreen, /pickFiles\(\)/);
  assert.match(chatScreen, /toggleRecording\(\)/);
});

test("native composer actions cannot shrink away and stay visibly distinct", () => {
  assert.match(
    chatScreen,
    /composerActionButton:\s*\{[\s\S]*?backgroundColor: colors\.primarySoft[\s\S]*?flexShrink: 0[\s\S]*?minWidth: 44/,
  );
  assert.match(
    chatScreen,
    /color=\{showChatTools \? colors\.primaryContrast : colors\.primary\}/,
  );
  assert.match(
    chatScreen,
    /color=\{showStickers \? colors\.primaryContrast : colors\.primary\}/,
  );
});

test("tapping outside an open attachment or sticker panel closes it", () => {
  assert.match(
    chatScreen,
    /\{\(showChatTools \|\| showStickers\) && \([\s\S]*?onPress=\{dismissComposerPanels\}[\s\S]*?styles\.composerDismissLayer/,
  );
  assert.match(
    chatScreen,
    /dismissComposerPanels[\s\S]*?setShowChatTools\(false\)[\s\S]*?setShowStickers\(false\)/,
  );
  assert.match(chatScreen, /composerDismissLayer:[\s\S]*?zIndex: 1/);
  assert.match(chatScreen, /composer:[\s\S]*?zIndex: 2/);
});

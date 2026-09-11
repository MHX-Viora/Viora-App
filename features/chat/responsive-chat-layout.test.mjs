import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getDesktopConversationMenuTop,
  getResponsiveConversationSettingsMode,
  getResponsiveChatMode,
  shouldAutoOpenConversationRoute,
} from "./responsive-chat-layout.ts";
import { layout } from "../../theme/layout.ts";

const responsiveScreenSource = readFileSync(
  new URL("./responsive-chat-screen.tsx", import.meta.url),
  "utf8",
);
const chatScreenSource = readFileSync(
  new URL("./chat-screen.tsx", import.meta.url),
  "utf8",
);
const settingsRouteSource = readFileSync(
  new URL("../../app/chat/settings/[conversationId].tsx", import.meta.url),
  "utf8",
);
const conversationsScreenSource = readFileSync(
  new URL("./conversations-screen.tsx", import.meta.url),
  "utf8",
);
const conversationRowSource = readFileSync(
  new URL("../../components/chat/conversation-row.tsx", import.meta.url),
  "utf8",
);
const settingsSubpageSources = [
  "../../app/chat/settings/[conversationId]-attachments.tsx",
  "../../app/chat/settings/[conversationId]-links.tsx",
  "../../app/chat/settings/[conversationId]-search.tsx",
  "../../app/chat/settings/[conversationId]-report.tsx",
  "../../app/chat/settings/attachments.tsx",
  "../../app/chat/settings/links.tsx",
  "../../app/chat/settings/members.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

test("desktop chat keeps the conversation list beside its detail pane", () => {
  assert.equal(
    getResponsiveChatMode({
      hasConversation: false,
      isDesktopWeb: true,
      isLargeDesktop: true,
    }),
    "split-empty",
  );
  assert.equal(
    getResponsiveChatMode({
      hasConversation: true,
      isDesktopWeb: true,
      isLargeDesktop: false,
    }),
    "split-detail",
  );
  assert.equal(
    getResponsiveChatMode({
      hasConversation: true,
      isDesktopWeb: true,
      isLargeDesktop: true,
    }),
    "split-detail-settings",
  );
});

test("compact chat preserves list-to-detail navigation", () => {
  assert.equal(
    getResponsiveChatMode({
      hasConversation: false,
      isDesktopWeb: false,
      isLargeDesktop: false,
    }),
    "list",
  );
  assert.equal(
    getResponsiveChatMode({
      hasConversation: true,
      isDesktopWeb: false,
      isLargeDesktop: false,
    }),
    "detail",
  );
});

test("conversation settings uses the right detail pane only on desktop web", () => {
  assert.equal(
    getResponsiveConversationSettingsMode({
      isDesktopWeb: true,
      isLargeDesktop: true,
    }),
    "room-settings",
  );
  assert.equal(
    getResponsiveConversationSettingsMode({
      isDesktopWeb: true,
      isLargeDesktop: false,
    }),
    "split-settings",
  );
  assert.equal(
    getResponsiveConversationSettingsMode({
      isDesktopWeb: false,
      isLargeDesktop: false,
    }),
    "settings",
  );
  assert.match(settingsRouteSource, /ResponsiveConversationSettingsScreen/);
  assert.match(responsiveScreenSource, /mode === "room-settings"/);
  assert.match(responsiveScreenSource, /styles\.settingsPane/);
});

test("desktop room action popover stays near the pressed row and inside the viewport", () => {
  assert.equal(
    getDesktopConversationMenuTop({ anchorY: 250, viewportHeight: 900 }),
    218,
  );
  assert.equal(
    getDesktopConversationMenuTop({ anchorY: 20, viewportHeight: 900 }),
    80,
  );
  assert.equal(
    getDesktopConversationMenuTop({ anchorY: 860, viewportHeight: 900 }),
    564,
  );
  assert.match(conversationsScreenSource, /styles\.desktopMenuSheet/);
  assert.match(conversationsScreenSource, /getDesktopConversationMenuTop/);
});

test("conversation settings subpages use one compact centered desktop frame", () => {
  assert.equal(layout.chatSettingsSubpageMaxWidth, 640);
  for (const source of settingsSubpageSources) {
    assert.match(source, /ResponsiveContent/);
    assert.match(source, /layout\.chatSettingsSubpageMaxWidth/);
  }
});

test("desktop chat fills the available width without a large desktop cap", () => {
  assert.doesNotMatch(responsiveScreenSource, /maxWidth:\s*breakpoints\.largeDesktop/);
});

test("message scrolling stays enabled without a visible vertical scrollbar", () => {
  assert.match(
    chatScreenSource,
    /ref=\{listRef\}[\s\S]*?showsVerticalScrollIndicator=\{false\}/,
  );
});

test("shared chat header keeps square bottom corners on app and web", () => {
  assert.match(
    chatScreenSource,
    /header:\s*\{[\s\S]{0,260}borderBottomLeftRadius:\s*0[\s\S]{0,120}borderBottomRightRadius:\s*0/,
  );
});

test("conversation verification badge stays directly after the room name", () => {
  assert.match(
    conversationRowSource,
    /title:\s*\{[\s\S]{0,120}flexShrink:\s*1/,
  );
  assert.doesNotMatch(
    conversationRowSource,
    /title:\s*\{[\s\S]{0,120}\bflex:\s*1/,
  );
});

test("chat tools expose clear media actions in a neutral three-column grid", () => {
  for (const action of [
    /takePhoto\(\)/,
    /pickMedia\(\["images"\]\)/,
    /pickMedia\(\["videos"\]\)/,
    /pickFiles\(\)/,
    /toggleRecording\(\)/,
    /shareLocation\(\)/,
  ]) {
    assert.match(chatScreenSource, action);
  }
  assert.match(chatScreenSource, /styles\.toolIcon/);
  assert.match(chatScreenSource, /toolIcon:[\s\S]*?backgroundColor: colors\.primarySoft/);
  assert.match(chatScreenSource, /width:\s*"33\.333%"/);
});

test("sticker is a consistent quick action beside attachment", () => {
  const toolsPanel = chatScreenSource.match(
    /\{showChatTools && \([\s\S]*?\{recorderState\.isRecording && \(/,
  )?.[0];
  const inputRow = chatScreenSource.match(
    /<View style=\{styles\.inputRow\}>[\s\S]*?<TextInput/,
  )?.[0];

  assert.ok(toolsPanel);
  assert.ok(inputRow);
  assert.doesNotMatch(toolsPanel, /name="happy-outline"/);
  assert.match(
    inputRow,
    /styles\.composerActionButton[\s\S]*?<Ionicons[\s\S]*?colors\.primary[\s\S]*?name=\{showChatTools \? "close" : "add"\}/,
  );
  assert.match(
    inputRow,
    /styles\.composerActionButton[\s\S]*?colors\.primary[\s\S]*?name="sticker-emoji"[\s\S]*?<TextInput/,
  );
});

test("message input pill only contains the text field", () => {
  const messageInputShell = chatScreenSource.match(
    /<View style=\{styles\.messageInputShell\}>[\s\S]*?<\/View>/,
  )?.[0];

  assert.ok(messageInputShell);
  assert.match(messageInputShell, /<TextInput/);
  assert.doesNotMatch(messageInputShell, /<Pressable|pickFiles\(\)|pickMedia\(\)/);
  assert.doesNotMatch(chatScreenSource, /composerQuickAction/);
  assert.match(
    chatScreenSource,
    /messageInputShell:\s*\{[\s\S]*?borderRadius:\s*999/,
  );
});

test("desktop detail sidebar does not reopen the route it is embedded in", () => {
  assert.equal(
    shouldAutoOpenConversationRoute({
      allowRequestedAutoOpen: false,
      openedConversationId: "",
      requestedConversationId: "room-1",
    }),
    false,
  );
});

test("standalone conversation list still opens an unresolved deep link once", () => {
  assert.equal(
    shouldAutoOpenConversationRoute({
      allowRequestedAutoOpen: true,
      openedConversationId: "",
      requestedConversationId: "room-1",
    }),
    true,
  );
  assert.equal(
    shouldAutoOpenConversationRoute({
      allowRequestedAutoOpen: true,
      openedConversationId: "room-1",
      requestedConversationId: "room-1",
    }),
    false,
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const downloadService = readFileSync(
  new URL("../../services/chat-attachment-download.service.ts", import.meta.url),
  "utf8",
);
const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");
const sharedContentScreen = readFileSync(
  new URL("./conversation-attachments-screen.tsx", import.meta.url),
  "utf8",
);
const androidDownloader = readFileSync(
  new URL(
    "../../android/app/src/main/java/com/ankt/app/downloads/ChatAttachmentDownloadModule.kt",
    import.meta.url,
  ),
  "utf8",
);
const androidApplication = readFileSync(
  new URL(
    "../../android/app/src/main/java/com/ankt/app/MainApplication.kt",
    import.meta.url,
  ),
  "utf8",
);

test("attachment download uses browser download on web and direct device saving on native", () => {
  assert.match(downloadService, /Platform\.OS === "web"/);
  assert.match(downloadService, /anchor\.download = fileName/);
  assert.match(downloadService, /ChatAttachmentDownloader\.download/);
  assert.doesNotMatch(downloadService, /Sharing\.shareAsync/);
  assert.match(androidDownloader, /DownloadManager\.Request/);
  assert.match(androidDownloader, /Environment\.DIRECTORY_DOWNLOADS/);
  assert.match(androidApplication, /add\(ChatAttachmentDownloadPackage\(\)\)/);
});

test("chat long press downloads only the pressed attachment", () => {
  assert.match(chatScreen, /onOpenActions\(message, attachment\)/);
  assert.match(chatScreen, /accessibilityLabel="Tải tệp đính kèm"/);
  assert.match(chatScreen, /onDownloadAttachment\(actionAttachment\)/);
  assert.match(
    chatScreen,
    /isDownloading=\{downloadingAttachmentId === attachment\.id\}/,
  );
  assert.match(chatScreen, /Đang tải xuống\.\.\./);
});

test("shared content long press reveals a download action for one item", () => {
  assert.match(sharedContentScreen, /onLongPress=\{\(\) => setSelectedItem\(item\)\}/);
  assert.match(sharedContentScreen, /accessibilityLabel="Tải xuống"/);
  assert.match(sharedContentScreen, /downloadChatAttachment\(item\)/);
  assert.match(sharedContentScreen, /downloadingItemId === item\.id/);
  assert.match(sharedContentScreen, /Đang tải xuống\.\.\./);
});

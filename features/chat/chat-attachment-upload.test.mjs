import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chatService = readFileSync(
  new URL("../../services/chat.service.ts", import.meta.url),
  "utf8",
);
const authenticatedFetch = readFileSync(
  new URL("../../services/authenticated-fetch.ts", import.meta.url),
  "utf8",
);
const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");

const uploadFunction = chatService.match(
  /const uploadChatAttachments[\s\S]+?\n};/,
)?.[0] ?? "";

test("chat attachments upload successfully through authenticatedFetch as multipart files", () => {
  assert.match(chatService, /formData\.append\("files",/);
  assert.match(
    uploadFunction,
    /authenticatedFetch\(`\$\{BASE_URL\}\/api\/chat\/attachments\/upload`,/,
  );
  assert.doesNotMatch(uploadFunction, /Content-Type/);
  assert.doesNotMatch(uploadFunction, /await fetch\(/);
});

test("web picker File objects are preserved and appended directly to multipart uploads", () => {
  assert.equal(chatScreen.match(/file: asset\.file,/g)?.length, 2);
  assert.match(
    chatService,
    /formData\.append\("files", attachment\.file, attachment\.name\)/,
  );
});

test("an attachment upload 401 refreshes the token and retries exactly once", () => {
  assert.match(authenticatedFetch, /if \(response\.status !== 401 \|\| !token\)/);
  assert.equal(authenticatedFetch.match(/coordinateTokenRefresh\(token\)/g)?.length, 1);
  assert.equal(authenticatedFetch.match(/await fetch\(url,/g)?.length, 2);
});

test("a real attachment upload failure marks the message failed and shows the error", () => {
  assert.match(
    chatScreen,
    /item\.id === optimisticId \? \{ \.\.\.item, sendStatus: "failed" \} : item/,
  );
  assert.match(
    chatScreen,
    /error instanceof ChatAttachmentUploadError[\s\S]{0,100}Alert\.alert\("Không thể tải tệp đính kèm"/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildChatAttachmentFileName } from "./chat-attachment-download.ts";

test("attachment download keeps a safe supplied filename", () => {
  assert.equal(
    buildChatAttachmentFileName({
      id: "attachment-1",
      name: "  bao/cao:quy?1.pdf  ",
      type: "file",
      url: "https://cdn.example.com/original",
    }),
    "bao_cao_quy_1.pdf",
  );
});

test("attachment download derives a filename from the URL", () => {
  assert.equal(
    buildChatAttachmentFileName({
      id: "attachment-2",
      name: "",
      type: "video",
      url: "https://cdn.example.com/chat/demo-video.webm?token=secret",
    }),
    "demo-video.webm",
  );
});

test("attachment download uses a type extension when no filename exists", () => {
  assert.equal(
    buildChatAttachmentFileName({
      id: "attachment-3",
      name: "Tệp đính kèm",
      type: "audio",
      url: "https://cdn.example.com/resource",
    }),
    "audio-attachment-3.m4a",
  );
});

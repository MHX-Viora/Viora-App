import assert from "node:assert/strict";
import test from "node:test";

import { createRecordedChatAttachment } from "./chat-recording.ts";

test("recordings use formats that match the bytes produced on each platform", async () => {
  const native = await createRecordedChatAttachment({
    durationMillis: 2400,
    now: 123,
    platform: "android",
    uri: "file:///voice.m4a",
  });
  const webFile = { name: "voice-123.webm", type: "audio/webm" };
  const web = await createRecordedChatAttachment({
    createFile: (_blob, name, type) => ({ ...webFile, name, type }),
    durationMillis: 2400,
    loadBlob: async () => ({ type: "audio/webm" }),
    now: 123,
    platform: "web",
    uri: "blob:http://localhost/voice",
  });

  assert.deepEqual(
    { duration: native.duration, file: native.file, name: native.name, type: native.type },
    { duration: 2, file: undefined, name: "voice-123.m4a", type: "audio/mp4" },
  );
  assert.deepEqual(
    { file: web.file, name: web.name, type: web.type },
    { file: webFile, name: "voice-123.webm", type: "audio/webm" },
  );
});

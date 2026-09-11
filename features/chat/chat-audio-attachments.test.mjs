import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chatScreen = readFileSync(new URL("./chat-screen.tsx", import.meta.url), "utf8");
const pendingPreview = readFileSync(
  new URL("../../components/chat/pending-attachment-preview.tsx", import.meta.url),
  "utf8",
);
const sharedAttachments = readFileSync(
  new URL("./conversation-attachments-screen.tsx", import.meta.url),
  "utf8",
);

test("recorded chat audio uses the cross-platform preset and attachment factory", () => {
  assert.match(chatScreen, /useAudioRecorder\(RecordingPresets\.HIGH_QUALITY\)/);
  assert.match(chatScreen, /createRecordedChatAttachment\(/);
  assert.doesNotMatch(chatScreen, /type: Platform\.OS === "android" \? "audio\/3gpp" : "audio\/m4a"/);
});

test("sent and pending audio use resilient shared playback", () => {
  assert.match(chatScreen, /toggleChatAudioPlayback\(/);
  assert.match(pendingPreview, /toggleChatAudioPlayback\(/);
  assert.match(sharedAttachments, /toggleChatAudioPlayback\(/);
  assert.match(pendingPreview, /useAudioPlayerStatus/);
  assert.match(pendingPreview, /accessibilityLabel=\{status\.playing \? "Tạm dừng ghi âm" : "Nghe lại ghi âm"\}/);
});

test("pending documents and recordings show sent-style details", () => {
  assert.match(pendingPreview, /attachment\.name/);
  assert.match(pendingPreview, /attachment\.duration/);
  assert.match(pendingPreview, /pendingFileCard/);
  assert.match(pendingPreview, /pendingAudioCard/);
});

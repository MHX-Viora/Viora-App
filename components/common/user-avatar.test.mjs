import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./user-avatar.tsx", import.meta.url), "utf8");

test("keeps an initial behind the remote avatar image", () => {
  const initialIndex = source.indexOf("getAvatarInitial(displayName)");
  const imageIndex = source.indexOf("<Image");

  assert.ok(initialIndex >= 0, "expected the shared initial fallback");
  assert.ok(imageIndex > initialIndex, "expected the image to cover the fallback only after loading");
});

test("hides a broken remote avatar", () => {
  assert.match(source, /onError=/);
  assert.match(source, /failedImageUrl/);
});

test("uses the shared fallback across app and web user surfaces", async () => {
  const surfaces = [
    "../feed/post-card.tsx",
    "../reels/reel-card.tsx",
    "../profile/profile-overview.tsx",
    "../layout/desktop-header.tsx",
    "../chat/conversation-row.tsx",
    "../../features/chat/chat-screen.tsx",
    "../../features/calls/voice-call-screen.tsx",
    "../../features/profile/friends-screen.tsx",
  ];

  for (const relativePath of surfaces) {
    const surfaceSource = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.match(surfaceSource, /UserAvatar/, `expected ${relativePath} to use UserAvatar`);
  }
});

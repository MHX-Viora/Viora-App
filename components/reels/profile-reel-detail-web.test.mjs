import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const viewerSource = readFileSync(
  new URL("./reels-grid-viewer.tsx", import.meta.url),
  "utf8",
);
const commentsSource = readFileSync(
  new URL("../comments/comments-modal.tsx", import.meta.url),
  "utf8",
);
const profileContentSource = readFileSync(
  new URL("../profile/profile-content.tsx", import.meta.url),
  "utf8",
);
const profileScreenSource = readFileSync(
  new URL("../../features/profile/profile-screen.tsx", import.meta.url),
  "utf8",
);
const userProfileScreenSource = readFileSync(
  new URL("../../features/profile/user-profile-screen.tsx", import.meta.url),
  "utf8",
);

test("profile reel comments render inside the video detail modal", () => {
  assert.match(viewerSource, /viewerOverlay/);
  assert.match(commentsSource, /embedded/);
  assert.match(commentsSource, /embeddedModalRoot/);
  assert.match(profileContentSource, /reelViewerOverlay/);
  for (const source of [profileScreenSource, userProfileScreenSource]) {
    assert.match(source, /reelViewerOverlay=/);
    assert.match(source, /<CommentsModal\s+embedded/);
    assert.match(source, /commentTargetType === "reel"/);
    assert.match(source, /commentTargetType === "post"/);
  }
});

test("profile reel viewer updates the active video during Web scrolling", () => {
  assert.match(viewerSource, /onScroll=\{handleViewerScroll\}/);
  assert.match(viewerSource, /onMomentumScrollEnd=\{handleViewerScroll\}/);
  assert.match(viewerSource, /scrollEventThrottle=\{16\}/);
});

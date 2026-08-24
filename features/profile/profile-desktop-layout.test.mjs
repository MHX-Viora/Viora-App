import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { layout } from "../../theme/layout.ts";

const profileScreenSource = readFileSync(
  new URL("./profile-screen.tsx", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(
  new URL("../../components/profile/profile-settings-sheet.tsx", import.meta.url),
  "utf8",
);
const sidebarUrl = new URL(
  "../../components/profile/profile-desktop-sidebar.tsx",
  import.meta.url,
);
const reelsGridSource = readFileSync(
  new URL("../../components/reels/reels-grid-viewer.tsx", import.meta.url),
  "utf8",
);
const profileContentSource = readFileSync(
  new URL("../../components/profile/profile-content.tsx", import.meta.url),
  "utf8",
);

test("large desktop profile keeps settings visible in the right rail", () => {
  assert.match(profileScreenSource, /isDesktopWeb\s*&&\s*isLargeDesktop/);
  assert.match(profileScreenSource, /inline=\{showDesktopRails\}/);
  assert.match(settingsSource, /inline\?: boolean/);
  assert.match(settingsSource, /if \(inline\)/);
});

test("large desktop profile keeps friend tools and accepted friends in the left rail", () => {
  assert.equal(existsSync(sidebarUrl), true);
  const sidebarSource = readFileSync(sidebarUrl, "utf8");

  assert.match(profileScreenSource, /ProfileDesktopSidebar/);
  assert.match(sidebarSource, /getFriends/);
  assert.match(sidebarSource, /status: "Accepted"/);
  assert.match(sidebarSource, /onOpenFriends/);
  assert.match(sidebarSource, /onOpenQr/);
});

test("large desktop rails sit close to the viewport edges", () => {
  assert.equal(layout.profileDesktopShellMaxWidth, 1920);
  assert.match(profileScreenSource, /justifyContent: "space-between"/);
});

test("profile video tiles size from the profile column instead of the window", () => {
  assert.doesNotMatch(reelsGridSource, /Dimensions/);
  assert.match(reelsGridSource, /width: "32\.8%"/);
});

test("profile posts use a smaller centered desktop width without changing PostCard globally", () => {
  assert.equal(layout.profilePostMaxWidth, 680);
  assert.match(profileContentSource, /layout\.profilePostMaxWidth/);
  assert.match(profileContentSource, /getResponsiveContentLayout/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getFixedTopBarLayout,
  getReelContentWidth,
  getReelsOverlayLayout,
  getResponsiveBottomPadding,
  getResponsiveContentLayout,
  getResponsiveDialogLayout,
} from "./responsive-layout.ts";
import { layout } from "../../theme/layout.ts";

const createGroupRouteSource = readFileSync(
  new URL("../../app/chat/create-group.tsx", import.meta.url),
  "utf8",
);
const userProfileScreenSource = readFileSync(
  new URL("../../features/profile/user-profile-screen.tsx", import.meta.url),
  "utf8",
);

test("desktop reel uses a wider bounded viewport", () => {
  assert.equal(getReelContentWidth({ height: 800, maxWidth: 560 }), 525);
  assert.equal(getReelContentWidth({ height: 1200, maxWidth: 560 }), 560);
  assert.equal(getReelContentWidth({ height: 0, maxWidth: 560 }), 560);
});

test("desktop web content is centered and bounded", () => {
  assert.deepEqual(
    getResponsiveContentLayout({ isDesktopWeb: true, maxWidth: 720 }),
    { alignSelf: "center", maxWidth: 720, width: "100%" },
  );
});

test("compact and native content remains full width", () => {
  assert.deepEqual(
    getResponsiveContentLayout({ isDesktopWeb: false, maxWidth: 720 }),
    { width: "100%" },
  );
});

test("desktop create group and viewed profile pages use bounded responsive content", () => {
  assert.match(createGroupRouteSource, /ResponsiveContent/);
  assert.match(createGroupRouteSource, /layout\.createGroupMaxWidth/);
  assert.match(userProfileScreenSource, /ResponsiveContent/);
  assert.match(userProfileScreenSource, /layout\.profileMaxWidth/);
});

test("profile posts and videos stay inside a compact desktop content width", () => {
  assert.equal(layout.profileMaxWidth, 760);
});

test("desktop web does not reserve mobile tab or safe-area padding", () => {
  assert.equal(
    getResponsiveBottomPadding({ desktopPadding: 24, isDesktopWeb: true, mobilePadding: 132 }),
    24,
  );
  assert.equal(
    getResponsiveBottomPadding({ desktopPadding: 24, isDesktopWeb: false, mobilePadding: 132 }),
    132,
  );
});

test("desktop composer sits close to the desktop header", () => {
  assert.deepEqual(getFixedTopBarLayout({ isDesktopWeb: true }), {
    height: 76,
    paddingTop: 8,
  });
});

test("mobile composer keeps its existing safe top spacing", () => {
  assert.deepEqual(getFixedTopBarLayout({ isDesktopWeb: false }), {
    height: 100,
    paddingTop: 60,
  });
});

test("desktop reels video and overlay header start directly below navigation", () => {
  assert.deepEqual(getReelsOverlayLayout({ isDesktopWeb: true }), {
    headerHeight: 64,
    headerPaddingTop: 8,
    videoTopOffset: 0,
  });
});

test("mobile reels keeps its safe overlay spacing", () => {
  assert.deepEqual(getReelsOverlayLayout({ isDesktopWeb: false }), {
    headerHeight: 90,
    headerPaddingTop: 40,
    videoTopOffset: 16,
  });
});

test("desktop dialogs are centered and width constrained", () => {
  assert.deepEqual(
    getResponsiveDialogLayout({ isDesktopWeb: true, maxWidth: 640 }),
    {
      backdrop: {
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      },
      surface: {
        borderRadius: 18,
        maxHeight: "84%",
        maxWidth: 640,
        width: "100%",
      },
    },
  );
});

test("mobile dialogs remain bottom sheets", () => {
  assert.deepEqual(
    getResponsiveDialogLayout({ isDesktopWeb: false, maxWidth: 640 }),
    {
      backdrop: { justifyContent: "flex-end" },
      surface: { width: "100%" },
    },
  );
});

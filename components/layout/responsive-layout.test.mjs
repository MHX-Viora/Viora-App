import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getFeedDownloadPromoLayout,
  getFeedCategorySidebarLayout,
  getFixedTopBarBackgroundLayout,
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
const fixedTopBarSource = readFileSync(
  new URL("./fixed-top-bar.tsx", import.meta.url),
  "utf8",
);
const feedCategoryHeaderSource = readFileSync(
  new URL("../feed/feed-category-header.tsx", import.meta.url),
  "utf8",
);
const reelsScreenSource = readFileSync(
  new URL("../../features/reels/reels-screen.tsx", import.meta.url),
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

test("desktop composer attaches directly below the desktop header", () => {
  assert.deepEqual(getFixedTopBarLayout({ isDesktopWeb: true }), {
    height: 126,
    paddingTop: 0,
  });
  assert.deepEqual(
    getFixedTopBarLayout({ isDesktopWeb: true, useDesktopSideRails: true }),
    { height: 68, paddingTop: 0 },
  );
});

test("compact web composer starts close to the viewport top", () => {
  assert.deepEqual(getFixedTopBarLayout({ isCompactWeb: true, isDesktopWeb: false }), {
    height: 126,
    paddingTop: 0,
  });
});

test("native mobile composer keeps its background flush with the viewport", () => {
  assert.deepEqual(getFixedTopBarLayout({ isCompactWeb: false, isDesktopWeb: false }), {
    height: 131,
    paddingTop: 0,
  });
});

test("article toolbar reserves room for search and sort rows", () => {
  assert.deepEqual(getFixedTopBarLayout({ isArticle: true, isDesktopWeb: true }), {
    height: 170,
    paddingTop: 0,
  });
  assert.deepEqual(
    getFixedTopBarLayout({
      isArticle: true,
      isDesktopWeb: true,
      useDesktopSideRails: true,
    }),
    { height: 112, paddingTop: 0 },
  );
  assert.deepEqual(getFixedTopBarLayout({ isArticle: true, isDesktopWeb: false }), {
    height: 175,
    paddingTop: 0,
  });
});

test("fixed composer background fully covers content behind its top inset", () => {
  assert.match(fixedTopBarSource, /backgroundColor:\s*theme\.colors\.background/);
  assert.doesNotMatch(fixedTopBarSource, /justifyContent:\s*"flex-end"/);
  assert.match(
    fixedTopBarSource,
    /isLargeDesktop[\s\S]*useDesktopSideRails:\s*isDesktopWeb\s*&&\s*isLargeDesktop/,
  );
});

test("native home background extends through the full top safe area", () => {
  assert.deepEqual(
    getFixedTopBarBackgroundLayout({ barHeight: 131, isWeb: false, topInset: 24 }),
    { height: 155, paddingTop: 24, top: -24 },
  );
});

test("web home background stays aligned to the web viewport", () => {
  assert.deepEqual(
    getFixedTopBarBackgroundLayout({ barHeight: 126, isWeb: true, topInset: 24 }),
    { height: 126, paddingTop: 0, top: 0 },
  );
});

test("native category tabs lower only their content by five pixels", () => {
  assert.match(feedCategoryHeaderSource, /Platform\.OS\s*!==\s*"web"/);
  assert.match(feedCategoryHeaderSource, /height:\s*55/);
  assert.match(feedCategoryHeaderSource, /paddingTop:\s*5/);
});

test("all shared category tab icons keep the increased downward inset", () => {
  assert.match(
    feedCategoryHeaderSource,
    /item:\s*\{[\s\S]*?paddingTop:\s*spacing\.md/,
  );
  assert.match(
    feedCategoryHeaderSource,
    /icon:\s*\{\s*transform:\s*\[\{\s*translateY:\s*5\s*\}\]\s*\}/,
  );
});

test("category-only fixed bars reserve the shared category header height", () => {
  assert.deepEqual(
    getFixedTopBarLayout({ categoryOnly: true, isDesktopWeb: true }),
    { height: 50, paddingTop: 0 },
  );
  assert.deepEqual(
    getFixedTopBarLayout({
      categoryOnly: true,
      isDesktopWeb: true,
      useDesktopSideRails: true,
    }),
    { height: 0, paddingTop: 0 },
  );
  assert.deepEqual(
    getFixedTopBarLayout({ categoryOnly: true, isDesktopWeb: false }),
    { height: 55, paddingTop: 0 },
  );
});

test("large web category navigation occupies the left rail without overlapping the feed", () => {
  assert.equal(
    getFeedCategorySidebarLayout({
      feedMaxWidth: layout.feedMaxWidth,
      isDesktopWeb: false,
      pageGutter: layout.pageGutter,
      viewportWidth: 1024,
    }),
    null,
  );
  assert.deepEqual(
    getFeedCategorySidebarLayout({
      feedMaxWidth: layout.feedMaxWidth,
      isDesktopWeb: true,
      pageGutter: layout.pageGutter,
      viewportWidth: 1024,
    }),
    null,
  );
  assert.deepEqual(
    getFeedCategorySidebarLayout({
      feedMaxWidth: layout.feedMaxWidth,
      isDesktopWeb: true,
      pageGutter: layout.pageGutter,
      viewportWidth: 1440,
    }),
    { left: -336, width: 240 },
  );
});

test("download promotion uses the right rail only when the card has enough room", () => {
  assert.equal(
    getFeedDownloadPromoLayout({
      feedMaxWidth: layout.feedMaxWidth,
      isDesktopWeb: true,
      pageGutter: layout.pageGutter,
      viewportWidth: 1024,
    }),
    null,
  );
  assert.deepEqual(
    getFeedDownloadPromoLayout({
      feedMaxWidth: layout.feedMaxWidth,
      isDesktopWeb: true,
      pageGutter: layout.pageGutter,
      viewportWidth: 1366,
    }),
    null,
  );
  assert.deepEqual(
    getFeedDownloadPromoLayout({
      feedMaxWidth: layout.feedMaxWidth,
      isDesktopWeb: true,
      pageGutter: layout.pageGutter,
      viewportWidth: 1440,
    }),
    { right: -336, width: 300 },
  );
});

test("desktop reels video and overlay header start directly below navigation", () => {
  assert.deepEqual(getReelsOverlayLayout({ isDesktopWeb: true }), {
    headerHeight: 64,
    headerPaddingTop: 8,
    videoTopOffset: 0,
  });
});

test("compact web reels moves its sort bar closer to the viewport top", () => {
  assert.deepEqual(
    getReelsOverlayLayout({ isCompactWeb: true, isDesktopWeb: false }),
    {
      headerHeight: 74,
      headerPaddingTop: 16,
      videoTopOffset: 0,
    },
  );
});

test("mobile reels keeps its raised sort toolbar position", () => {
  assert.deepEqual(getReelsOverlayLayout({ isDesktopWeb: false }), {
    headerHeight: 62,
    headerPaddingTop: 12,
    videoTopOffset: 0,
  });
});

test("mobile reels viewport stays exactly between the category and footer tabs", () => {
  assert.match(
    reelsScreenSource,
    /paddingBottom:\s*isDesktopWeb\s*\?\s*0\s*:\s*REEL_BOTTOM_INSET/,
  );
  assert.match(
    reelsScreenSource,
    /paddingTop:\s*categoryTopBarLayout\.height/,
  );
  assert.match(reelsScreenSource, /videoVerticalShift=\{0\}/);
  assert.doesNotMatch(reelsScreenSource, /safeBottomInset=\{/);
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

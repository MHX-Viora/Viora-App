import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync(
  new URL("../../components/feed/feed-category-header.tsx", import.meta.url),
  "utf8",
);
const composerSource = readFileSync(
  new URL("../../components/feed/post-composer.tsx", import.meta.url),
  "utf8",
);
const feedScreenSource = readFileSync(new URL("./feed-screen.tsx", import.meta.url), "utf8");
const reelsScreenSource = readFileSync(
  new URL("../reels/reels-screen.tsx", import.meta.url),
  "utf8",
);
const tabLayoutSource = readFileSync(
  new URL("../../app/(tabs)/_layout.tsx", import.meta.url),
  "utf8",
);
const feedServiceSource = readFileSync(
  new URL("../../services/feed.service.ts", import.meta.url),
  "utf8",
);
const downloadPromoSource = readFileSync(
  new URL("../../components/landing/desktop-download-promo.tsx", import.meta.url),
  "utf8",
);

const getTabScreenSource = (name) => {
  const start = tabLayoutSource.indexOf(`name="${name}"`);
  const next = tabLayoutSource.indexOf("<Tabs.Screen", start);
  return tabLayoutSource.slice(start, next === -1 ? undefined : next);
};

test("home content header renders accessible category navigation", () => {
  assert.match(
    headerSource,
    /people-outline[\s\S]*Cộng đồng[\s\S]*play-circle-outline[\s\S]*Video ngắn[\s\S]*newspaper-outline[\s\S]*Báo/,
  );
  assert.match(headerSource, /accessibilityRole="tab"/);
  assert.match(headerSource, /accessibilityState=\{\{ selected:/);
  assert.match(headerSource, /accessibilityLabel=\{item\.label\}/);
  assert.match(headerSource, /usesDesktopSideRails[\s\S]*styles\.desktopContainer/);
  assert.match(headerSource, /usesDesktopSideRails\s*\?\s*<Text/);
  assert.match(headerSource, /styles\.desktopItem/);
  assert.match(headerSource, /getFeedCategorySidebarLayout/);
});

test("content header sits above the existing post composer", () => {
  assert.match(
    composerSource,
    /<FeedCategoryHeader[\s\S]*<View style=\{styles\.container\}>/,
  );
});

test("Home and Reels share the desktop download promotion in the right rail", () => {
  assert.match(composerSource, /<DesktopDownloadPromo\s*\/>/);
  assert.match(reelsScreenSource, /<DesktopDownloadPromo\s*\/>/);
  assert.match(downloadPromoSource, /position:\s*"absolute"/);
  assert.match(downloadPromoSource, /right:\s*desktopLayout\.right/);
});

test("tablet-sized web keeps the compact category header instead of desktop side rails", () => {
  assert.match(
    feedScreenSource,
    /isLargeDesktop[\s\S]*useDesktopSideRails:\s*isDesktopWeb\s*&&\s*isLargeDesktop/,
  );
  assert.match(
    reelsScreenSource,
    /isLargeDesktop[\s\S]*useDesktopSideRails:\s*isDesktopWeb\s*&&\s*isLargeDesktop/,
  );
});

test("home categories use server-side post type filtering and Reels navigation", () => {
  assert.match(feedScreenSource, /postType: category === "community" \? 0 : 2/);
  assert.match(feedScreenSource, /router\.push\("\/\(tabs\)\/reels"\)/);
  assert.match(feedServiceSource, /params\.append\("postType", String\(postType\)\)/);
});

test("mobile footer hides Reels and exposes Utilities", () => {
  const reelsTabSource = getTabScreenSource("reels");
  const utilitiesTabSource = getTabScreenSource("utilities");

  assert.match(reelsTabSource, /href: null/);
  assert.doesNotMatch(utilitiesTabSource, /href: null/);
  assert.match(utilitiesTabSource, /tabBarAccessibilityLabel: "Tiện ích"/);
});

test("Reels keeps the Home category header and navigates back to the selected feed", () => {
  assert.match(headerSource, /FeedCategory = "community" \| "reels" \| "articles"/);
  assert.match(headerSource, /active: activeCategory === "reels"/);
  assert.match(
    reelsScreenSource,
    /<FeedCategoryHeader[\s\S]*?activeCategory="reels"[\s\S]*?category: "community"[\s\S]*?category: "articles"/,
  );
  assert.match(feedScreenSource, /useLocalSearchParams/);
  assert.match(feedScreenSource, /params\.category === "articles"/);
});

test("Reels category header reuses the centered Home feed width", () => {
  assert.match(
    reelsScreenSource,
    /categoryHeaderContentLayout = getResponsiveContentLayout\(\{[\s\S]*?maxWidth: layout\.feedMaxWidth/,
  );
  assert.match(
    reelsScreenSource,
    /<FixedTopBar categoryOnly>\s*<View style=\{categoryHeaderContentLayout\}>\s*<FeedCategoryHeader[\s\S]*?<\/View>\s*<\/FixedTopBar>/,
  );
  assert.doesNotMatch(
    reelsScreenSource,
    /<SafeAreaView[\s\S]*?<FeedCategoryHeader/,
  );
});

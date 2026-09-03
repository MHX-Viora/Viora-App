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
const feedServiceSource = readFileSync(
  new URL("../../services/feed.service.ts", import.meta.url),
  "utf8",
);

test("home content header renders icon-only tabs with accessible labels", () => {
  assert.match(
    headerSource,
    /people-outline[\s\S]*Cộng đồng[\s\S]*play-circle-outline[\s\S]*Video ngắn[\s\S]*newspaper-outline[\s\S]*Báo/,
  );
  assert.match(headerSource, /accessibilityRole="tab"/);
  assert.match(headerSource, /accessibilityState=\{\{ selected:/);
  assert.match(headerSource, /accessibilityLabel=\{item\.label\}/);
  assert.doesNotMatch(headerSource, /<Text/);
});

test("content header sits above the existing post composer", () => {
  assert.match(
    composerSource,
    /<FeedCategoryHeader[\s\S]*<View style=\{styles\.container\}>/,
  );
});

test("home categories use server-side post type filtering and Reels navigation", () => {
  assert.match(feedScreenSource, /postType: category === "community" \? 0 : 2/);
  assert.match(feedScreenSource, /router\.push\("\/\(tabs\)\/reels"\)/);
  assert.match(feedServiceSource, /params\.append\("postType", String\(postType\)\)/);
});

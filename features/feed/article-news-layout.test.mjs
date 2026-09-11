import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const feedSource = readFileSync(new URL("./feed-screen.tsx", import.meta.url), "utf8");
const cardSource = readFileSync(
  new URL("../../components/feed/post-card.tsx", import.meta.url),
  "utf8",
);
const composerSource = readFileSync(
  new URL("../../components/feed/post-composer.tsx", import.meta.url),
  "utf8",
);
const searchSource = readFileSync(
  new URL("../../components/feed/feed-search-modal.tsx", import.meta.url),
  "utf8",
);
const sortTabsSource = readFileSync(
  new URL("../../components/feed/article-sort-tabs.tsx", import.meta.url),
  "utf8",
);
const serviceSource = readFileSync(
  new URL("../../services/feed.service.ts", import.meta.url),
  "utf8",
);

test("the articles tab uses the compact news-card presentation", () => {
  assert.match(
    feedSource,
    /variant=\{activeCategory === "articles" \? "news" : "default"\}/,
  );
  assert.match(cardSource, /variant\?: "default" \| "news"/);
  assert.match(cardSource, /const isNewsLayout =\s*variant === "news"/);
  assert.match(
    cardSource,
    /style=\{\[styles\.header, isNewsLayout && styles\.newsHiddenHeader\]\}/,
  );
  assert.match(cardSource, /styles\.newsArticleCard/);
  assert.match(cardSource, /styles\.newsToolbar/);
});

test("news cards show publication details with only share and options controls", () => {
  assert.match(cardSource, /onPress=\{\(\) => onOpenArticle\?\.\(post\.id\)\}/);
  assert.match(cardSource, /size=\{28\}/);
  assert.match(
    cardSource,
    /post\.publishedAt[\s\S]*post\.article\.readingTimeMinutes[\s\S]*post\.viewCount/,
  );
  assert.match(
    cardSource,
    /styles\.newsToolbar[\s\S]*onShare\?\.\(post\.id\)[\s\S]*setOptionsVisible\(true\)/,
  );
  assert.match(
    cardSource,
    /\{!isNewsLayout \? \(\s*<View style=\{styles\.actions\}>/,
  );
});

test("the article header combines search, publishing, and three sort modes", () => {
  assert.match(composerSource, /activeCategory === "articles" \? \(/);
  assert.match(composerSource, /Tìm bài báo, chủ đề, tác giả\.\.\./);
  assert.match(composerSource, /Tạo bài báo/);
  assert.match(composerSource, /ArticleSortTabs/);
  assert.match(sortTabsSource, /Xu hướng/);
  assert.match(sortTabsSource, /Mới nhất/);
  assert.match(sortTabsSource, /recommended/);
  assert.match(composerSource, /articleSort: PostFeedSort/);
  assert.match(composerSource, /onArticleSortChange: \(sort: PostFeedSort\) => void/);
});

test("article search and pagination keep the selected server sort", () => {
  assert.match(feedSource, /category=\{activeCategory\}/);
  assert.match(feedSource, /useState<PostFeedSort>\("recommended"\)/);
  assert.match(feedSource, /loadRequestIdRef\.current/);
  assert.match(searchSource, /category: FeedCategory/);
  assert.match(
    searchSource,
    /postType: category === "articles" \? 2 : 0/,
  );
  assert.match(searchSource, /sort: category === "articles" \? articleSort : undefined/);
  assert.match(searchSource, /Tìm bài báo, chủ đề, tác giả\.\.\./);
  assert.match(searchSource, /ArticleSortTabs onChange=\{onArticleSortChange\}/);
  assert.match(searchSource, /variant=\{category === "articles" \? "news" : "default"\}/);
  assert.match(searchSource, /onOpenArticle=\{onOpenArticle\}/);
  assert.match(serviceSource, /sort\?: PostFeedSort/);
  assert.match(serviceSource, /params\.append\("sort", sort\)/);
  assert.match(
    serviceSource,
    /sort === "recommended"[\s\S]*?\/api\/articles\/recommended/,
  );
});

test("article category selection is stored in route params for refresh", () => {
  assert.match(
    feedSource,
    /onArticlesFeedPress=\{\(\) => \{[\s\S]*?router\.setParams\(\{ category: "articles" \}\)[\s\S]*?selectCategory\("articles"\)/,
  );
  assert.match(
    feedSource,
    /onCommunityPress=\{\(\) => \{[\s\S]*?router\.setParams\(\{ category: "community" \}\)[\s\S]*?selectCategory\("community"\)/,
  );
});

test("recommended article impressions are sent once per visible item", () => {
  assert.match(feedSource, /viewedArticleIdsRef/);
  assert.match(feedSource, /onViewableItemsChanged/);
  assert.match(feedSource, /trackArticleInteraction\(item\.id, "impression"\)/);
});

test("news cards expose an explicit not-interested recommendation signal", () => {
  assert.match(cardSource, /onNotInterested\?: \(postId: string\) => void/);
  assert.match(cardSource, /isNewsLayout && !post\.isMine && onNotInterested/);
  assert.match(feedSource, /trackArticleInteraction\(postId, "notInterested"\)/);
});

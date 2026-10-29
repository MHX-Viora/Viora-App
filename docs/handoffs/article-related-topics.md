# Article reader related topics

- Spec: `docs/specs/article-related-topics.md`.
- Reader moves saved hashtags from the title area into a `Chủ đề liên quan`
  card. At >=1240px on desktop web it occupies a scrollable right rail; the
  article remains centered. Compact layouts render it in FlatList's footer,
  after all blocks. No card is shown when hashtags are absent.
- Chips wrap, including long names, and navigate to `/article/search` with
  the selected hashtag. New route/screen reuse FeedSearchModal's article search
  and sort controls via optional `initialQuery`. Search starts automatically
  with `#name` and `postType: 2`. Other search callers keep the empty default.
- Search visibility follows route focus, allowing a result to open above it
  and return to search. Closing search returns through history or falls back
  to the articles feed. Changing the route hashtag remounts the search query.
- `article-related-posts.ts` queries the existing feed API for every unique
  article hashtag (`postType: 2`, `sort: latest`, first six candidates/tag), in
  batches of three. Excludes the current article, advertisements and non-articles;
  merges duplicate IDs and ranks by the number of topic searches returning each
  candidate. Returns four articles. Ranking is limited to these sampled results,
  and uses the backend's existing keyword/hashtag matching semantics.
- `ArticleRelatedPostsCard` sits below the topics card in the same rail/footer.
  It shows thumbnails (or a newspaper fallback), titles and topic/read-time
  metadata. Includes loading, empty and retry states. Partial API failures keep
  successful results; all searches failing shows retry. Article-keyed remounts
  and effect cleanup prevent late results from updating a different article.
- Backend already supports hashtag keyword matching through shared PostHashtags;
  no backend/schema changes in this feature. Requires the backend hashtag
  support from commit `e34364a0` when using the live API.
- Verified: focused topic tests, TypeScript and targeted ESLint passed. Chrome
  at 320/375/768/1240/1440/1920px checked footer/rail placement, centered article,
  long hashtag wrapping, Unicode hashtag requests, article-only search and
  opening a result. Screenshots reviewed. Fixtures mock content/search services,
  renderer, result cards, icons and navigation; no live publishing/search verified.
- Related-post tests cover normalization, unique topics, exclusion, deduplication,
  ranking, four-item cap, no tags, partial/total failures and request concurrency.
  Chrome checks additionally cover both cards' order at all viewport sizes,
  thumbnail rendering/fallback, opening a related article, empty results and
  retry after failure. TypeScript and targeted ESLint passed.

```text
node --test features/article/article-related-topics.test.mjs features/article/article-topics.test.mjs
node --test features/article/article-related-posts.test.mjs
node .codex-tmp/article-related.browser.mjs
npx tsc --noEmit
npx eslint features/article/article-reader-screen.tsx features/article/article-search-screen.tsx app/article/search.tsx components/feed/feed-search-modal.tsx features/article/article-related-topics.test.mjs
```

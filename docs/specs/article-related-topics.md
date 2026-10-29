# Related topics in article reader

- Show the current article's saved hashtags in a `Chủ đề liên quan` card.
- At desktop web widths >=1240px, place it in a right rail and keep the
  article centered. On smaller layouts, put it after the final article block.
  Long names wrap inside chips. Omit the card when the article has no hashtags.
- Clicking a topic navigates to `/article/search?hashtag=...`. Reuse article
  search with its query initialized to `#name`, automatically loading matching
  articles. Preserve sorting, editable query, opening results and back navigation.
- Keep article loading/error handling and reading progress tracking intact.

Plan: reader and initial-search regression tests; responsive related card and
search route reusing FeedSearchModal; verify real reader/search in Chrome at
mobile and desktop sizes, resize, hashtag navigation and article-only requests;
run TypeScript, targeted ESLint and focused tests. No backend/schema changes.

## Related articles

Below the related topics card, show up to four other articles matching the
current article's hashtags, with thumbnail, two-line title and topic/read-time
metadata. Use existing article-only keyword search, querying unique tags in
batches of three with six candidates per tag. Merge duplicate results, exclude
the current article and advertisements/non-articles, and prioritize candidates
returned for more shared topics. Partial search failures retain usable results;
total failure offers retry. Empty results show an honest empty state.

Keep both cards in the same desktop rail/mobile footer. Changing article must
clear old recommendations and ignore late results. Opening a recommendation
navigates to that article. No placeholder actions or new backend dependencies.

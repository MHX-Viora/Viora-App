# Article feed grid

- `features/feed/feed-screen.tsx`: articles use two FlatList columns on desktop
  web (>=1024px), one on mobile/tablet. Community keeps one column.
- Grid cells use 50% width and 4px horizontal gutters. Odd final items keep
  their column width. FlatList key follows column count to support resizing.
- Existing feed width, pagination, sort, card actions and viewability callbacks
  are retained. Spec: `docs/specs/article-feed-grid.md`.
- Article search modal now also uses two columns on desktop web and one on
  compact layouts, with a column-count key and fixed-width odd final item.
  Community search remains one column. Search header's bottom divider is removed.
- Shared ArticleSortTabs buttons are 30px high with 12px labels and 16px icons,
  affecting both search and the main feed. A 4px hitSlop retains the touch area.
  `.codex-tmp/article-search-grid.browser.mjs` verifies actual search modal and
  PostCard geometry, resize, odd items, 30px controls, no header divider, opening
  results and one-column community search at 375/768/1024/1440/1920px.
- TypeScript passed; ESLint has no errors and three existing warnings (BOM and
  effect dependencies). Chrome fixture with actual FeedScreen/PostCard passed
  375/768/1024/1440/1920px, resize, odd item width, article navigation and community
  single column; no horizontal overflow. Services/header/icons/media are mocked.
- Existing PostCard nested-button and RN Web animation/shadow warnings remain;
  they are excluded from fixture assertions. No live data was changed.
- Reusable local check: `node .codex-tmp/article-grid.browser.mjs`.

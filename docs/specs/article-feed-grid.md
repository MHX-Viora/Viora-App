# Responsive article feed

Show two articles per row in the articles feed on desktop web (>=1024px),
and one per row on mobile/tablet. Keep the existing feed width and sidebars.
Community posts retain one column. An odd last article keeps one-column width
within the two-column grid. Preserve pagination, sorting, impressions and card
actions; remount FlatList when column count changes as required by React Native.

Article search modal uses the same 2-column desktop/1-column compact behavior.
Remove the separator below its search header. Shared article sort tabs use a
30px button height, 12px labels and 16px icons both in search and the feed.

Plan: add responsive columns and item gutters to the existing feed list;
verify desktop/mobile and odd item geometry in Chrome, resize between layouts,
and run TypeScript and targeted ESLint.

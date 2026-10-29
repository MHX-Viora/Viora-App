# Article author follow

- `ArticleAuthorFollowButton` loads relationship status through getUserProfile
  and toggles it using the existing followUser API. Reader places the button
  at the far right of the author name row; reading metadata stays below.
- Hidden for own articles or missing author IDs. Names truncate on compact
  screens. Loading/saving disable the button; an in-flight ref blocks rapid
  presses. Toggle failures retain the previous state and show an error toast.
  Initial-load failure offers retry; cleanup ignores late async results.
- Reader keys the button by author ID; reader focus reload remounts the author
  header and refreshes follow status. No backend or Article contract changes.
- Spec: `docs/specs/article-author-follow.md`. Focused follow/reader tests,
  TypeScript and targeted ESLint passed. Chrome fixture at
  320/375/768/1240/1440/1920px checked name/button vertical alignment, right-edge
  alignment, follow/unfollow and own-article hiding; mobile screenshot reviewed.
  Services and navigation are mocked; no live follow relationship was changed.

```text
node --test features/article/article-author-follow.test.mjs features/article/article-related-topics.test.mjs
node .codex-tmp/article-related.browser.mjs
npx tsc --noEmit
npx eslint features/article/article-author-follow-button.tsx features/article/article-author-follow.test.mjs features/article/article-reader-screen.tsx
```

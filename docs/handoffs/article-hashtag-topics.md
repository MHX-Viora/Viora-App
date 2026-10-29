# Article hashtag topics

- Spec: `docs/specs/article-hashtag-topics.md`.
- Articles and short videos share `components/common/hashtag-picker.tsx`,
  `utils/hashtag-selection.ts`, and the existing hashtag search API/pool.
  Search is debounced; existing tags can be selected/removed and typed tags
  are normalized and deduplicated before publishing.
- Editor requires a topic. Below 1240px, publishing a valid draft without
  topics opens a modal; the header also opens it. At >=1240px on web,
  topics are anchored 16px from the right edge and missing topics focus the
  input. Equal space is reserved on both sides of the writing area so cards
  stay centered in the viewport without overlapping the panel. Verified card
  center and panel edge geometry at 1240/1440/1920px; compact layouts unchanged.
- Pending input is included on publish. Closing the modal, failed saves,
  and resizing preserve the draft and selected topics. Repeated presses
  cannot submit concurrent saves. Editing loads saved topics; reader shows them.
- Backend changes in sibling `viora-BE` add optional hashtag fields to article
  create/update contracts and persist links through existing Hashtags/PostHashtags
  tables. Existing video tags retain their IDs. Usage counts update with article
  changes in a transaction. Omitted update fields preserve tags; `[]` clears them.
  No schema migration is needed. Deploy backend support with the frontend.
- Verified: focused article/access/block tests, additional topic regression tests,
  TypeScript, targeted ESLint, and 4 backend article tests. Chrome fixture passed
  at 320/375/768/1440px, including search, selection, custom input, removal,
  deduplication, save payloads, existing topics, and resizing; screenshots reviewed.
- Browser fixture mocks services and icons; live publishing and native mobile
  keyboard behavior were not exercised. Existing RN Web shadow deprecation warning
  remains. No deployment or commit was performed.

## Checks

```text
node --test features/article/article-topics.test.mjs features/article/article-editor-blocks.test.mjs features/article/article-access.test.mjs
npx tsc --noEmit
npx eslint components/common/hashtag-picker.tsx components/reels/create-reel-modal.tsx features/article/article-editor-screen.tsx features/article/article-reader-screen.tsx utils/hashtag-selection.ts types/article.ts
dotnet test Viora.Application.Tests --no-restore --filter FullyQualifiedName~Article --verbosity minimal -m:1 -nodeReuse:false
```

The .NET command runs from `viora-BE`. Existing browser fixtures are
`.codex-tmp/editor-drag-build.mjs` and `.codex-tmp/article-topics.browser.mjs`;
build before running the browser fixture. Sandbox process restrictions required
running Node tests, esbuild, Chrome and .NET with approved escalation.

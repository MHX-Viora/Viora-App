# Community and News image rendering

## Change

Previously ViewableImage defaulted to cover, PostCard used fixed 240px single-image / 180px gallery cells, and article thumbnails used cover in 16:9 frames. This cropped original image edges. Inline article images already used contain and intrinsic dimensions.

AdaptiveMediaImage now owns contained foreground, conditional same-source background (cover, blur 25, overscan, scale 1.08, gentle theme dim), themed loading/error states and source-keyed dimension/load state. No retry or pixel processing. Foreground remains sharp. Exact-ratio frames omit the background. Memory/disk image caching and existing list virtualization remain in use.

ViewableImage opts into this behavior for post/article media and fullscreen viewing; its existing cover default remains for unrelated consumers such as avatar editing. Single community images size from intrinsic ratio, capped at 660px desktop / min(660px, 75% viewport height) elsewhere. Gallery cells retain their existing geometry. Inline article images retain uncapped natural ratios. News frames remain 16:9 with complete foreground images and existing actions.

withoutHashtags filters published text only: community body, News title/summary/ad headline, reader title, article heading/text/quote/caption. Stored/editor values, URL fragments, numeric references, mentions and article code blocks remain unchanged. Video player logic and API/BE were not modified.

## Files

- Shared: components/common/adaptive-media-image.tsx, adaptive-media-model.ts, viewable-image.tsx; utils/display-text.ts.
- Consumers: components/feed/post-card.tsx, create-post-modal.tsx; components/article/article-renderer.tsx; features/article/article-reader-screen.tsx.
- Tests: adaptive-media-image.test.mjs, adaptive-media-model.test.mjs; updated post-card-layout.test.mjs, article-reader-layout.test.mjs; scripts/test.mjs.
- Diagnostics: scripts/community-media-preview.tsx; six local PNG fixtures with labelled TOP/BOTTOM/LEFT/RIGHT edges in .codex-tmp. Not production assets.
- Spec: docs/specs/community-news-images.md.

## Coverage and validation

PostCard reuse covers Home/Community/News feeds, Profile activity (posts/saved), post detail/share preview and search. ArticleBlockView covers reader and editor image previews. Route wiring is covered by tests; authenticated route navigation was not exercised.

- TypeScript: pass.
- Scoped eslint: pass, no warnings. Full Expo lint: exit 0; environment emits the existing UNDICI-EHPA warning.
- FE suite: 551/551 pass, including six-ratio fit math, image render/error/source reset behavior, hashtag preservation and existing News action contracts.
- Expo web export: pass (.codex-tmp/community-news-web), one worker.
- Browser harness using real PostCard/ArticleBlockView: 16:9, 9:16, 1:1, 4:3, 3:4, 21:9; labelled edges fully visible; gallery, News and inline images use contain. Both themes; emulated 320, 390, 768, 1024, 1440 widths; no horizontal overflow. Browser zoom means CSS viewport dimensions differ from emulation settings.
- Portrait feed height cap and intrinsic inline height confirmed. Fullscreen open/close confirmed. Failed URL: four error states, zero broken images/loading loops; changing source recovers.
- Existing NewsCard nested button HTML warning remains (article card includes author/toolbar buttons). No image runtime exception observed. Deliberately outside this image-only change.
- Signed-in Edge sessions are not connected to the browser tools. No claim of authenticated upload/route E2E or native device testing.

Git staging predates this task and was preserved. No commit/push performed.

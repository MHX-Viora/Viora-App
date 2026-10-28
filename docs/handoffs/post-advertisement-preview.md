# Post advertisement creation preview

- CreateAdvertisementScreen now passes draft `AdvertisementPresentation` to the real
  PostCard instead of surrounding an ordinary post with a sponsored strip and CTA.
- Shared advertisement styling now applies to previews and delivered feed cards: sponsored
  metadata beside the author, static ellipsis, media before a neutral destination block,
  uppercase domain, gray CTA button and existing interaction footer.
- Headline/description use only the advertiser's custom fields; empty fields stay hidden
  without substituting author/article/post text. Domain appears only with a destination
  URL; an empty copy block is omitted. Default CTA reads “Tìm hiểu thêm”;
  other CTA choices retain their labels. Destination updates from the form.
- `advertisementPreviewLayout` now only controls draft-specific test IDs and controls.
- Draft presentation uses `preview:<postId>` and `isPreview: true`; preserves original
  content/media/counts without mutating the source. No paid-ad creation/tracking occurs
  from rendering the preview. Organic feed cards retain existing styling; delivered ads
  retain live options and advertisement click/feedback callbacks.
- Node tests cover source immutability, draft flags, CTA selection and both themes.
  Browser fixture checks media layout, neutral CTA and 375/1024px overflow; fixture
  images/avatars are substituted and do not become ad content.
- TypeScript and affected-file ESLint pass. Screenshots:
  `.codex-tmp/post-ad-preview-{375,1024}.png`.
- Feed consistency follow-up: 7 rendering tests, affected-file ESLint and TypeScript pass.
  Chrome fixture confirms identical CTA/domain styling at 375/1024px in both themes,
  with no overflow or browser errors. Screenshots: `.codex-tmp/ad-feed-{theme}-{width}.png`.

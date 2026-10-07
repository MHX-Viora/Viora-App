# Static live gift banners

- Supersedes Rocket V7 / Crown / Firework cinematic playback in production live rooms.
- Host and viewer now use only `useLiveGiftOverlay` and `LiveGiftOverlay`; no premium effect manager, cinematic layer, gift sound or haptics is dispatched.
- `GiftBanner` is static: shared warm orange/red surface, sender avatar/name, catalogue gift image/name and ×quantity on the right.
- Existing confirmed-event deduplication, combo accumulation, two visible banners, FIFO overflow and expiry/unmount cleanup remain active.
- Gift sending, VND settlement, wallet refresh and rankings retain their existing flow.
- Legacy cinematic modules and standalone diagnostic previews remain outside production live routes.
- Regression: `live-gift-static-banner.test.mjs` checks rendering for all six gifts and live hook combo/deduplication/cleanup; layout test guards production against cinematic mounting.
- Browser preview entry: `scripts/static-gift-preview.tsx`.
- Validation: 538 tests passed, TypeScript passed, focused ESLint has no errors (one existing viewer lifecycle warning), production web export passed. Browser preview at 480×950 and 360×800 confirmed static right-side banners, ×2 combo, no canvas/active animations, no horizontal overflow or console errors. Authenticated host/viewer and native hardware were not exercised.

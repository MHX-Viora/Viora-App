# Live gift SVGA playback

- Admin management is in sibling viora-admin at `/live-gifts`. Presets are
  Sư tử (97 frames/15fps, 6467ms), Tên lửa (240/30, 8000ms), Nụ hôn (66/20,
  3300ms). No hardcoded prices or gift insertion: admin selects assets, sets
  price/status and saves. Custom SVGA files use the same gift form.
- Backend stores bytes/duration in existing LiveGifts through migration
  `20261029080031_AddGiftSvgaData`. Catalog and realtime gift events include the
  relative animation URL and measured duration; frontend resolves URLs against
  EXPO_PUBLIC_API_URL. Backend serves the player at `/gift-effects/svga.min.js`.
- LiveGiftOverlay preserves animation metadata in banner events. SvgaGiftEffects
  queues up to 12 unique events and plays one at a time, ignoring duplicate IDs,
  guarding completion by active ID, clearing with the gift manager and using a
  duration+2.5s timeout for load/player failure. Honors reduced motion/effect
  preference. Existing procedural effects and payments are unchanged.
- Web player lazily loads the self-hosted SVGA library; native uses the existing
  WebView dependency with trusted generated HTML, escaped URLs, API base URL,
  disabled extra navigation and transparent background. Both play once and clean
  up on unmount. Only HTTPS (or localhost HTTP for development) URLs are accepted.
- Verified: SVGA metadata/combo/URL safety tests, TypeScript, lint, actual original
  SVGA assets rendering nonempty frames and playing sequentially in Chrome.
  Admin browser tests and backend SQLite tests cover upload/update/remove and
  access attributes. Native device playback and real wallet transfers not tested.
- Deploy backend/static player and migration first, then admin/client. No DB
  migration or deployment was performed in this session. See admin handoff for
  endpoints, upload limits and catalog workflows.

```text
node --test features/live/svga-gift.test.mjs
node .codex-tmp/svga/playback.browser.mjs
npx tsc --noEmit
npx expo export --platform web --output-dir .codex-tmp/svga-export
```

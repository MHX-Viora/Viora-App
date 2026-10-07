# Live cover consistency

## Asset and shared rendering

- Default asset replaced with the user's neon LIVE image from `Downloads/Nền livestream neon LIVE rực rỡ.png`, copied without modification to `assets/images/default-live-cover-neon.png`; SHA256 matches. All existing shared-cover consumers use this replacement.
- `features/live/live-cover.ts` exports `DEFAULT_LIVE_COVER` and `LIVE_COVER_ASPECT_RATIO` (16:9).
- `LiveCoverImage` renders the complete original with `contain`; the same source fills a separate blurred (28), scaled (1.08), dimmed (0.65) background. Foreground is never blurred, cropped or stretched.
- Null/undefined/blank/malformed sources and failed image loads fall back to the local asset. Optional custom fallback also falls back to default if it fails. Keyed layers isolate late errors from a new selection.
- Static Expo Image layers, memory/disk caching and existing FlatList virtualization; no added dependency or per-frame image processing.

## Consumers changed

- Create Live setup/cover preview: common component, fixed 16:9, `allowsEditing: false`, immediate existing `onChange(coverUri)` flow.
- Live list cards: same component and fixed 16:9 in every column count. Discovery header now uses the new asset too.
- Host preflight/camera-off/loading/demo stage and viewer waiting/loading stage: `LiveCoverBackdrop` delegates to the common component. Viewer fallback is mounted even when the server has no cover URL.
- Host ended-session summary: shared 16:9 image.
- Old Live mock/default image URLs and diagnostic scene references replaced; `assets/images/live-demo-still.png` removed. Unrelated avatar mock URLs in profile/reels remain untouched.
- Real camera/video stage geometry, Agora, gifting, wallet and backend remain unchanged.

## Description

- Removed the creation form label, textarea, counter and description-only styling/error validation.
- New session creation sends `description: null`.
- Kept the HostSettings field because Live management still uses it; API DTO/database field also retained. No schema change.

## Acceptance and limitations

- Frontend suite: 546 passed. TypeScript passed. Full Expo lint completed; changed-file ESLint has no errors/warnings. Production web export passed (`.codex-tmp/live-cover-web`).
- Browser verified 16:9, 9:16, 4:3, 1:1 and 21:9 PNG fixtures. Both preview/card foregrounds use `contain`, retain original dimensions, and have frame ratio 1.778. Portrait fixture showed all four colored edges over image-derived background.
- Browser tested default, URL failure → default, subsequent valid selection, actual setup preview update, absence of Description UI, and emulated 320×568 / 390×844 / 768×1024 / 1440×900 with no horizontal overflow. Actual CSS sizes differ due browser zoom; this is not native hardware testing.
- Isolated harness: `scripts/live-cover-preview.tsx`; fixture PNGs/logs/export stay under `.codex-tmp`.
- File chooser automation could not access workspace fixture paths because the browser tool rejected them as outside its configured workspace roots. Thus actual OS file picking/upload → authenticated Create Live → list persistence was not exercised. Source selection/preview, upload call preservation, null-cover mapping and component error handling were verified separately; do not report an authenticated end-to-end test as passed.

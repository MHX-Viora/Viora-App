# Plan: Desktop secondary profile and media pages

## Architecture decisions

- Center profile-related routes with the existing `ResponsiveContent` wrapper and one shared profile-subpage width token.
- Reuse `getReelContentWidth` so the reel feed and reel detail share the same widened desktop sizing rule.
- Keep `ReelCard` responsible for aspect-safe playback (`contain` foreground plus blurred backdrop).
- On Web, use loaded video metadata plus the reel viewport size to calculate an explicit contained foreground frame instead of relying only on CSS object-fit.
- Center post detail with the existing profile/feed readable width instead of changing `PostCard` globally.

## Tasks

### 1. Center profile subpages

- Acceptance: all routes launched from profile settings plus Friends and Edit profile are bounded and centered on desktop; mobile stays full width.
- Verify: new route source-contract test and typecheck.
- Files: route files, `theme/layout.ts`, one test.

### 2. Guard aspect-safe reels and center reel detail

- Acceptance: foreground video uses `contain` across the complete measured width; reel detail uses measured height and the shared width helper.
- Verify: failing regression test before implementation, focused test, typecheck.
- Files: `components/reels/reel-card.tsx`, `features/reels/reel-preview-screen.tsx`, one test.

### 3. Center post detail

- Acceptance: the post card is centered in a readable desktop column without changing the feed card globally.
- Verify: failing regression test before implementation, focused test, typecheck.
- Files: `features/feed/post-preview-screen.tsx`, one test.

## Final checkpoint

- Full tests, typecheck, lint, Web export, browser check when available, and code review pass.

## Risks

- Nested scrolling: route wrappers must retain `flex: 1` and `minHeight: 0`.
- Reel overlays: header and actions must remain inside the centered reel column.

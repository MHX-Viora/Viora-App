# Handoff: Desktop secondary profile and media pages

## Delivered

- Centered all profile-setting routes, Friends, Edit profile, activity lists, and legal detail pages in a 760px desktop column through `ResponsiveContent`.
- Preserved full-width compact Web and native layouts.
- Guarded ReelCard foreground playback with `contentFit="contain"` and explicit Web geometry calculated from the video's intrinsic metadata, so landscape, square, and portrait sources keep their full frame without stretching or side cropping; the existing blurred `cover` image remains backdrop-only.
- Widened the desktop reel shell and gives the foreground video its complete measured width, removing the 64px subtraction that made its right side appear missing.
- Web now also enforces centered `object-fit: contain` directly on the HTML video element with no transform, avoiding Expo Web/CSS overrides that zoom into one corner while native playback remains unchanged.
- Desktop Web removes the inherited mobile `translateY: -20` offset, keeping the contained video centered with equal top and bottom spacing.
- Rebuilt reel detail around a measured viewport and the shared responsive width helper, removing static `Dimensions` sizing.
- Centered post detail in a 760px readable column; the existing article reader remains separately bounded at 960px.

## Verification

- `npm test`: 88/88 passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npx expo export --platform web`: passed.
- Runtime screenshot verification unavailable because no browser session was connected.

## Review

- No API, navigation contract, dependency, data-fetching, or mobile behavior changes.
- No correctness, security, architecture, or performance blockers found.
- Existing unrelated dirty-worktree changes were preserved; no commit was created.

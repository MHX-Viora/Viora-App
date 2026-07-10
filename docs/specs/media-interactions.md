# Spec: Media interactions

## Objective
Improve readability, add a local create-post flow with image selection, and render real mixed-aspect videos in Reels.

## Tech Stack and Commands
Expo SDK 54, `expo-image-picker ~17.0.11`, `expo-video ~3.0.16`. Verify with `npx tsc --noEmit`, `npm run lint`, and `npx expo export --platform web`.

## Structure and Style
Shared models live in `types/`; reusable UI lives in `components/`; feature screens own local orchestration. Typography uses semantic tokens and icon-only controls keep accessibility labels.

## Testing Strategy
Type-check, lint, static web export, and manual checks for modal open/close, image preview, post insertion, and mixed video sources.

## Boundaries
- Always: handle canceled picker results and media permission denial.
- Ask first: upload media or persist posts to a backend.
- Never: autoplay video audio or access media without user action.

## Success Criteria
- Feed/Reel types are imported from `types/`.
- Text is visibly larger without clipping navigation.
- Composer and image button open a create-post modal; image selection previews and a valid post appears in the feed.
- Reels use real looping video sources with different source aspect ratios.

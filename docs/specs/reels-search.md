# Spec: Reels search

## Objective
Connect the existing search action in the short-video header to a full-screen, accessible search experience. Search the currently available reels by author, caption, and hashtags.

## Tech Stack and Commands
- Expo, React Native, TypeScript, existing Ionicons and `expo-image`; no new dependencies.
- Verify with `npx tsc --noEmit` and `npm run lint`.

## Structure and Style
- Keep search UI in `components/reels` and visibility state in `features/reels/screens`.
- Reuse theme tokens and existing reel data/types.

## Testing Strategy
- Type-check and lint. Manually verify open, input, matching, clearing, empty state, and close behavior because no test runner is configured.

## Boundaries
- Always: pause the underlying reel while search is visible and label icon-only controls.
- Ask first: remote search, navigation to creator profiles, or new dependencies.
- Never: mutate the reel source data while filtering.

## Success Criteria
- The Reels search button opens a full-screen search view.
- Results match author, caption, or hashtags without case sensitivity.
- Closing search restores the current reel viewer.

## Open Questions
- None; results are local until a search API is available.

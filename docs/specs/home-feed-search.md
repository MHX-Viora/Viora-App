# Spec: Home feed search

## Objective
Add an accessible search action at the far right of the home post-composer row. Pressing it opens an in-page search overlay that filters the currently loaded feed by author, body, or location and provides clear empty and close states.

## Tech Stack and Commands
- Expo Router, React Native, TypeScript; no new dependencies.
- Verify: `npx tsc --noEmit` and `npm run lint`.

## Project Structure and Style
- Keep the route thin, feed state in `features/feed`, and reusable UI in `components/feed`.
- Reuse theme tokens, `Pressable`, `TextInput`, and existing `PostCard` rendering patterns.

## Testing Strategy
- Type-check and lint the change. Manually verify opening, typing, matching, empty results, clearing, and closing because the repository has no configured test runner.

## Boundaries
- Always: preserve existing create-post and image-picker behavior; label icon-only controls.
- Ask first: new dependencies or remote search APIs.
- Never: mutate or replace the source feed while filtering.

## Success Criteria
- Search icon appears on the right of the composer row.
- Pressing it opens a focused search experience on the same screen.
- Results match author, content, and location without case sensitivity.
- Closing search returns to the unchanged feed.

## Open Questions
- None. Search uses the locally loaded feed until a backend search API exists.

# Spec: Profile post sizing and article editor scrolling

## Objective

Make profile posts more compact on desktop Web and restore vertical scrolling in the long-article editor for both create and edit routes.

## Tech Stack

Expo 54, React Native 0.81, React Native Web, Expo Router, `react-native-draggable-flatlist`.

## Commands

- Test: `npm test`
- Type-check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web build: `npx expo export --platform web`

## Project Structure

- `components/profile/`: profile post presentation.
- `features/article/`: shared create/edit article editor.
- `theme/`: centralized desktop width tokens.
- `features/**.test.mjs`: layout regression tests.

## Code Style

Use existing responsive helpers and theme width tokens; keep native layouts full-width and avoid one-off window measurements.

## Testing Strategy

Static layout regression tests verify the desktop-only post width and that the draggable editor list owns a bounded flex scroll area.

## Boundaries

- Always: preserve `PostCard`, article data, drag ordering, publishing, and native behavior.
- Ask first: dependencies, API changes, or editor feature changes.
- Never: globally shrink feed posts or replace the draggable editor.

## Success Criteria

- Profile post cards use a centered desktop width smaller than the 760px profile column.
- Compact Web and native profile posts remain full-width.
- Create and edit article screens scroll vertically when content exceeds the viewport.
- The bottom block toolbar stays available while editor content scrolls behind its reserved padding.

## Open Questions

None.

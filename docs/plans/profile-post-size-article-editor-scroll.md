# Plan: Profile post sizing and article editor scrolling

## Architecture Decisions

- Add a centralized profile-post width token and apply it through the existing responsive layout helper.
- Keep create and edit scrolling unified by fixing their shared `ArticleEditorScreen` list sizing.

## Tasks

1. Add failing regression tests for the desktop profile post width and editor scroll ownership.
2. Center and constrain only the profile post list on desktop Web.
3. Give `DraggableFlatList` a flex-bounded scroll viewport and retain bottom content padding.
4. Run the full test, type-check, lint, and Web export gates; review the focused diff.

## Risks

- A global `PostCard` width change would shrink the feed; constrain only `ProfileContent`.
- Absolute bottom tools can cover the final block; retain the existing computed bottom padding.

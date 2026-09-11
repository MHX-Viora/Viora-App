# Spec: Home content header

## Objective

Add a three-action content header above the community post composer. Community
shows normal posts, Short videos opens Reels, and News shows published articles.

## Tech Stack

- Expo Router, React Native and React Native Web
- Existing feed API and `PostType` enum
- Existing theme, responsive layout and Ionicons

## Commands

- Frontend tests: `npm test`
- Frontend type-check: `npx tsc --noEmit`
- Frontend lint: `npm run lint`
- Backend tests: `dotnet test viora-BE.sln`

## Project Structure and Style

- Header UI: `components/feed/feed-category-header.tsx`
- Screen state and navigation: `features/feed/feed-screen.tsx`
- Optional feed filter: existing frontend and backend feed contracts
- Use theme tokens, equal-width accessible buttons and existing responsive layout.

## Testing Strategy

- Add focused UI/source regression tests for order, labels, icons and routes.
- Add contract coverage for the optional `postType` query parameter.
- Run frontend checks, backend tests and browser verification.

## Boundaries

- Always: keep existing post creation, search and pagination behavior.
- Ask first: new dependencies or a new database schema.
- Never: client-filter one page and present it as a complete article feed.

## Success Criteria

- Header appears directly above the post composer.
- Buttons are ordered Community, Short videos, News and have accessible labels.
- Community requests `PostType.Post`; News requests `PostType.Article`.
- Short videos opens the existing Reels tab.
- Fixed feed content never sits underneath the enlarged top bar.

## Open Questions

- None. “News” maps to the existing long-form Article content type.

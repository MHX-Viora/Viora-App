# Spec: Desktop secondary profile and media pages

## Objective

Make profile subpages, friends, reel detail, and post detail readable and centered on desktop Web without changing native/mobile behavior. Reels must preserve the source aspect ratio and never stretch or crop horizontal edges to fill a portrait viewport.

## Tech stack and commands

- Expo Router, React Native Web, TypeScript.
- Test: `npm test`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web build: `npx expo export --platform web`

## Project structure and style

- Route wrappers: `app/`
- Profile screens: `features/profile/`
- Reel screens/components: `features/reels/`, `components/reels/`
- Post detail: `features/feed/post-preview-screen.tsx`
- Responsive tokens/helpers: `theme/layout.ts`, `components/layout/`
- Reuse `ResponsiveContent`, layout tokens, theme colors, and spacing tokens.

## Testing strategy

- Source-contract tests guard route wrappers, centered max widths, and `contentFit="contain"`.
- Existing pure responsive-layout tests guard the widened desktop reel calculation.
- Run the full frontend suite, typecheck, lint, and Web export.
- Perform browser visual verification when a browser session is available.

## Boundaries

- Always: preserve current data fetching, navigation, actions, loading/error states, and mobile/native layouts.
- Ask first: API, route contract, dependency, or persistence changes.
- Never: use full-window dimensions to size centered detail content; stretch or `cover` the foreground reel video.

## Success criteria

- Friends, saved/favorite activity, account settings, change password, edit profile, support, and policies pages are centered and width-bounded on desktop.
- Main reels and reel detail foreground videos use `contain`; blurred backdrop may fill unused space.
- Web reel foreground geometry is calculated from the loaded video's intrinsic size, so landscape, square, and portrait sources all fit completely inside the reel viewport without cropping either side.
- Reel feed and detail are centered in a bounded, slightly wider desktop column, and the foreground video receives the full column width without subtracting its right edge.
- Post detail is centered in a readable 760px column; article reader remains centered in its existing readable width.
- Compact Web and native layouts remain full width.

## Open questions

- None. Desktop widths follow the existing profile/reels/feed layout tokens.

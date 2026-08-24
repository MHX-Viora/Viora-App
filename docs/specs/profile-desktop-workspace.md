# Spec: Profile desktop workspace

## Objective

Make both personal and viewed-user profiles more readable on desktop by reducing the central content width. On large desktop Web, the personal profile becomes a three-column workspace: Friends/QR and an always-visible friend preview on the left, profile content in the center, and settings always visible on the right. Compact Web and native keep the existing single-column flow and modal sheets.

## Tech stack and structure

- Expo Router, React Native Web, TypeScript, existing responsive hooks and theme tokens.
- `features/profile/`: screen composition and friend data loading.
- `components/profile/`: reusable desktop sidebars and settings presentation.
- `theme/layout.ts`: semantic profile widths.

## Commands

- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web build: `npx expo export --platform web`

## Code style

```tsx
{showDesktopRails ? (
  <View style={styles.desktopShell}>
    <ProfileDesktopSidebar />
    <View style={styles.profileColumn}>{profileContent}</View>
    <ProfileSettingsSheet inline visible />
  </View>
) : (
  profileContent
)}
```

Use existing theme colors, spacing, services, navigation callbacks, and shared profile/post/reel components.

## Testing strategy

- RED/GREEN source-layout test for bounded widths, large-desktop rails, inline settings, and friend preview.
- Full unit suite, TypeScript, lint, and Expo Web export.
- Browser screenshot/console verification when a browser session is available.

## Boundaries

- Always: preserve current profile actions, APIs, routes, mobile header, QR modal, and settings navigation.
- Ask first: new dependency, API/schema change, or changing friend business rules.
- Never: duplicate profile posts/reels or expose desktop rails on native/mobile.

## Success criteria

- Personal and viewed-user central content is no wider than 760px.
- At large-desktop width, personal profile shows left friend tools/list and right settings beside the central profile.
- At widths below large desktop and on native, existing single-column and modal behavior remains.
- Posts and videos scale inside the narrower central column without clipping.
- Large-desktop side rails sit close to the viewport edges, while video thumbnails size from the profile column instead of the browser window.

## Open questions

- None; the screenshots and request define large-desktop behavior. The three-column rails activate at the existing 1440px breakpoint to avoid squeezing 1024px layouts.

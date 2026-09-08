# Spec: Premium Ocean Theme

## Objective

Extend the existing application-wide theme system with a premium `premium-ocean`
theme for Expo mobile and Web. Preserve the current `modern` default and the
existing `classic` option exactly; do not change API, database, routing, session,
realtime, notification, call, or other business behavior.

## Assumptions

- `modern` is the current ANKT default and must remain the default.
- `classic` is already user-visible, so it remains available to avoid removing an
  existing interface.
- Premium Ocean is available to every user and is selected like any other theme.
- Existing screens already consuming `useTheme()` inherit Premium Ocean through
  semantic tokens without screen-specific mode checks.

## Tech Stack and Structure

- Expo 54, React Native 0.81, React 19, TypeScript 5.9.
- `theme/`: typed tokens, catalog, themes, preference/access helpers and provider.
- `components/profile/theme-mode-sheet.tsx`: appearance manager and theme previews.
- `components/common/`: reusable gradient presentation using existing
  `react-native-svg`; no new dependency.
- AsyncStorage persists the selected accessible theme independently of login.

## Commands

- Test: `npm test`
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web export: `npx expo export --platform web`
- Color audit:
  `rg '#[0-9A-Fa-f]{3,8}|rgba?\(' app components features hooks -g '*.ts' -g '*.tsx'`

## Theme Contract

- Every theme provides semantic colors, shared gradients, effects and metadata.
- Metadata includes `id`, `name`, `description`, and `premium` for visual labeling.
- Components must not check `mode === "premium-ocean"`.
- Premium Ocean uses navy backgrounds, clean glass-like surfaces, restrained
  turquoise/cyan/blue accents, readable text and limited glow.

## Testing Strategy

- Unit-test mode normalization and catalog metadata first.
- Contract-test the appearance preview and selectable-state UI.
- Verify hydration gates application content until the saved preference resolves.
- Run the full tests, TypeScript, lint, Web export and hard-coded color audit.

## Boundaries

- Always: preserve existing theme values and business handlers; use semantic
  tokens; keep selection state independent from navigation/session state.
- Ask first: add a payment SDK, backend entitlement contract or new dependency.
- Never: hard-code Premium Ocean checks throughout screens.

## Success Criteria

- Premium Ocean satisfies the shared theme contract and automatically reaches all
  existing themed screens on mobile and Web.
- Appearance settings show visual previews, Premium labeling and selected states;
  every listed theme is directly selectable.
- Theme selections persist and hydrate before application content,
  preventing a wrong-theme flash.
- Navigation, status/system background, chat input/send controls and overlays use
  active theme tokens.
- No unexplained UI color literals remain outside theme/media/brand exceptions.

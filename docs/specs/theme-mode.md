# Spec: Theme Mode

## Objective

Keep an application-wide appearance preference without changing API, navigation,
authentication, business, realtime, notification, or call behavior. Light is the
default and uses layered neutral surfaces with restrained ANKT teal. Modern and
Premium Ocean remain available as dark themes. The stored `classic` mode remains
the compatibility key for Light.

## Tech Stack

- Expo 54, React Native 0.81, React 19, TypeScript 5.9
- Expo Router 6
- AsyncStorage for the persisted `theme_mode` preference
- React Context and an `Animated` opacity transition

## Commands

- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Android build check: `npx expo export --platform android`
- Hardcoded-color audit:
  `rg '#[0-9A-Fa-f]{3,8}|rgba?\(' app components features theme -g '*.ts' -g '*.tsx'`

## Project Structure

- `theme/`: theme contracts, Modern and Classic definitions, shared typography and spacing
- `theme/theme-provider.tsx`: preference hydration, persistence, fade transition, and hook
- `components/`: reusable themed UI
- `features/`: themed feature screens
- `app/`: provider integration and navigation chrome
- `docs/plans/`: ordered implementation tasks
- `docs/handoffs/`: final implementation and verification notes

## Code Style

```tsx
export function ExampleCard() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.card} />;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.card,
    },
  });
```

Components consume semantic tokens. Typography, spacing, icons, layout, and existing
behavior remain unchanged.

## Testing Strategy

- Unit-test mode validation and persistence helpers where the current test setup permits.
- Type-check every migrated component.
- Lint the full frontend.
- Audit source colors and allow only theme definitions, media canvas colors, native
  notification constants, and data-driven user colors with an explicit reason.
- Manually verify selecting both modes, fade transition, status/navigation chrome,
  and restoring the saved mode after restart.

## Boundaries

- Always: preserve Modern visuals; use semantic theme tokens; keep the preference
  independent from session state; keep the theme contract extensible.
- Ask first: adding a dependency other than AsyncStorage, changing navigation,
  changing native build configuration beyond dependency autolinking.
- Never: change APIs, authentication behavior, realtime, notifications, database,
  or business rules. Visual-only layout and token changes are allowed.

## Success Criteria

- Settings exposes “Giao diện” with Light, Modern Dark, and Ocean choices and a selected check.
- Changing mode updates the mounted app with a 200–300 ms fade and no reload.
- `theme_mode` persists as `modern` or `classic` and restores on next launch.
- StatusBar, navigation, shared overlays, and all listed feature screens consume theme.
- Light matches the requested layered neutral palette, removes auth ornaments,
  and disables decorative glass/blur/gradient/glow.
- Modern and Premium Ocean remain visually unchanged and selectable.
- Type-check and lint pass; no unexplained component-level hardcoded UI colors remain.

## Assumptions

- The existing profile settings sheet is the requested Settings surface.
- Black remains valid for the video/media canvas itself; surrounding controls are themed.
- Push notification presentation outside the React tree may read the persisted theme
  through a non-hook theme accessor, without changing notification behavior.

## Open Questions

None. The requested behavior and constraints are explicit.

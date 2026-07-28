# Implementation Plan: Theme Mode

## Architecture Decisions

- One typed semantic token contract backs all modes.
- `ThemeProvider` owns hydration, persistence, and transition; components only use
  `useTheme()`.
- Existing feature palettes become compatibility projections of the active theme
  while components are migrated to the hook.
- Theme preference is device-level and independent of authentication.

## Phase 1: Foundation

- [ ] Task 1: Inventory visual tokens and map current Modern values.
  - Acceptance: every existing palette value has a semantic destination.
  - Verify: color audit lists only known source files.
  - Files: `theme/*`, feature color modules.
- [ ] Task 2: Add typed Modern and Classic theme definitions.
  - Acceptance: both satisfy one contract; Classic matches requested values.
  - Verify: TypeScript compile.
  - Files: `theme/types.ts`, `theme/modern.ts`, `theme/classic.ts`, `theme/index.ts`.
- [ ] Task 3: Add preference storage, provider, hook, and root integration.
  - Acceptance: mode hydrates, persists, changes without reload, fades in 240 ms.
  - Verify: focused provider/storage tests and app startup check.
  - Files: theme provider/storage tests, `app/_layout.tsx`.

## Checkpoint: Foundation

- [ ] TypeScript passes and app opens in Modern with no visual change.

## Phase 2: Selection and Shared Chrome

- [ ] Task 4: Add the Settings theme selector modal.
  - Acceptance: two choices, selected check, accessible labels.
  - Verify: manual selection and persistence.
  - Files: profile settings/theme selector components.
- [ ] Task 5: Theme status bar, tab bar, headers, launch screen, toast, dialogs.
  - Acceptance: global chrome follows active mode.
  - Verify: inspect both modes across auth and tabs.
  - Files: root/tabs layouts and shared components, split into ≤5-file batches.

## Checkpoint: Core Flow

- [ ] Switch mode from Settings, navigate through tabs, restart, confirm restoration.

## Phase 3: Feature Migration

- [ ] Task 6: Theme auth and identity screens.
- [ ] Task 7: Theme feed, community, create-post, comments, and search.
- [ ] Task 8: Theme reels and video chrome while preserving the media canvas.
- [ ] Task 9: Theme chat lists, chat detail, bubbles, search, and settings.
- [ ] Task 10: Theme notifications, friends, profile, other-profile, and edit screens.
- [ ] Task 11: Theme calls and remaining utilities/modals/sheets.
  - Acceptance for each task: no behavior/layout changes and all UI colors come from theme.
  - Verify for each task: TypeScript plus targeted hardcoded-color audit.
  - Dependencies: Tasks 2–5.

## Phase 4: Verification

- [ ] Task 12: Full source audit and resolve remaining unexplained UI colors.
- [ ] Task 13: Run type-check, lint, and Android export/build validation.
- [ ] Task 14: Review diff for logic/navigation/API regressions and write handoff.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Static `StyleSheet.create` captures old colors | High | Convert color-bearing styles to memoized factories |
| Modern visual regression | High | Seed Modern from exact existing feature palettes |
| Theme hydration flash | Medium | Default to Modern and complete hydration inside provider |
| Large migration misses overlays | High | Audit all TS/TSX color literals and shared modal hosts |
| Reels/video loses contrast | Medium | Keep semantic media canvas/scrim tokens |

## Complete Checkpoint

- [ ] All success criteria in `docs/specs/theme-mode.md` pass.
- [ ] No API, navigation, auth, realtime, notification, or business diff.
- [ ] Handoff documents exceptions and verification results.

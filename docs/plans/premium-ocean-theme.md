# Implementation Plan: Premium Ocean Theme

## Architecture Decisions

- Extend the existing typed provider rather than replace it.
- Keep theme definitions immutable and place display/access metadata in one
  catalog shared by provider and appearance UI.
- Let every valid catalog theme persist and restore through the provider.
- Use existing `react-native-svg` for reusable gradient layers.

## Tasks

1. [x] Theme contract and catalog
   - Add Premium Ocean mode, metadata, gradients, warning/status tokens and
     centralized access resolution.
   - Verify with focused failing tests, TypeScript and existing theme tests.

2. [x] Provider persistence and startup
   - Hydrate before rendering application content, reject inaccessible stored
     premium modes, and keep switching presentation-only.
   - Verify hydration/access contract tests.

3. [x] Appearance manager
   - Replace text-only rows with visual previews, a Premium label and accessible
     radio selection for every theme.
   - Verify source contract tests and responsive styling.

4. [x] Premium presentation integration
   - Add a reusable gradient layer, apply it to the chat Send CTA, synchronize
     system background, and migrate remaining unexplained UI colors.
   - Verify targeted tests and color audit.

5. [x] Full verification and handoff
   - Run test, type check, lint and Web export; review business/API diffs; document
     covered screens and verification results.

## Risks

- Existing dirty worktree: edit only theme/UI files and preserve unrelated work.
- Invalid AsyncStorage values: normalize unknown modes to the default during hydration.
- Current-theme regression: keep `modern` and `classic` token values unchanged.
- Re-render cost: memoize catalog/context/style values and avoid remounting routes.

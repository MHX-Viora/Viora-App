# Implementation Plan: Complete Profile theme alignment

## Architecture decisions
- Use semantic `theme.colors` and `theme.effects`; do not introduce a parallel palette.
- Keep the existing component tree and behavior, applying targeted visual changes.

## Tasks

### Task 1: Guard design-system alignment
- Acceptance: regression test requires AuthBackground and semantic tokens.
- Verify: focused Node test fails before implementation and passes afterward.
- Files: `features/auth/complete-profile-theme.test.mjs`, `scripts/test.mjs`.

### Task 2: Align the screen and photo picker
- Acceptance: background, header, form, inputs, gender controls, and image controls
  match auth theme conventions in Modern and Classic modes.
- Verify: focused test, TypeScript, ESLint.
- Files: `features/auth/complete-profile-screen.tsx`,
  `components/auth/profile-photo-picker.tsx`.

### Task 3: Align logout confirmation
- Acceptance: dialog uses themed overlay, surface, danger, borders, radii, and shadow.
- Verify: existing logout test and full test suite.
- Files: `features/auth/complete-profile-logout-dialog.tsx`.

## Checkpoint
- `npm test`, `npx tsc --noEmit`, and `npm run lint` pass.
- Diff review shows no business logic or backend changes.

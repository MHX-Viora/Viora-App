# Spec: Complete Profile theme alignment

## Objective
Make Complete Profile visually consistent with the current ANKT authentication
experience in both Modern and Classic modes, without changing profile creation or
logout behavior.

## Tech stack and commands
- React Native, Expo Router, TypeScript, `StyleSheet`, existing theme provider.
- Test: `npm test`; typecheck: `npx tsc --noEmit`; lint: `npm run lint`.

## Project structure and style
- Keep screen composition in `features/auth/complete-profile-screen.tsx`.
- Reuse `AuthBackground`, `AuthPrimaryButton`, theme colors/effects, and spacing.
- Keep image selection in `components/auth/profile-photo-picker.tsx`.
- Keep logout confirmation in its existing feature component.

## Testing strategy
- Add a source-level regression test following the repository's Node test pattern.
- Assert the screen uses the shared auth background and semantic theme tokens.
- Assert the picker and dialog avoid light-only visual color tokens.
- Run the full mobile tests, TypeScript, and ESLint.

## Boundaries
- Always: preserve accessibility roles, safe-area and keyboard behavior.
- Ask first: new dependencies, image assets, API or navigation changes.
- Never: change required fields, upload behavior, logout behavior, or route targets.

## Success criteria
- Modern mode uses the navy/cyan auth palette; Classic mode remains readable.
- Header, photo picker, form fields, gender controls, CTA, and logout dialog share
  the same surface, border, typography, and pressed-state language as Login/Register.
- No Complete Profile surface depends on hardcoded light-only visual tokens.
- Existing completion and logout regression tests remain green.

## Open questions
- None. Existing Login/Register screens are the visual source of truth.

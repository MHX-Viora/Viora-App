# Spec: First-login profile completion

## Objective
Add a first-login profile completion preview matching the supplied mobile reference.

## Tech stack and commands
- Expo Router, React Native, Expo Image Picker, TypeScript, Ionicons.
- Verify with `npm run lint` and `npx tsc --noEmit`.

## Structure and style
- Thin route in `app/complete-profile.tsx`; screen in `features/auth/`.
- Reuse theme tokens, native image/input controls, safe-area and keyboard handling.

## Testing strategy
- Typecheck and lint route contracts and picker code.
- Manually verify cover/avatar selection, display name, gender selection, and completion navigation.

## Boundaries
- Keep data local for preview; do not persist profile or add backend/auth logic.
- Do not add dependencies.

## Success criteria
- Login and Google login open profile completion for the preview first-login flow.
- User can independently select an uncropped original cover and a square-cropped avatar, enter a display name, and select one gender.
- “Bắt đầu ngay” replaces onboarding with the main app.

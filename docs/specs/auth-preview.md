# Spec: Authentication preview

## Objective
Build responsive login and registration previews matching the supplied mobile references, and open login from Profile settings logout.

## Tech stack and commands
- Expo Router, React Native, TypeScript, Ionicons, existing theme tokens.
- Verify with `npm run lint` and `npx tsc --noEmit`.

## Structure and style
- Thin routes in `app/`; screens in `features/auth/`; shared form controls in `components/auth/`.
- Accessible labels, password visibility controls, keyboard-safe scrolling, and touch targets.

## Testing strategy
- Typecheck route/component contracts and lint all UI.
- Manually preview login, registration, cross-links, password toggles, terms toggle, and Profile logout navigation.

## Boundaries
- Always reuse current dependencies and design tokens.
- Ask before adding real authentication or external providers.
- Never persist credentials in this preview.

## Success criteria
- Both reference screens render as native routes and link to each other.
- Logout in Profile settings closes the sheet and opens login.
- Login preview can return to the existing app.


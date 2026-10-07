# Light Theme Redesign Handoff

## Delivered

- Made the existing `classic` theme the default Light mode while retaining its
  stored key for existing preferences. Existing `modern` and `premium-ocean`
  dark modes remain selectable.
- Updated shared Light tokens: page `#F0F2F5`, white surfaces, input `#F0F2F5`,
  hover `#E9EDF2`, subtle/default borders `#E4E6EB` / `#D8DADF`, text
  `#1C1E21` / `#65676B`, and ANKT teal `#168AAD`.
- Tuned common card shadow/radius, wallet Light surfaces, and auth input focus,
  buttons, and card treatment. Removed the old auth glow and orbit decorations.
- Screens using shared theme tokens inherit the Light palette across feed,
  articles, chat, notifications, profile, settings, utilities, wallet, and ads.

## Preserved

- No API, route, authentication, database, realtime, or business behavior changes.
- Dark theme palettes and black video playback canvas remain available.
- Theme preference storage continues using `theme_mode`; `classic` is the Light
  compatibility identifier.

## Verification

- `npm test`: 370 tests pass.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- Live browser QA could not run: Metro worker startup is blocked by environment
  `spawn EPERM`. Visual/responsive confirmation should be completed in a runtime
  with process spawning enabled.

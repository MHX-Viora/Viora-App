# ANKT wallet summary redesign

## Scope
Skills: UI UX Pro Max and UI Styling, adapted to the existing React Native/Ionicons/theme stack. Wallet screenshot was absent in the supplied turn, so analysis used the user's detailed brief and current implementation.

## Changes
- `components/wallet/wallet-summary-card.tsx`: neutral layered surface, prominent tabular VND balance, adjacent privacy toggle, subdued ANKT coin block. Large glow/artwork removed. All balance and route callbacks preserved; no API/payment changes.
- `features/utilities/utilities-screen.tsx`: smaller header and clearer subtitle; loading begins for each fetch; wallet stays mounted on errors with safe copy and retry.
- Card width is measured with `onLayout`: below 480px deposit occupies its own row, other actions share the next row; above 600px secondary coin balance sits beside VND. Typography 32px compact/40px wide, smaller for long values. Desktop Utilities content retains existing 760px limit.
- Semantic theme tokens support Light, Modern Dark and Ocean without global palette changes. Primary action uses `primaryPressed` for measured AA text contrast. Other utilities retain their existing styling.
- Loading uses static skeletons; unknown/error balances are never formatted as zero; loaded zero remains actionable. Error/loading disable wallet actions. Hidden state masks VND and ANKT.
- Controls: 44px privacy target, 48px actions, button roles/labels/disabled state, focus outline on web, hover/press feedback, toggle tooltip. 180ms color/opacity transitions only when reduced motion is off; preference listener cleaned up.

## Verification
- Nine Node component tests pass using real React/React Native Web rendering, with substituted theme context, viewport and icon rendering. Exercise three themes and six viewport inputs, loading/error/null/zero/hidden, callbacks, contrast, control targets and card-width responsive layouts.
- TypeScript and full Expo lint pass.
- Production web export passes with one Metro worker: `.codex-tmp/wallet-summary-web`.
- No connected browser is available. SSR viewport fixtures validate rendering branches and data states, not actual browser geometry, keyboard operation, native Dynamic Type or screenshots. Those visual checks remain manual.

## Commands
`node --test --experimental-test-isolation=none components/wallet/wallet-summary-card.test.mjs`

`npx tsc --noEmit --pretty false`

`npm run lint`

`npx expo export --platform web --max-workers 1 --output-dir .codex-tmp/wallet-summary-web`

Test and export initially hit sandbox `spawn EPERM`; disabling test isolation and using one Metro worker resolves subprocess spawning without escalation.

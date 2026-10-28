# Compact wallet and utilities promotion

Implemented the existing `docs/specs/wallet-compact-promotion.md` continuation.

- Wallet uses the supplied navy/gold asset, 1853:849 ratio, maximum width 420px. Xu ANKT sits below VND. Deposit, withdraw and history use labelled icon controls. Follow-up removes the manage/gear button at the user's request and gives all three actions the previous gear button's dark surface, border and light icons. Deposit uses `download-outline`.
- Fixed interrupted JSX, missing control styles and obsolete sizing. Loading, unavailable/error, retry and balance privacy remain supported. Hover/focus tooltips use a navy surface and explicit light text across themes; aligned to the button's right edge to prevent clipping at the wallet's right boundary.
- `components/utilities/wallet-promotion-row.tsx` measures its parent; at 720px or above the banner sits beside the wallet, otherwise below. Banner uses existing Mini App artwork and scrolls to the catalog. It is omitted when the catalog is disabled or unsupported on the platform.
- No wallet API, transaction or deployment changes.

Validation:
- `node --test --experimental-test-isolation=none components/wallet/wallet-summary-card.test.mjs`
- `node components/utilities/wallet-promotion-row.browser.mjs`
- `npx tsc --noEmit --pretty false`
- `npx eslint components/wallet/wallet-summary-card.tsx components/utilities/wallet-promotion-row.tsx features/utilities/utilities-screen.tsx`

Browser fixture uses actual RN Web components with local wallet balances, theme and icon substitutes; it checks 320/375/768/1024/1440px, a narrow desktop parent, button bounds, callbacks, retry and privacy. Screenshots: `.codex-tmp/wallet-promotion-375.png` and `wallet-promotion-1440.png`. It does not execute financial transactions or authenticate to the full app. Chrome DevTools MCP profile was busy, so the existing isolated headless Chrome fixture was used.

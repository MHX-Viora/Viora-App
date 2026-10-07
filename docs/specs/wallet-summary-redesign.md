# Wallet summary redesign

## Objective
Redesign Utilities > ANKT Wallet as a restrained social fintech card. The user's supplied brief is the specification and authorization to implement. No wallet screenshot was attached to this turn; audit uses the brief and current source.

## Scope and acceptance
- Preserve VND formatting, ANKT coin, visibility toggle, deposit/withdraw/history callbacks and wallet APIs.
- Balance is the primary visual anchor; remove large curved decoration and overlapping artwork.
- Use existing theme, spacing, typography, Ionicons and React Native primitives, without new dependencies.
- Distinguish primary, secondary and tertiary actions. Mobile stacks deposit above the other actions; tablet/desktop use a row based on actual card width.
- Loading has reserved skeleton space, null/error never reads as a real zero balance, error retains the card and offers retry. Mask both monetary values when hidden.
- Controls have labels, disabled states, at least 44px targets, hover/press/focus treatment, and desktop toggle tooltip. Avoid decorative animation; interaction styles respect reduced motion.
- Support Light, Modern Dark and Ocean themes; do not restyle other utility cards or global theme tokens.

## Structure and style
`components/wallet/wallet-summary-card.tsx` owns presentation. `features/utilities/utilities-screen.tsx` supplies request state and routes. Styles use `StyleSheet.create`, semantic tokens and existing spacing.

```tsx
<WalletSummaryCard loading={loading} error={error} onRetry={loadWallet}
  wallet={wallet} onDeposit={onDeposit} onWithdraw={onWithdraw} onHistory={onHistory} />
```

## Verification commands
- `node --test --experimental-test-isolation=none components/wallet/wallet-summary-card.test.mjs`
- `npx tsc --noEmit --pretty false`
- `npm run lint`
- `npx expo export --platform web --max-workers 1 --output-dir .codex-tmp/wallet-summary-web`

No package test/build scripts exist. Use local Node tests and Expo export. Single-process flags avoid the sandbox's child-worker spawn restriction. Component tests cover privacy, loading/error/null/zero, disabled controls, callback preservation and responsive branches. Browser checks at 320/375/768/820/1024/1440px and both theme families remain pending if no browser connects.

## Boundaries
Always preserve routes, API contracts and business rules. No added dependencies, global theme changes, balance logs or balance in URLs. No payment transactions during verification.

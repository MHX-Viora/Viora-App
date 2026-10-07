# Spec: Hoàn thiện nạp tiền Ví ANKT bằng mã QR

## Objective
Hoàn thiện luồng nạp tiền QR trên kiến trúc Ví/payOS hiện có. Payment là nguồn trạng thái thanh toán; bút toán Ví phải phản ánh cùng trạng thái, số dư chỉ được cộng đúng một lần, và FE chỉ dùng polling để đồng bộ UI.

## Tech Stack and Commands
- Mobile: Expo 54, React Native, TypeScript, Expo Router.
- Backend: ASP.NET Core 8, EF Core, PostgreSQL, payOS.
- FE focused tests: `node --experimental-strip-types --test features/wallet/wallet-feature-contract.test.mjs utils/wallet-payment.test.mjs utils/wallet-format.test.mjs`
- FE verification: `npx tsc --noEmit` and `npm run lint`.
- BE tests/build: `dotnet test viora-BE.sln` and `dotnet build viora-BE.sln --no-restore`.

## Project Structure and Style
- Payment lifecycle: `Viora.Infrastructure/Wallets/PaymentService.cs`.
- Atomic wallet credit: `Viora.Infrastructure/Wallets/WalletService.cs`.
- API contracts/rules: `Viora.Application/Wallets/WalletContracts.cs`.
- Mobile flow: `features/wallet/wallet-deposit-screen.tsx` plus existing wallet service/types/format helpers.
- Reuse current enums, theme tokens, components, API routes, tables, and provider integration.

## Architecture Decisions
- `Payments.Status` is the payment source of truth for deposits; transaction-history responses expose it for exact Pending/Paid/Failed/Cancelled/Expired labels.
- Each usable payment owns one pending deposit ledger row. Completion updates that row to Completed inside the same DB transaction that locks payment/wallet and credits the balance.
- The stable deposit idempotency key is derived from the internal payment ID, not a webhook delivery/reference value.
- Server returns an explicit `expiresAt`; FE never rebuilds a fresh 15-minute window after reload.
- A valid paid webhook may complete an expired-but-not-credited payment because provider confirmation is authoritative; a Paid payment never transitions back to Pending/Expired.

## Testing Strategy
- Unit-test server expiry and legal completion rules.
- Contract-test `expiresAt`, `transactionId`, payment status propagation, stable idempotency, row locking, and FE lifecycle polling.
- Unit-test countdown from server `expiresAt` and exact Vietnamese status labels.
- Run focused tests after each slice, then full build/type-check/lint.

## Boundaries
- Always: validate webhook signatures, use a DB transaction and row locks, stop polling on terminal status, refresh on foreground, preserve network errors as non-terminal.
- Ask first: add providers/dependencies, change deposit limits, or alter unrelated wallet operations.
- Never: credit from FE, create a new payment from polling/fallback checkout, expose payOS branding in user-facing deposit copy, or allow duplicate credit.

## Success Criteria
- Amount screen only shows amount choices/input and `Phương thức thanh toán` / `Quét mã QR`.
- QR screen shows QR, amount, transfer content/order code, checkout fallback, and `MM:SS` based on server `expiresAt`.
- FE polls the existing payment every five seconds only while active; foreground causes one immediate check without duplicate timers.
- Pending payment expires server-side without credit. Paid/Failed/Cancelled/Expired stop polling.
- Webhook completion atomically sets Payment Paid, ledger Completed, PaidAt/provider reference, and credits once.
- Duplicate/concurrent completions return the existing completed ledger and never credit twice.
- History/detail display `Đang xử lý`, `Thành công`, `Thất bại`, `Đã hủy`, or `Đã hết hạn` from the effective deposit payment status.

## Implementation Plan
1. Add failing BE lifecycle and FE contract/countdown/status tests.
2. Add expiry/linkage fields and migration; return them in payment/history contracts.
3. Create one pending ledger per QR payment and atomically complete it with row locking/idempotency.
4. Expire pending payments server-side and keep status/history synchronized.
5. Update FE countdown, AppState-aware polling, terminal UI, and refresh behavior.
6. Run focused and full verification; document the handoff.

## Open Questions
- None. The detailed user requirements are treated as the approved specification; no new payment provider or wallet redesign is in scope.

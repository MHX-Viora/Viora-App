import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const utilitiesSource = readFileSync(new URL("../utilities/utilities-screen.tsx", import.meta.url), "utf8");
const detailSource = readFileSync(new URL("./wallet-detail-screen.tsx", import.meta.url), "utf8");
const historySource = readFileSync(new URL("./wallet-history-screen.tsx", import.meta.url), "utf8");
const summarySource = readFileSync(new URL("../../components/wallet/wallet-summary-card.tsx", import.meta.url), "utf8");
const serviceSource = readFileSync(new URL("../../services/wallet.service.ts", import.meta.url), "utf8");
const withdrawSource = readFileSync(new URL("./wallet-withdraw-screen.tsx", import.meta.url), "utf8");
const depositSource = readFileSync(new URL("./wallet-deposit-screen.tsx", import.meta.url), "utf8");
const transactionDetailSource = readFileSync(new URL("./wallet-transaction-detail-screen.tsx", import.meta.url), "utf8");

test("wallet keeps money transfer entry points removed", () => {
  assert.doesNotMatch(utilitiesSource, /wallet\/transfer|Chuyển tiền|swap-horizontal/);
  assert.doesNotMatch(detailSource, /wallet\/transfer|Chuyển tiền|swap-horizontal/);
  assert.doesNotMatch(serviceSource, /transferWalletMoney|api\/wallet\/transfers/);
});

test("summary card exposes deposit, withdrawal and history", () => {
  assert.match(summarySource, /onDeposit: \(\) => void/);
  assert.match(summarySource, /onWithdraw: \(\) => void/);
  assert.match(summarySource, /onHistory: \(\) => void/);
  assert.match(summarySource, /label="Nạp tiền"/);
  assert.match(summarySource, /label="Rút tiền"/);
  assert.match(summarySource, /label="Lịch sử"/);
});

test("wallet colors come from theme tokens", () => {
  assert.match(summarySource, /theme\.wallet/);
  assert.match(utilitiesSource, /theme\.wallet/);
  assert.doesNotMatch(summarySource, /#[0-9a-f]{3,8}/i);
  assert.doesNotMatch(utilitiesSource, /#[0-9a-f]{3,8}/i);
});

test("withdrawal flow and reusable ANKT coin icon are routed", () => {
  assert.equal(existsSync(new URL("../../app/wallet/withdraw.tsx", import.meta.url)), true);
  assert.equal(existsSync(new URL("../../components/wallet/ankt-coin-icon.tsx", import.meta.url)), true);
  assert.match(serviceSource, /createWalletWithdrawal/);
  assert.match(serviceSource, /getWalletBankAccounts/);
});

test("history exposes deposit, withdrawal, payment and receive filters", () => {
  for (const label of ["Nạp tiền", "Rút tiền", "Thanh toán", "Nhận tiền"]) {
    assert.match(historySource, new RegExp(label));
  }
});

test("withdrawal presets show full VND amounts", () => {
  assert.match(withdrawSource, /formatVnd\(value\)/);
  assert.doesNotMatch(withdrawSource, /notation:\s*"compact"/);
});

test("withdrawal can select the entire available VND balance", () => {
  assert.match(withdrawSource, /accessibilityLabel="Rút toàn bộ số dư"/);
  assert.match(withdrawSource, /setAmountText\(String\(wallet\.availableBalance\)\)/);
});

test("deposit resolves blank QR data through the checkout URL without showing a fee", () => {
  assert.match(depositSource, /resolveWalletPaymentQrValue\(payment\)/);
  assert.doesNotMatch(depositSource, /Phí giao dịch|Theo payOS/);
});

test("deposit uses the simplified QR payment copy and keeps automatic polling", () => {
  assert.match(depositSource, /Quét mã QR/);
  assert.match(depositSource, /Mở trang dự phòng/);
  assert.match(depositSource, /getWalletPayment\(payment\.id\)/);
  assert.doesNotMatch(
    depositSource,
    /Mở trang payOS|Kiểm tra trạng thái|Ví chỉ cập nhật|Số tiền nạp|Tổng thanh toán/,
  );
  assert.match(depositSource, /AppState\.addEventListener/);
  assert.match(depositSource, /payment\.expiresAt/);
  assert.doesNotMatch(depositSource, /checks\s*>=\s*24/);
});

test("wallet payment contract exposes server expiry and its linked transaction", () => {
  const typesSource = readFileSync(new URL("../../types/wallet.ts", import.meta.url), "utf8");
  assert.match(typesSource, /expiresAt:\s*string/);
  assert.match(typesSource, /transactionId:\s*string\s*\|\s*null/);
  assert.match(typesSource, /paymentStatus\?:\s*PaymentStatus\s*\|\s*null/);
});

test("successful deposits invalidate wallet balance, history and transaction detail", () => {
  assert.match(serviceSource, /invalidateWalletData/);
  assert.match(serviceSource, /subscribeWalletDataInvalidation/);
  assert.match(depositSource, /invalidateWalletData\(\)/);
  assert.match(detailSource, /subscribeWalletDataInvalidation/);
  assert.match(historySource, /subscribeWalletDataInvalidation/);
  assert.match(transactionDetailSource, /subscribeWalletDataInvalidation/);
});

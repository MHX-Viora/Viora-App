import assert from "node:assert/strict";
import test from "node:test";

import {
  formatVnd,
  walletTransactionLabel,
  walletTransactionSign,
  walletTransactionStatusLabel,
} from "./wallet-format.ts";

test("wallet amounts use Vietnamese VND formatting and an explicit incoming sign", () => {
  assert.match(formatVnd(500000), /500[.\s]000/);
  assert.match(walletTransactionSign(500000), /^\+/);
  assert.match(walletTransactionSign(-100000), /^-/);
});

test("deposit history uses the payment source of truth for every terminal state", () => {
  assert.equal(walletTransactionStatusLabel({ status: 0, paymentStatus: 0 }), "Đang xử lý");
  assert.equal(walletTransactionStatusLabel({ status: 0, paymentStatus: 1 }), "Thành công");
  assert.equal(walletTransactionStatusLabel({ status: 2, paymentStatus: 2 }), "Thất bại");
  assert.equal(walletTransactionStatusLabel({ status: 2, paymentStatus: 3 }), "Đã hủy");
  assert.equal(walletTransactionStatusLabel({ status: 2, paymentStatus: 4 }), "Đã hết hạn");
});

test("wallet transaction labels cover deposit and transfers", () => {
  assert.equal(walletTransactionLabel(0), "Nạp tiền");
  assert.equal(walletTransactionLabel(1), "Nhận tiền");
  assert.equal(walletTransactionLabel(2), "Chuyển tiền");
});

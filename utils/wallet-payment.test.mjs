import assert from "node:assert/strict";
import test from "node:test";

import {
  formatWalletPaymentTimeRemaining,
  resolveWalletPaymentQrValue,
  resolveWalletRequestErrorMessage,
} from "./wallet-payment.ts";

test("wallet payment countdown shows the remaining time in MM:SS", () => {
  assert.equal(
    formatWalletPaymentTimeRemaining(
      "2026-09-18T12:15:00.000Z",
      Date.parse("2026-09-18T12:00:35.000Z"),
    ),
    "14:25",
  );
});

test("wallet payment countdown stops at zero after expiry", () => {
  assert.equal(
    formatWalletPaymentTimeRemaining(
      "2026-09-18T12:15:00.000Z",
      Date.parse("2026-09-18T12:16:00.000Z"),
    ),
    "00:00",
  );
});

test("wallet payment countdown safely handles an invalid expiry time", () => {
  assert.equal(formatWalletPaymentTimeRemaining("invalid", 0), "00:00");
});

test("wallet payment QR falls back when payOS returns a blank qrCode", () => {
  assert.equal(
    resolveWalletPaymentQrValue({
      checkoutUrl: "  https://pay.payos.vn/web/checkout  ",
      qrCode: "   ",
    }),
    "https://pay.payos.vn/web/checkout",
  );
});

test("wallet payment QR is unavailable when both provider values are blank", () => {
  assert.equal(
    resolveWalletPaymentQrValue({ checkoutUrl: null, qrCode: "\t" }),
    null,
  );
});

test("wallet request errors expose the backend message instead of a generic error", () => {
  assert.equal(
    resolveWalletRequestErrorMessage({
      message: "Internal server error. Check server logs with traceId.",
      traceId: "trace-123",
    }),
    "Internal server error. Check server logs with traceId. (trace-123)",
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const directory = path.dirname(fileURLToPath(import.meta.url));
function compile(file, overrides = {}) {
  const module = new Module(file);
  module.paths = Module._nodeModulePaths(path.dirname(file));
  module.require = (name) => overrides[name] ?? require(name);
  module._compile(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return module.exports;
}
const user = compile(path.join(directory, "money.ts"));
const admin = compile(path.resolve(directory, "../../viora-admin/src/utils/money.ts"));
for (const [value, expected] of [[0, "0 ₫"], [1, "1 ₫"], [1000, "1.000 ₫"], [100000, "100.000 ₫"], [1000000, "1.000.000 ₫"], [1000000000, "1.000.000.000 ₫"], [-5000, "-5.000 ₫"]]) {
  test(`User and Admin show exact full VND: ${value}`, () => { assert.equal(user.formatVnd(value), expected); assert.equal(admin.formatVnd(value), expected); });
}
test("Invalid amounts never render NaN, infinity, fractional money or false zero", () => {
  for (const value of [NaN, Infinity, -Infinity, null, undefined, "1000", 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(user.formatVnd(value), "—"); assert.equal(admin.formatVnd(value), "—");
  }
});
test("Money input preserves meaning and leading zeroes safely", () => {
  assert.equal(user.parseVndInput("0050000"), 50000);
  for (const value of ["", "-50000", "1.5", "1e6", "1,000", "NaN", "9007199254740992"]) assert.equal(user.parseVndInput(value), null);
});
test("Only Live uses compact K/M formatting", () => {
  assert.equal(user.formatCompactVnd(1000), "1K"); assert.equal(user.formatCompactVnd(1500000), "1,5M");
  assert.equal(user.formatVnd(1500000), "1.500.000 ₫");
});

test("Percentage fee labels preserve decimal rates", () => {
  assert.equal(user.formatFeePercent(0), "0%");
  assert.equal(user.formatFeePercent(10), "10%");
  assert.equal(user.formatFeePercent(12.5), "12,5%");
  assert.equal(user.formatFeePercent(99.99), "99,99%");
});

test("Withdrawal transport sends the exact confirmed fee and stable request key", async () => {
  const calls = [];
  const service = compile(path.resolve(directory, "../services/wallet.service.ts"), {
    "@/services/authenticated-fetch": { authenticatedFetch: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return { ok: true, text: async () => JSON.stringify({ id: "saved" }) }; } },
    "@/utils/wallet-payment": { resolveWalletRequestErrorMessage: () => "Phí thay đổi" },
  });
  const response = await service.createWalletWithdrawal(100000, "owned-bank", "stable-request-key", 10000);
  assert.equal(response.id, "saved");
  assert.deepEqual(calls[0].body, { amount: 100000, bankAccountId: "owned-bank", idempotencyKey: "stable-request-key", expectedFee: 10000 });
});
test("Legacy coin history has its own unit", () => {
  const wallet = compile(path.join(directory, "wallet-format.ts"), { "./money": user });
  assert.equal(wallet.walletTransactionDisplayAmount({ coinAmount: -3, amount: 0 }), "-3 ANKT coin");
  assert.equal(wallet.walletTransactionDirection({ type: 8, coinAmount: -3, amount: 0 }), "outgoing");
});

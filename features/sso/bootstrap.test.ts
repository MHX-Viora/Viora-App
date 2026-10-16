import assert from "node:assert/strict";
import test from "node:test";
import { completeFirstPartySso, SsoBootstrapError } from "./bootstrap";
import { pendingSsoReturn, rememberSsoReturn } from "../../utils/sso-return";

const transaction = "11111111-2222-3333-4444-555555555555";
const completion = `https://issuer.example/sso/complete?transaction=${transaction}`;
const base = { issuer: "https://issuer.example", transaction, loadSession: async () => ({ accessToken: "first-party-only" }), refreshSession: async () => "refreshed" };

test("valid session bootstraps without login and without sending cookies or tokens in URLs", async () => {
  const result = await completeFirstPartySso({ ...base, fetcher: async (url, init) => {
    assert.equal(String(url), "https://issuer.example/sso/bootstrap");
    assert.equal(init?.credentials, "omit"); assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer first-party-only");
    assert.deepEqual(JSON.parse(String(init?.body)), { transactionId: transaction });
    return Response.json({ completionUrl: completion });
  } });
  assert.equal(result, completion);
});

test("expired or legacy session refreshes once and retries with the new credential", async () => {
  let requests = 0, refreshes = 0;
  const result = await completeFirstPartySso({ ...base, refreshSession: async () => { refreshes++; return "new-access"; }, fetcher: async (_url, init) => {
    requests++;
    if (requests === 1) return Response.json({ error: { code: "SSO_REFRESH_REQUIRED" } }, { status: 401 });
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer new-access");
    return Response.json({ completionUrl: completion });
  } });
  assert.equal(result, completion); assert.equal(refreshes, 1); assert.equal(requests, 2);
});

test("missing session requests existing login without making an authorization POST", async () => {
  await assert.rejects(completeFirstPartySso({ ...base, loadSession: async () => null, fetcher: async () => { throw new Error("must not fetch"); } }), (e: SsoBootstrapError) => e.code === "ANKT_LOGIN_REQUIRED");
});

test("completion navigation is restricted to the configured issuer and same transaction", async () => {
  for (const url of ["https://evil.example/sso/complete", completion + "&token=bad", completion.replace(transaction, "00000000-0000-0000-0000-000000000000"), "https://issuer.example/api/accounts/logout"]) {
    await assert.rejects(completeFirstPartySso({ ...base, fetcher: async () => Response.json({ completionUrl: url }) }), (e: SsoBootstrapError) => e.code === "SSO_RESPONSE_INVALID");
  }
});

test("timeouts settle even when transport ignores abort", async () => {
  await assert.rejects(completeFirstPartySso({ ...base, timeoutMs: 15, fetcher: () => new Promise(() => {}) }), (e: SsoBootstrapError) => e.code === "SSO_TIMEOUT");
});

test("configuration rejects insecure issuers and invalid transactions before loading credentials", async () => {
  for (const config of [{ issuer: "http://issuer.example" }, { transaction: "bad" }])
    await assert.rejects(completeFirstPartySso({ ...base, ...config, loadSession: async () => { throw new Error("must not load"); } }), (e: SsoBootstrapError) => e.code === "SSO_CONFIG_INVALID");
});

test("pending login return accepts only the local SSO page", () => {
  const values = new Map<string,string>(); const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string,v: string) => { values.set(k,v); }, removeItem: (k: string) => { values.delete(k); } };
  rememberSsoReturn(transaction, storage); assert.equal(pendingSsoReturn(storage), `/sso/login?transaction=${transaction}`);
  for (const key of values.keys()) values.set(key,"https://evil.example");
  assert.equal(pendingSsoReturn(storage), null);
});

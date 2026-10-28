import assert from "node:assert/strict";
import test from "node:test";
import { proxyAccountRequest } from "../../../server/developer/account-proxy.cjs";
import { validateAuthForm } from "../lib/auth-validation";
import { developerCookiePolicy } from "../../../server/developer/developer-cookie.cjs";
import { decodeSmtpMessage } from "./smtp-message";

const config = { apiOrigin: "http://127.0.0.1:5318", siteOrigin: "http://localhost:8081", token: "opaque-session" };
const request = (origin = config.siteOrigin, body = "{}") => new Request("http://localhost:8081/developers/api/account/auth/login", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "X-ANKT-Developer": "1" }, body });

test("production cookies are secure, HttpOnly, scoped and host-only", () => {
  const policy = developerCookiePolicy("https://mxh.ankt.vn");
  assert.equal(policy.name, "__Secure-ankt_developer");
  assert.deepEqual(policy.options, { httpOnly: true, secure: true, sameSite: "lax", path: "/developers" });
  assert.equal(developerCookiePolicy("http://127.0.0.1:8081").options.secure, false);
  assert.throws(() => developerCookiePolicy("http://mxh.ankt.vn"));
});

test("SMTP fixture decodes MIME transfer encoding without corrupting raw fragment tokens", () => {
  const token = "aA" + "x".repeat(41);
  const plain = `http://localhost/verify-email#token=${token}`;
  assert.equal(decodeSmtpMessage(`Content-Transfer-Encoding: 8bit\r\n\r\n${plain}`), plain);
  assert.equal(decodeSmtpMessage(`Content-Transfer-Encoding: quoted-printable\r\n\r\n${plain.replace("=", "=3D")}`), plain);
  assert.equal(decodeSmtpMessage(`Content-Transfer-Encoding: base64\r\n\r\n${Buffer.from(plain).toString("base64")}`), plain);
});

test("BFF rejects cross-origin, missing CSRF header and non-allowlisted paths before fetch", async () => {
  let calls = 0;
  const upstream = async () => { calls++; return Response.json({}); };
  assert.equal((await proxyAccountRequest(request("https://evil.test"), "auth/login", config, upstream)).status, 403);
  const missing = request(); missing.headers.delete("X-ANKT-Developer");
  assert.equal((await proxyAccountRequest(missing, "auth/login", config, upstream)).status, 403);
  assert.equal((await proxyAccountRequest(request(), "../accounts", config, upstream)).status, 404);
  assert.equal(calls, 0);
});

test("BFF sends only Developer authorization and never forwards browser cookies or arbitrary headers", async () => {
  const req = request(); req.headers.set("Cookie", "ankt=secret"); req.headers.set("Authorization", "Bearer ankt-jwt");
  const response = await proxyAccountRequest(req, "auth/login", config, async (url, init) => {
    assert.equal(url, "http://127.0.0.1:5318/api/developer/auth/login");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Cookie"), null);
    assert.equal(headers.get("Authorization"), "DeveloperSession opaque-session");
    assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
    return Response.json({ message: "ok" });
  });
  assert.equal(response.status, 200);
});

test("BFF rejects oversized/invalid JSON and sanitizes network failure", async () => {
  const unavailable = async () => { throw new Error("secret upstream details"); };
  assert.equal((await proxyAccountRequest(request(config.siteOrigin, "invalid"), "auth/login", config, unavailable)).status, 400);
  assert.equal((await proxyAccountRequest(request(config.siteOrigin, JSON.stringify({ value: "x".repeat(20000) })), "auth/login", config, unavailable)).status, 413);
  const response = await proxyAccountRequest(request(), "auth/login", config, unavailable);
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes("secret upstream"));
});

test("registration/password validation rejects empty fields, mismatch and missing terms", () => {
  const invalid = validateAuthForm("register", { fullName: "", email: "bad", password: "short", confirmPassword: "different", acceptTerms: false });
  assert.ok(invalid.fullName && invalid.email && invalid.password && invalid.confirmPassword && invalid.acceptTerms);
  assert.deepEqual(validateAuthForm("register", { fullName: "Developer", email: "dev@example.test", password: "Long developer password", confirmPassword: "Long developer password", acceptTerms: true }), {});
});

test("production BFF requires trusted ingress and signs client attribution without exposing the key", async () => {
  const production = { ...config, siteOrigin: "https://mxh.ankt.vn", production: true };
  const req = request("https://mxh.ankt.vn"); let called = false;
  assert.equal((await proxyAccountRequest(req, "auth/login", production, async () => { called = true; return Response.json({}); })).status, 503);
  assert.equal(called, false);
  const signed = request("https://mxh.ankt.vn"); signed.headers.set("X-ANKT-Client-IP", "203.0.113.7");
  const response = await proxyAccountRequest(signed, "auth/login", { ...production, bffSecret: "test-only-signing-material-not-a-production-secret" }, async (_, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-ANKT-Bff-IP"), "203.0.113.7");
    assert.equal(headers.get("X-ANKT-Bff-Signature")?.length, 64);
    assert.ok(!JSON.stringify([...headers]).includes("test-only-signing-material"));
    return Response.json({});
  });
  assert.equal(response.status, 200);
});

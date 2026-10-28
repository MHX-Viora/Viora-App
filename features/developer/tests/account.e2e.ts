import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { decodeSmtpMessage } from "./smtp-message";
import { runMiniAppE2E } from './mini-app.e2e';
import { runDomainVerificationE2E } from './domain-verification.e2e';

// Uses real MailKit SMTP, real Developer services/database and the real integrated FE BFF.
// Start tools/DeveloperE2EHost and the portal with DEVELOPER_SITE_ORIGIN=http://localhost:8081.
const origin = process.env.DEVELOPER_E2E_ORIGIN || "http://localhost:8081";
const password = "Real developer E2E password 2026!";
const nextPassword = "Changed developer E2E password 2026!";

test("real registration → SMTP verification → login → settings → change password → logout → login → reset", async () => {
  const mails: { recipient: string; text: string }[] = [];
  const sockets = new Set<net.Socket>();
  const server = net.createServer(socket => {
    sockets.add(socket); socket.on("close", () => sockets.delete(socket)); socket.setEncoding("utf8");
    let buffer = "", data = false, recipient = "", message = "";
    socket.write("220 ankt-e2e.local ESMTP\r\n");
    socket.on("data", chunk => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const index = buffer.indexOf("\r\n"), line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        if (data) {
          if (line === ".") {
            const text = decodeSmtpMessage(message);
            mails.push({ recipient, text }); data = false; message = ""; socket.write("250 message accepted\r\n");
          } else message += `${line.replace(/^\.\./, ".")}\r\n`;
        } else if (/^EHLO|^HELO/i.test(line)) socket.write("250-ankt-e2e.local\r\n250 8BITMIME\r\n");
        else if (/^RCPT TO:/i.test(line)) { recipient = line.slice(line.indexOf(":") + 1).replace(/[<>]/g, "").trim().toLowerCase(); socket.write("250 recipient ok\r\n"); }
        else if (/^DATA$/i.test(line)) { data = true; socket.write("354 end with dot\r\n"); }
        else if (/^QUIT$/i.test(line)) { socket.end("221 bye\r\n"); }
        else socket.write("250 ok\r\n");
      }
    });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(2526, "127.0.0.1", resolve); });
  let cookie = "";
  async function api(path: string, method = "GET", body?: unknown, sendOrigin = origin) {
    const response = await fetch(`${origin}/developers/api/account/${path}`, {
      method, redirect: "manual", headers: { Origin: sendOrigin, "Content-Type": "application/json", "X-ANKT-Developer": "1", ...(cookie ? { Cookie: cookie } : {}) },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
    for (const value of response.headers.getSetCookie()) {
      assert.match(value, /HttpOnly/i); assert.match(value, /SameSite=lax/i); assert.match(value, /Path=\/developers/i);
      assert.ok(!/Domain=/i.test(value));
      cookie = value.includes("Max-Age=0") ? "" : value.split(";")[0];
    }
    return response;
  }
  function emailToken(recipient: string) {
    const message = mails.findLast(mail => mail.recipient === recipient);
    assert.ok(message, "real SMTP message was received");
    const token = message.text.match(/#token=([A-Za-z0-9_-]{43})/)?.[1];
    assert.ok(token, "email link carries a fragment token"); return token;
  }
  const email = `e2e-${Date.now()}@example.test`;
  try {
    assert.equal((await api("auth/me")).status, 401);
    const crossOrigin = await api("auth/login", "POST", {}, "https://evil.example");
    // Metro's outer development CORS guard may reject before our 403 boundary.
    if (crossOrigin.status === 500) assert.match(await crossOrigin.text(), /Unauthorized request from https:\/\/evil\.example/);
    else assert.equal(crossOrigin.status, 403);
    const register = { fullName: "E2E Developer", email, password, confirmPassword: password, acceptTerms: true };
    assert.equal((await api("auth/register", "POST", register)).status, 202);
    assert.equal((await api("auth/register", "POST", register)).status, 202);
    assert.equal((await api("auth/login", "POST", { email, password })).status, 401);
    const verification = emailToken(email);
    assert.equal((await api("auth/verify-email", "POST", { token: verification })).status, 200);
    assert.equal((await api("auth/verify-email", "POST", { token: verification })).status, 400);
    const login = await api("auth/login", "POST", { email, password, rememberMe: true });
    assert.equal(login.status, 200);
    const account = await login.json(); assert.equal(account.email, email); assert.equal(account.sessionToken, undefined); assert.equal(account.passwordHash, undefined); assert.ok(cookie);
    assert.equal((await api("auth/me")).status, 200);
    assert.equal((await api("auth/refresh", "POST")).status, 200);
    const consolePage = await fetch(`${origin}/developers/console`, { headers: { Cookie: cookie } });
    assert.equal(consolePage.status, 200); // Expo serves the SPA shell; real Console rendering is checked in Chrome.
    assert.equal((await api("profile", "PATCH", { fullName: "E2E Updated", avatarUrl: null })).status, 200);
    assert.equal((await (await api("profile")).json()).fullName, "E2E Updated");
    assert.ok(Array.isArray(await (await api("sessions")).json()));
    assert.deepEqual(await (await api("linked-accounts")).json(), []);
    const appId=await runMiniAppE2E(api, origin, () => cookie);
    if(process.env.DEVELOPER_DOMAIN_E2E==='1')await runDomainVerificationE2E(api,appId);
    assert.equal((await api("auth/change-password", "POST", { currentPassword: password, password: nextPassword, confirmPassword: nextPassword })).status, 200);
    assert.equal((await api("auth/me")).status, 401);
    assert.equal((await api("auth/login", "POST", { email, password: nextPassword })).status, 200);
    assert.equal((await api("auth/logout", "POST")).status, 204); assert.equal(cookie, "");
    assert.equal((await api("auth/login", "POST", { email, password: nextPassword })).status, 200);
    assert.equal((await api("auth/forgot-password", "POST", { email })).status, 202);
    const reset = emailToken(email);
    assert.notEqual(reset, verification);
    assert.equal((await api("auth/reset-password", "POST", { token: reset, password, confirmPassword: password })).status, 200);
    assert.equal((await api("auth/me")).status, 401);
    assert.equal((await api("auth/reset-password", "POST", { token: reset, password, confirmPassword: password })).status, 400);
    assert.equal((await api("auth/login", "POST", { email, password })).status, 200);
    assert.equal((await api("auth/logout-all", "POST")).status, 204);
    console.log(`Verified real E2E account for optional browser checks: ${email}`);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

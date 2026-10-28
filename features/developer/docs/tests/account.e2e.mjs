// Actual Developer services, local-only SMTP, disposable SQLite, existing BFF,
// exported Expo login/Console and static docs. No production identity or database.
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { Buffer } from 'node:buffer';
import { startDocsServer } from './static-server.cjs';
import { openDocsBrowser } from './browser-fixture.mjs';
const require = createRequire(import.meta.url), { createDeveloperHandler } = require('../../../../server/developer/handler.cjs');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const sockets = new Set(), messages = [];
const smtp = net.createServer(socket => {
  sockets.add(socket); socket.on('close', () => sockets.delete(socket)); socket.setEncoding('utf8');
  let buffer = '', message = '', recipient = '', data = false;
  socket.write('220 ankt-stage9.local ESMTP\r\n');
  socket.on('data', chunk => {
    buffer += chunk;
    while (buffer.includes('\r\n')) {
      const index = buffer.indexOf('\r\n'), line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
      if (data) {
        if (line === '.') { messages.push({ recipient, message }); data = false; message = ''; socket.write('250 accepted\r\n'); }
        else message += line.replace(/^\.\./, '.') + '\r\n';
      } else if (/^EHLO|^HELO/i.test(line)) socket.write('250-ankt-stage9.local\r\n250 8BITMIME\r\n');
      else if (/^RCPT TO:/i.test(line)) { recipient = line.slice(line.indexOf(':') + 1).replace(/[<>]/g, '').trim().toLowerCase(); socket.write('250 ok\r\n'); }
      else if (/^DATA$/i.test(line)) { data = true; socket.write('354 continue\r\n'); }
      else if (/^QUIT$/i.test(line)) socket.end('221 bye\r\n');
      else socket.write('250 ok\r\n');
    }
  });
});
await new Promise((resolve, reject) => { smtp.once('error', reject); smtp.listen(0, '127.0.0.1', resolve); });
const reservation = net.createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const apiPort = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
let config, browser, backend, phase = 'startup', backendLog = '';
const server = await startDocsServer({ output: resolve('.codex-tmp/stage9-docs-export'), apiHandler: createDeveloperHandler(() => config) });
const apiOrigin = `http://127.0.0.1:${apiPort}`, stopKey = randomBytes(32).toString('base64url');
config = { siteOrigin: server.origin, apiOrigin, production: false };
try {
  const dotnet = resolve('../viora-BE/.codex-tmp/sdk8-check/sdk/dotnet.exe');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('ANKT_E2E_')));
  backend = spawn(dotnet, [resolve('../viora-BE/tools/DeveloperE2EHost/bin/Release/net8.0/DeveloperE2EHost.dll')], {
    cwd: resolve('../viora-BE'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...env, DOTNET_ROOT: dirname(dotnet),
      ANKT_E2E_HOST_PORT: String(apiPort), ANKT_E2E_STOP_KEY: stopKey,
      ANKT_E2E_DeveloperAuth__PortalUrl: server.origin + '/developers', ANKT_E2E_DeveloperAuth__SmtpPort: String(smtp.address().port) },
  });
  backend.stdout.on('data', value => { backendLog = (backendLog + value).slice(-8000); });
  backend.stderr.on('data', value => { backendLog = (backendLog + value).slice(-8000); });
  backend.on('error', error => { backendLog = error.message; });
  const deadline = Date.now() + 20000; let started = false;
  while (Date.now() < deadline) { try { if ((await fetch(apiOrigin + '/api/developer/health')).ok) { started = true; break; } } catch {} await pause(100); }
  assert.ok(started, 'Isolated account fixture did not start');
  const api = (path, body) => fetch(server.origin + '/developers/api/account/' + path, { method: 'POST', headers: { Origin: server.origin, 'X-ANKT-Developer': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  phase = 'real register and SMTP verification';
  const email = `docs-${Date.now()}@example.test`, password = 'Stage9 fixture password only 2026!';
  assert.equal((await api('auth/register', { fullName: 'Docs E2E Developer', email, password, confirmPassword: password, acceptTerms: true })).status, 202);
  const receipt = messages.findLast(message => message.recipient === email); assert.ok(receipt, 'No actual fixture SMTP message');
  const [headers, ...body] = receipt.message.split('\r\n\r\n');
  let text = body.join('\r\n\r\n');
  if (/Content-Transfer-Encoding: base64/i.test(headers)) text = Buffer.from(text, 'base64').toString('utf8');
  else if (/Content-Transfer-Encoding: quoted-printable/i.test(headers)) text = text.replace(/=\r\n/g, '').replace(/=([A-F0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const verification = text.match(/#token=([A-Za-z0-9_-]{43})/)?.[1]; assert.ok(verification, 'Missing real verification link');
  assert.equal((await api('auth/verify-email', { token: verification })).status, 200);
  phase = 'real browser password login';
  browser = await openDocsBrowser();
  await browser.rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await browser.rpc('Page.navigate', { url: server.origin + '/developers/login' });
  await browser.wait('!!document.querySelector("#email")');
  await browser.click('#email'); await browser.rpc('Input.insertText', { text: email });
  await browser.click('#password'); await browser.rpc('Input.insertText', { text: password });
  await browser.click('button.form-submit');
  await browser.wait('location.pathname==="/developers/console"&&!!document.querySelector(".console-layout")');
  phase = 'Console -> static Docs -> Console -> Docs';
  await browser.click('.developer-public-header nav a[href="/developers/docs"]');
  await browser.wait('location.pathname==="/developers/docs"&&!!document.querySelector(".docs-console-link")');
  assert.equal(await browser.read('document.querySelector("h1").textContent'), 'ANKT Developer Documentation');
  assert.equal(await browser.read('!!document.querySelector(".docs-avatar")'), true);
  await browser.click('.docs-console-link'); await browser.wait('location.pathname==="/developers/console"&&!!document.querySelector(".console-layout")');
  await browser.click('.developer-public-header nav a[href="/developers/docs"]'); await browser.wait('!!document.querySelector(".docs-console-link")');
  const unexpected = browser.issues.filter(issue => !issue.includes('props.pointerEvents is deprecated') && !issue.includes('apple-mobile-web-app-capable'));
  assert.deepEqual(unexpected, []);
  assert.deepEqual(browser.networkIssues.filter(issue => !(issue.status === 401 && new URL(issue.url).pathname === '/developers/api/account/auth/me')), []);
  console.log('PASS: actual registration + local SMTP verification, browser Developer login, exported Console -> static Docs -> Console -> Docs; account decoration and HttpOnly BFF flow. Existing RN Web pointerEvents and Expo apple-mobile-web-app-capable warnings excluded explicitly. No mocked account or injected auth cookie.');
} catch (error) { console.error(phase + ': ' + error.message); if (phase === 'startup') console.error(backendLog); process.exitCode = 1; }
finally {
  await browser?.close();
  if (backend?.exitCode === null) {
    await fetch(apiOrigin + '/_fixture/stop', { method: 'POST', headers: { 'X-Fixture-Key': stopKey } }).catch(() => {});
    await Promise.race([once(backend, 'exit'), pause(5000)]);
    if (backend.exitCode === null) { backend.kill(); console.error('Fixture graceful cleanup timed out; process terminated, retain owned SQLite directory for inspection.'); process.exitCode = 1; }
  }
  await server.close(); for (const socket of sockets) socket.destroy(); await new Promise(resolve => smtp.close(resolve));
}

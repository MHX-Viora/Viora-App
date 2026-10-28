// Chrome UI integration fixture only. Does not authenticate or accept real review/SSO business flows.
// Requires serve-review-ui.cjs on localhost:5489; uses an isolated temporary browser profile.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve, join, dirname, basename } = require('node:path');
const { once } = require('node:events');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const chrome = process.env.STAGE7_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'ankt-stage7-ui-'));
let port = 0;
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-extensions', '--disable-component-update', '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let ws, requestId = 0, runtimeIssues = 0, phase = 'startup'; const pending = new Map();
function rpc(method, params = {}) { return new Promise((resolve, reject) => {
  const id = ++requestId; const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 12000);
  pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(new Error(method + ': ' + error.message)); } });
  ws.send(JSON.stringify({ id, method, params }));
}); }
async function read(expression) { const value = await rpc('Runtime.evaluate', { expression, returnByValue: true });
  if (value.exceptionDetails) throw new Error('UI inspection failed'); return value.result?.value; }
async function wait(expression, label) { const end = Date.now() + 12000;
  while (Date.now() < end) { try { if (await read(expression)) return; } catch (e) { if (!/context|active page|navigat/i.test(e.message)) throw e; } await pause(40); } throw new Error('UI timeout: ' + label); }
const button = name => `[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(name)})`;
async function click(expression) {
  // Scroll/focus via the DOM protocol; Runtime expressions below only inspect test UI state.
  const node = await rpc('Runtime.evaluate', { expression }); assert.ok(node.result?.objectId, 'Interactive target missing');
  await rpc('DOM.scrollIntoViewIfNeeded', { objectId: node.result.objectId });
  const box = await read(`(()=>{const e=${expression};if(!e||e.disabled)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  assert.ok(box, 'Interactive target disabled');
  await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
  await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 });
}
async function key(key, code = key) { await rpc('Input.dispatchKeyEvent', { type: 'keyDown', key, code }); await rpc('Input.dispatchKeyEvent', { type: 'keyUp', key, code }); }
async function fill(selector, value) { await click(`document.querySelector(${JSON.stringify(selector)})`); await rpc('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2 });
  await rpc('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 }); await rpc('Input.insertText', { text: value }); }
async function go(hash = '') { const before = await read('window.__reviewFixture?.loadId'); const url = 'http://127.0.0.1:5489/?tab=review' + hash; await rpc('Page.navigate', { url });
  await wait(`location.href===${JSON.stringify(url)}&&document.readyState==='complete'&&!!window.__reviewFixture`, 'navigation committed');
  if (await read('window.__reviewFixture.loadId') === before) await rpc('Page.reload', { ignoreCache: true });
  await wait(`document.readyState==='complete'&&window.__reviewFixture?.loadId&&window.__reviewFixture.loadId!==${JSON.stringify(before)}&&document.querySelector('#review-heading')&&!document.querySelector('.review-workspace[aria-busy=true]')`, 'review workspace loaded'); }
async function submit() { await click(button('Gửi phiên bản xét duyệt')); await wait('!!document.querySelector("dialog[open]")', 'submit confirmation'); await click(button('Xác nhận gửi xét duyệt')); }
async function main() {
  assert.ok(existsSync(chrome), 'Chrome executable unavailable');
  let target;
  // Discover only this newly created profile's ephemeral port; never attach to an existing browser.
  for (let n = 0; n < 50; n++) { try {
    assert.equal(browser.exitCode, null, 'Isolated Chrome exited');
    port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]); assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(p => p.type === 'page'); if (target) break;
  } catch {} await pause(100); }
  assert.ok(target, 'Isolated Chrome did not start'); ws = new WebSocket(target.webSocketDebuggerUrl); await once(ws, 'open');
  ws.addEventListener('message', event => { const value = JSON.parse(event.data); const callback = pending.get(value.id);
    if (callback) { pending.delete(value.id); value.error ? callback.reject(new Error(value.error.message)) : callback.resolve(value.result); }
    if (value.method === 'Runtime.exceptionThrown' || value.method === 'Runtime.consoleAPICalled' && ['warning', 'error'].includes(value.params.type)) runtimeIssues++;
  });
  await rpc('Page.enable'); await rpc('Runtime.enable'); await rpc('DOM.enable');
  await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  phase = 'submit'; await go(); await wait('!!' + button('Phát hành phiên bản #1'), 'publication readiness loaded'); assert.equal(await read(`${button('Phát hành phiên bản #1')}.disabled`), true);
  await submit(); await wait('window.__reviewFixture.submitCalls===1&&!document.querySelector("dialog[open]")&&document.body.textContent.includes("Đã gửi đúng phiên bản")', 'submit complete');
  assert.equal(await read('window.__reviewFixture.submitCalls'), 1);
  await click(button('Mở inbox mẫu')); await wait('!!' + button('Đánh dấu đã đọc'), 'inbox receipt'); await click(button('Đánh dấu đã đọc'));
  await wait('window.__reviewFixture.markCalls===1&&document.querySelector("[role=status]")?.textContent.includes("0 thông báo")', 'read receipt');
  await click('document.querySelector(".review-history-list a")'); await wait('!!document.querySelector(".review-decision")', 'inbox exact review link');
  phase = 'retry'; await go('#retry'); await submit(); await wait('!!' + button('Thử lại cùng yêu cầu'), 'ambiguous submit reply');
  await click(button('Thử lại cùng yêu cầu')); await wait('window.__reviewFixture.submitCalls===2&&document.body.textContent.includes("Đã gửi đúng phiên bản")', 'idempotent submit replay');
  assert.equal(await read('new Set(window.__reviewFixture.submitRequestIds).size'), 1);
  phase = 'publish'; await go('#approved'); await wait(`!!${button('Phát hành phiên bản #1')}&&!${button('Phát hành phiên bản #1')}.disabled`, 'approved publication capability');
  await click(button('Phát hành phiên bản #1')); await click(button('Xác nhận')); await wait('window.__reviewFixture.publishCalls===1&&!!' + button('Ngừng phát hành phiên bản #1'), 'publication applied');
  await wait('document.querySelector(".mini-status")?.textContent==="Đang phát hành"', 'header reflects current publication');
  await click(button('Ngừng phát hành phiên bản #1')); await click(button('Xác nhận')); await wait('window.__reviewFixture.unpublishCalls===1&&document.body.textContent.includes("Đã ghi nhận ngừng phát hành")&&document.querySelector(".mini-status")?.textContent==="Bản nháp"', 'unpublish complete');
  phase = 'changes'; await go('#changes'); await click(button('Xem kết quả phiên bản #1')); await wait('!!document.querySelector(".review-reason")', 'changes reason');
  assert.equal(await read('document.querySelector(".review-reason").querySelectorAll("script,img").length'), 0);
  await click('[...document.querySelectorAll(".review-decision button")].find(x=>x.textContent==="Tạo bản nháp mới")'); assert.equal(await read('document.activeElement.id'), 'review-version-name');
  await fill('#review-version-name', '2.0'); await click(button('Tạo bản nháp mới')); await wait('document.body.textContent.includes("Đã tạo bản nháp")&&document.querySelector("#review-version")?.selectedOptions[0]?.textContent.includes("#2")', 'new draft after changes');
  for (const width of [320, 768, 1024, 1440]) {
    await rpc('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await wait(`innerWidth===${width}`, 'viewport'); assert.equal(await read('document.documentElement.scrollWidth<=innerWidth+1'), true, 'Horizontal overflow at ' + width);
    if (width === 320 || width === 1440) { const shot = await rpc('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(resolve(__dirname, '../../../.codex-tmp/stage7-review-' + width + '.png'), Buffer.from(shot.data, 'base64')); }
  }
  assert.equal(runtimeIssues, 0, 'Browser console errors/warnings');
  console.log('PASS: submit, exact retry, inbox/read/deep-link, approved publish/unpublish, changes/new-draft, 4 responsive widths; zero runtime warnings/errors. UI fixture only.');
}
main().catch(error => { console.error(phase + ': ' + error.message); process.exitCode = 1; }).finally(async () => {
  if (ws?.readyState === WebSocket.OPEN) { await rpc('Browser.close').catch(() => {}); ws.close(); }
  if (browser.exitCode === null) { await Promise.race([once(browser, 'exit'), pause(2000)]); if (browser.exitCode === null) browser.kill(); }
  // Delete only this script's new, verified temporary profile, never an existing browser profile.
  if (dirname(resolve(profile)) !== resolve(tmpdir()) || !basename(profile).startsWith('ankt-stage7-ui-')) throw new Error('Unsafe temporary profile path');
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

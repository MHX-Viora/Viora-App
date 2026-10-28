import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { once } from 'node:events';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function openDocsBrowser() {
  const profile = await mkdtemp(join(tmpdir(), 'ankt-stage9-docs-'));
  const browser = spawn(process.env.STAGE9_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--disable-extensions', '--disable-component-update', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' });
  let socket, sequence = 0;
  const pending = new Map(), issues = [], networkIssues = [], requestUrls = new Map();
  browser.on('error', error => issues.push(error.message));
  async function close() {
    if (socket?.readyState === WebSocket.OPEN) { await rpc('Browser.close').catch(() => {}); socket.close(); }
    if (browser.exitCode === null) {
      await Promise.race([once(browser, 'exit'), pause(1500)]);
      if (browser.exitCode === null) { browser.kill(); await Promise.race([once(browser, 'exit'), pause(1500)]); }
    }
    // Only the newly created owned profile can be recursively removed.
    const actual = await realpath(profile), parent = await realpath(tmpdir());
    assert.equal(dirname(actual).toLowerCase(), parent.toLowerCase());
    assert.ok(basename(actual).startsWith('ankt-stage9-docs-'));
    await rm(actual, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  function rpc(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence, timeout = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 10000);
      pending.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  try {
    let target;
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        const port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]);
        if (Number.isInteger(port) && port > 0 && port <= 65535)
          target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(page => page.type === 'page');
        if (target) break;
      } catch {} await pause(100);
    }
    assert.ok(target, 'Owned Chrome did not start');
    socket = new WebSocket(target.webSocketDebuggerUrl); await once(socket, 'open');
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) { const task = pending.get(message.id); pending.delete(message.id); if (task) { if (message.error) task.reject(Error(message.error.message)); else task.resolve(message.result); } }
      if (message.method === 'Runtime.exceptionThrown') issues.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description || ''));
      if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) issues.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
      if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params.entry.level) && message.params.entry.source !== 'network') issues.push(message.params.entry.text);
      if (message.method === 'Network.requestWillBeSent') requestUrls.set(message.params.requestId, message.params.request.url);
      if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) networkIssues.push({ url: message.params.response.url, status: message.params.response.status });
      if (message.method === 'Network.loadingFailed' && !message.params.canceled) networkIssues.push({ url: requestUrls.get(message.params.requestId), error: message.params.errorText });
    });
    await rpc('Page.enable'); await rpc('Runtime.enable'); await rpc('Accessibility.enable'); await rpc('Network.enable'); await rpc('Log.enable');
    async function read(expression) {
      const result = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      assert.ok(!result.exceptionDetails, 'Browser evaluation failed'); return result.result?.value;
    }
    async function wait(expression) {
      const until = Date.now() + 10000;
      while (Date.now() < until) { if (await read(expression)) return; await pause(50); }
      throw Error('Browser condition timed out: ' + expression);
    }
    async function click(selector) {
      const box = await read(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e)return null; const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      assert.ok(box, 'Missing click target: ' + selector);
      await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
      await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 });
    }
    async function key(key, modifiers = 0) {
      const code = /^[a-z]$/.test(key) ? 'Key' + key.toUpperCase() : key;
      const keyCode = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38 }[key] ?? (/^[a-z]$/.test(key) ? key.toUpperCase().charCodeAt(0) : undefined);
      await rpc('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: keyCode, ...(key === 'Enter' ? { text: '\r' } : {}) });
      await rpc('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: keyCode });
    }
    return { rpc, read, wait, issues, networkIssues, close, click, key };
  } catch (error) { await close(); throw error; }
}

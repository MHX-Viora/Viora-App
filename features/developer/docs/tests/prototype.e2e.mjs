import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Buffer } from 'node:buffer';
import { startDocsServer } from './static-server.cjs';
import { openDocsBrowser } from './browser-fixture.mjs';
const server = await startDocsServer({ output: resolve('.codex-tmp/stage9-docs-export') });
let browser;
try {
  const response = await fetch(server.origin + '/developers/docs/introduction');
  assert.equal(response.status, 200); assert.match(await response.text(), /Không bắt buộc tích hợp SSO/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal((await fetch(server.origin + '/developers/docs/not-found')).status, 404);
  browser = await openDocsBrowser();
  await browser.rpc('Page.navigate', { url: server.origin + '/developers/docs/introduction' });
  await browser.wait('!!document.querySelector("h1")');
  for (const width of [320, 375, 768, 1440]) {
    await browser.rpc('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await browser.wait(`innerWidth===${width}`);
    assert.ok(await browser.read('document.documentElement.scrollWidth<=innerWidth+1'), 'Overflow at ' + width);
    if ([320, 1440].includes(width)) {
      const shot = await browser.rpc('Page.captureScreenshot', { format: 'png' });
      await writeFile(resolve(`.codex-tmp/stage9-prototype-${width}.png`), Buffer.from(shot.data, 'base64'));
    }
  }
  const tree = await browser.rpc('Accessibility.getFullAXTree');
  assert.ok(tree.nodes.some(node => node.role?.value === 'main'));
  assert.ok(tree.nodes.some(node => node.role?.value === 'heading' && node.name?.value === 'Mini App ANKT'));
  await browser.rpc('Page.reload'); await browser.wait('!!document.querySelector("h1")');
  assert.deepEqual(browser.issues, []);
  console.log('PASS: full raw HTML, restrictive CSP, hydration, refresh, 404, accessibility landmarks and 320/375/768/1440 widths. Prototype only; no account/business acceptance.');
} finally { await browser?.close(); await server.close(); }

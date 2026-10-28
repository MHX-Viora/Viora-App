import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { openDocsBrowser } from './browser-fixture.mjs';

// Exercise the actual Expo shell: standalone docs do not have its locked body.
const origin = process.env.DOCS_EXPO_ORIGIN || 'http://localhost:8081';
const { routes } = JSON.parse(await readFile('.codex-tmp/stage9-docs-export/docs-manifest.json', 'utf8'));
const browser = await openDocsBrowser();
let route;
try {
  await browser.rpc('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  for (const width of [1440, 375]) {
    await browser.rpc('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (route of routes) {
      await browser.rpc('Page.navigate', { url: origin + route });
      await browser.wait('document.querySelector(".ankt-docs")?.dataset.hydrated === "true"');
      const before = await browser.read('document.querySelector(".docs-main").getBoundingClientRect().top');
      await browser.rpc('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(width / 2), y: 700, deltaX: 0, deltaY: 700 });
      await browser.wait(`document.querySelector('.docs-main').getBoundingClientRect().top < ${before - 100}`);
      const view = await browser.read(`(() => {
        const root = document.querySelector('.ankt-docs');
        const header = document.querySelector('.developer-public-header').getBoundingClientRect();
        return { background: getComputedStyle(root).backgroundColor, bottom: root.getBoundingClientRect().bottom,
          headerTop: header.top, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      })()`);
      assert.equal(view.background, 'rgb(255, 255, 255)', route);
      assert.ok(view.bottom >= 899, 'White background must cover scrolled content: ' + route);
      assert.ok(Math.abs(view.headerTop) <= 1, 'Header must remain visible: ' + route);
      assert.equal(view.overflow, false, route);
      const contentHeight = await browser.read('document.querySelector(".developer-docs-screen").scrollHeight');
      await browser.rpc('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(width / 2), y: 700, deltaX: 0, deltaY: contentHeight });
      await browser.wait('document.querySelector(".developer-public-footer").getBoundingClientRect().bottom <= innerHeight + 1');
      if (width === 1440) {
        await browser.wait(`document.querySelector('.docs-toc a:last-child')?.getAttribute('aria-current') === 'location'`);
      }
      if (route.endsWith('/sdk')) {
        const screenshot = await browser.rpc('Page.captureScreenshot', { format: 'png' });
        await writeFile(`.codex-tmp/docs-expo-sdk-bottom-${width}.png`, Buffer.from(screenshot.data, 'base64'));
      }
    }
  }
  console.log('PASS: all 20 Expo docs pages scroll to the footer with mouse wheel, retain white background and sticky header under dark OS preference at desktop/mobile widths; desktop TOC tracks scrolling.');
} catch (error) {
  console.error(route + ': ' + error.message);
  console.error(JSON.stringify(await browser.read(`(() => { const e=document.querySelector('.developer-docs-screen'); return {width:innerWidth, top:e?.scrollTop, height:e?.clientHeight, content:e?.scrollHeight, footer:document.querySelector('.developer-public-footer')?.getBoundingClientRect().bottom}; })()`)));
  console.error(JSON.stringify({ issues: browser.issues, networkIssues: browser.networkIssues }));
  process.exitCode = 1;
} finally { await browser.close(); }

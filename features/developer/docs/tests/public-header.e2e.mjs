import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { openDocsBrowser } from './browser-fixture.mjs';

const origin = process.env.DOCS_EXPO_ORIGIN || 'http://localhost:8081';
const manifest = JSON.parse(await readFile('.codex-tmp/stage9-docs-export/docs-manifest.json', 'utf8'));
const routes = ['/developers', ...['login', 'register', 'forgot-password', 'verify-email', 'reset-password', 'contact', 'policies', 'missing'].map(path => '/developers/' + path), ...manifest.routes, '/developers/docs/missing'];
const browser = await openDocsBrowser();
let route;
try {
  for (const width of [1440, 375]) {
    await browser.rpc('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    let expected;
    for (route of routes) {
      await browser.rpc('Page.navigate', { url: origin + route });
      await browser.wait(`!!document.querySelector('.site-header') && !!document.querySelector('.header-actions a[href="/developers/register"]')`);
      assert.equal(await browser.read('document.querySelectorAll(".developer-public-header").length'), 1, route);
      const signature = await browser.read(`(() => {
        const h=document.querySelector('.developer-public-header');
        const style=e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor,s.fontSize,s.fontFamily,s.borderBottomColor,e.getBoundingClientRect().height]};
        const f=document.querySelector('.developer-public-footer');
        return { header:style(h), brand:style(h.querySelector('.brand')), links:[...h.querySelectorAll('nav a')].map(a=>[a.textContent,a.getAttribute('href')]), actions:[...h.querySelectorAll('.header-actions a')].map(a=>[a.textContent,a.getAttribute('href')]), footer:style(f), footerBrand:style(f.querySelector('.footer-brand')), footerLinks:[...f.querySelectorAll('nav a')].map(a=>[a.textContent,a.getAttribute('href')]) };
      })()`);
      expected ??= signature;
      assert.deepEqual(signature, expected, 'Header/footer differs from homepage: ' + route);
      if (width === 375) {
        await browser.click('.landing-menu-toggle');
        await browser.wait('document.querySelector(".landing-menu-toggle").getAttribute("aria-expanded")==="true"');
        assert.equal(await browser.read('getComputedStyle(document.querySelector(".landing-navigation")).display'), 'flex', route);
        await browser.key('Escape');
        await browser.wait('document.querySelector(".landing-menu-toggle").getAttribute("aria-expanded")==="false"');
      }
    }
  }
  console.log(`PASS: identical Developer header and footer on ${routes.length} public routes at desktop/mobile widths, including mobile menu and error pages.`);
} catch (error) {
  console.error(route + ': ' + error.message); process.exitCode = 1;
} finally { await browser.close(); }

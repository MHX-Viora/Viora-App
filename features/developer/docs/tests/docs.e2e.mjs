import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { startDocsServer } from './static-server.cjs';
import { openDocsBrowser } from './browser-fixture.mjs';
const output = resolve('.codex-tmp/stage9-docs-export');
function contrastRatio(foreground, background) {
  const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(value => Number(value) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const server = await startDocsServer({ output });
let browser, phase = 'static artifacts';
try {
  const manifest = JSON.parse(await readFile(resolve(output, 'docs-manifest.json'), 'utf8'));
  assert.equal(manifest.routes.length, 17);
  for (const route of manifest.routes) {
    const response = await fetch(server.origin + route), html = await response.text();
    assert.equal(response.status, 200, route); assert.match(html, /<h1/); assert.match(html, /rel="canonical"/);
    for (const link of html.matchAll(/href="(\/developers\/docs(?:\/[a-z0-9-]+)?)(?:#[^"]*)?"/g)) assert.ok(manifest.routes.includes(link[1]), link[1]);
  }
  assert.equal((await fetch(server.origin + '/developers/docs/missing')).status, 404);
  assert.equal((await fetch(server.origin + '/developers/docs/domain-verification/', { redirect: 'manual' })).status, 308);
  const sitemap = await (await fetch(server.origin + '/developer-sitemap.xml')).text();
  assert.match(sitemap, /developers\/docs\/sdk/); assert.doesNotMatch(sitemap, /developers\/console|developers\/api/);
  const robots = await (await fetch(server.origin + '/robots.txt')).text(); assert.match(robots, /Disallow: \/developers\/api\//);
  browser = await openDocsBrowser();
  const go = async slug => { await browser.rpc('Page.navigate', { url: server.origin + '/developers/docs' + (slug ? '/' + slug : '') }); await browser.wait('document.querySelector(".ankt-docs")?.dataset.hydrated==="true"'); };
  phase = 'JS-disabled content';
  await browser.rpc('Emulation.setScriptExecutionDisabled', { value: true });
  await browser.rpc('Page.navigate', { url: server.origin + '/developers/docs/domain-verification' });
  await browser.wait('document.querySelector("h1")?.textContent==="Xác minh tên miền"');
  await browser.rpc('Emulation.setScriptExecutionDisabled', { value: false });
  phase = 'search and keyboard'; await go('');
  await browser.rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await browser.key('k', 2); await browser.wait('document.querySelector(".docs-search-dialog")?.open');
  await browser.rpc('Input.insertText', { text: 'xac minh ten mien' });
  await browser.wait('document.querySelectorAll("#docs-search-results li").length>0');
  await browser.key('ArrowDown');
  assert.ok(await browser.read('document.activeElement?.closest("#docs-search-results")!==null'));
  await browser.key('Escape'); await browser.wait('!document.querySelector(".docs-search-dialog")?.open');
  await browser.wait('document.activeElement?.className==="docs-search-trigger"');
  assert.equal(await browser.read('document.activeElement?.className'), 'docs-search-trigger');
  await browser.click('.docs-search-trigger'); await browser.wait('document.querySelector(".docs-search-dialog").open');
  await browser.key('a', 2); await browser.rpc('Input.insertText', { text: '<script>no-result</script>' });
  await browser.wait('document.querySelector(".docs-search-status")?.textContent.includes("Không tìm thấy")');
  assert.equal(await browser.read('document.querySelectorAll(".docs-search-dialog script").length'), 0);
  await browser.key('a', 2); await browser.rpc('Input.insertText', { text: 'xac minh ten mien' });
  await browser.wait(`!!document.querySelector(${JSON.stringify('#docs-search-results a[href^="/developers/docs/domain-verification"]')})`);
  await browser.click('#docs-search-results a[href^="/developers/docs/domain-verification"]');
  await browser.wait('location.pathname==="/developers/docs/domain-verification"&&document.querySelector(".ankt-docs")?.dataset.hydrated==="true"');
  phase = 'Quick Start and domain';
  await browser.click('.docs-sidebar a[href="/developers/docs/getting-started"]');
  await browser.wait('location.pathname==="/developers/docs/getting-started"');
  await browser.wait('document.querySelector(".ankt-docs")?.dataset.hydrated==="true"');
  assert.equal(await browser.read('document.querySelectorAll("#steps ol > li").length'), 10);
  await go('sdk');
  phase = 'copy code';
  await browser.rpc('Browser.grantPermissions', { origin: server.origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  // The actual production integration example must remain copyable.
  await browser.click('.docs-toc a[href="#automatic-login"]');
  await browser.wait('location.hash==="#automatic-login"');
  const bounds = await browser.read('document.querySelector("#automatic-login .docs-code button").getBoundingClientRect().top');
  assert.ok(bounds >= 0 && bounds < 900);
  await browser.click('#automatic-login .docs-code button'); await browser.wait('document.querySelector("#automatic-login [role=status]")?.textContent.includes("Đã sao chép")');
  await browser.rpc('Browser.setPermission', { permission: { name: 'clipboard-write' }, setting: 'denied', origin: server.origin });
  await browser.click('#automatic-login .docs-code button'); await browser.wait('document.querySelector("#automatic-login [role=status]")?.textContent.includes("Không thể sao chép")');
  phase = 'shared navigation';
  assert.deepEqual(await browser.read(`[...document.querySelectorAll('.developer-public-header nav a')].map(a=>a.textContent)`), ['Tài liệu', 'SDK', 'Hướng dẫn', 'Cộng đồng']);
  await browser.click('.developer-public-header a[href="/developers/docs/sdk"]');
  await browser.wait('location.pathname==="/developers/docs/sdk"&&!!document.querySelector(".developer-public-header")');
  await browser.click('.developer-public-header a[href="/developers/docs/getting-started"]');
  await browser.wait('location.pathname==="/developers/docs/getting-started"&&!!document.querySelector(".developer-public-header")');
  phase = 'API reference, fixed palette and widths'; await go('api-reference');
  for (const theme of ['dark', 'light']) {
    await browser.rpc('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
    assert.equal(await browser.read('document.querySelector(".ankt-docs").dataset.theme'), 'light');
    assert.equal(await browser.read('!!document.querySelector(".docs-theme-toggle")'), false);
    const colorPairs = await browser.read(`(()=>{const pairs=new Map();for(const e of document.querySelectorAll('.docs-main p,.docs-main th,.docs-main td,.docs-main small,.docs-main a,.docs-main strong,.docs-main code span,.developer-public-header a,.developer-public-header button')){if(!e.getBoundingClientRect().height||!e.textContent.trim())continue;let ancestor=e,bg='rgba(0, 0, 0, 0)';while(ancestor&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(ancestor).backgroundColor;ancestor=ancestor.parentElement}const color=getComputedStyle(e).color;pairs.set(color+'|'+bg,{color,bg})}return [...pairs.values()]})()`);
    for (const pair of colorPairs) assert.ok(contrastRatio(pair.color, pair.bg) >= 4.5, `Text contrast below 4.5:1 in ${theme}: ${pair.color}/${pair.bg}`);
    for (const width of [320, 375, 768, 1440]) {
      await browser.rpc('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await browser.wait(`innerWidth===${width}`);
      assert.ok(await browser.read('document.documentElement.scrollWidth<=innerWidth+1'), `${theme} overflow ${width}`);
      if ([320, 1440].includes(width)) {
        const shot = await browser.rpc('Page.captureScreenshot', { format: 'png' });
        await writeFile(resolve(`.codex-tmp/stage9-docs-${theme}-${width}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
  }
  await browser.rpc('Page.reload'); await browser.wait('document.querySelector(".ankt-docs")?.dataset.hydrated==="true"');
  phase = 'mobile navigation and reduced motion';
  await browser.rpc('Emulation.setDeviceMetricsOverride', { width: 320, height: 900, deviceScaleFactor: 1, mobile: false });
  await browser.click('.landing-menu-toggle');
  await browser.wait('document.querySelector(".landing-menu-toggle").getAttribute("aria-expanded")==="true"');
  await browser.key('Tab'); await browser.key('Escape');
  await browser.wait('document.querySelector(".landing-menu-toggle").getAttribute("aria-expanded")==="false"');
  assert.equal(await browser.read('document.activeElement?.className'), 'landing-menu-toggle');
  await browser.click('.docs-menu-trigger'); await browser.wait('document.querySelector(".docs-navigation-dialog").open');
  await browser.key('Tab');
  assert.ok(await browser.read('!!document.activeElement?.closest(".docs-navigation-dialog")'));
  await browser.key('Escape'); await browser.wait('!document.querySelector(".docs-navigation-dialog").open');
  await browser.wait('document.activeElement?.className==="docs-menu-trigger"');
  assert.equal(await browser.read('document.activeElement?.className'), 'docs-menu-trigger');
  await browser.rpc('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await browser.rpc('Emulation.setEmulatedOSTextScale', { scale: 2 });
  assert.ok(await browser.read('document.documentElement.scrollWidth<=innerWidth+1'), '200% OS text scale overflow');
  await browser.rpc('Emulation.setEmulatedOSTextScale', { scale: 1 });
  const tree = await browser.rpc('Accessibility.getFullAXTree');
  assert.ok(tree.nodes.some(node => node.role?.value === 'main'));
  assert.ok(tree.nodes.some(node => node.role?.value === 'heading' && node.name?.value === 'API Reference'));
  assert.deepEqual(browser.issues, []);
  assert.deepEqual(browser.networkIssues.filter(issue => !(issue.status === 401 && new URL(issue.url).pathname === '/developers/api/account/auth/me')), []);
  const client = await readFile(resolve(output, 'developers/docs-assets/client.js'));
  assert.doesNotMatch(client.toString('utf8'), /\/api\/admin\/|\/internal\/sandbox-executor|\/api\/mini-app-host\/|BEGIN (?:RSA )?PRIVATE KEY|ANKT_BFF_SHARED_SECRET|sourceMappingURL=/);
  console.log(JSON.stringify({ status: 'PASS', pages: manifest.routes.length, coverage: 'Anonymous exported docs: shared navigation/mobile menu, fixed light palette, search keyboard/focus, production Quick Start and SDK copy/TOC, API reference, deep refresh, mobile dialog, reduced motion, 200% OS text scale, landmarks and raw SEO/404/sitemap.', clientBytes: client.length, clientGzipBytes: gzipSync(client).length, accountE2E: 'separate real-account fixture required' }));
} catch (error) { console.error(phase + ': ' + error.message); process.exitCode = 1; }
finally { await browser?.close(); await server.close(); }

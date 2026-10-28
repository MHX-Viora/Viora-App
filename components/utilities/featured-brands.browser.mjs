import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { openDocsBrowser } from '../../features/developer/docs/tests/browser-fixture.mjs';
import path from 'node:path';

const result = await build({ stdin: { contents: `
  import React from 'react';import {createRoot} from 'react-dom/client';
  import {FeaturedBrandsSection} from './components/utilities/featured-brands-section';
  createRoot(document.getElementById('root')).render(<div style={{padding:16,maxWidth:1040,margin:'auto'}}><FeaturedBrandsSection/></div>);
`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, jsx: 'automatic', write: false,
  outdir: path.resolve('.codex-tmp/featured-brands-browser'), alias: { 'react-native': 'react-native-web', '@': process.cwd() },
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'fixture-context', setup(b) {
    b.onResolve({ filter: /^(@\/theme|@expo\/vector-icons\/Ionicons|@react-navigation\/native|@\/services\/featured-brand.service)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: process.cwd(), contents:
      args.path === '@/theme' ? `export const spacing={xs:4,sm:8,md:12,lg:16};export const useTheme=()=>({theme:{colors:{card:'#fff',text:'#102030',textMuted:'#5a6a7a',borderSubtle:'#e1e7ee',primary:'#0759bb',primarySoft:'#edf5ff',secondaryBackground:'#edf1f5'}}});` :
      args.path === '@react-navigation/native' ? `import {useEffect} from 'react';export function useFocusEffect(callback){useEffect(callback,[callback])}` :
      args.path.startsWith('@/services') ? `export async function getFeaturedBrands(signal){const r=await fetch('/fixture-brands',{signal});if(!r.ok)throw Error('offline');return r.json()}` :
      `import React from 'react';export default ({size,color})=>React.createElement('svg',{width:size,height:size,'aria-hidden':true,viewBox:'0 0 24 24'},React.createElement('path',{fill:color,d:'m12 1 3.4 7 7.6 1-5.5 5.4 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6L1 9l7.6-1z'}));`,
    }));
  } }],
});
const bundle = result.outputFiles.find(file => file.path.endsWith('.js')).contents;
let failed = false, items = Array.from({ length: 4 }, (_, i) => ({ id: String(i), name: `Fixture brand ${i + 1}`, logoUrl: `/logo-${i}.svg`, sortOrder: i }));
const server = createServer((req, res) => {
  if (req.url === '/fixture-brands') { res.setHeader('Content-Type', 'application/json'); res.statusCode = failed ? 503 : 200; res.end(JSON.stringify(items)); return; }
  if (/^\/logo-\d.svg$/.test(req.url)) { res.setHeader('Content-Type', 'image/svg+xml'); res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect x="40" y="10" width="80" height="80" rx="20" fill="#087df2"/><text x="80" y="64" text-anchor="middle" font-family="sans-serif" font-size="40" fill="white">${Number(req.url[6]) + 1}</text></svg>`); return; }
  if (req.url === '/stdin.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle); return; }
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f3f6fa;font-family:Arial}</style><div id="root"></div><script src="/stdin.js"></script>'); return; }
  res.statusCode = 404; res.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await openDocsBrowser();
  const url = `http://127.0.0.1:${server.address().port}/`;
  await browser.rpc('Page.navigate', { url });
  await browser.wait('document.querySelectorAll("[data-testid=featured-brand-logo]").length===4');
  assert.equal(await browser.read('document.querySelector("[data-testid=featured-brands-section]").textContent.includes("Fixture brand")'), false, 'no visible captions');
  for (const width of [320, 375, 768, 1440]) {
    await browser.rpc('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    const fourColumns = width >= 768;
    await browser.wait(`(()=>{const tiles=[...document.querySelectorAll('[data-testid=featured-brand-logo]')].map(e=>e.getBoundingClientRect());return ${fourColumns ? 'Math.abs(tiles[2].y-tiles[0].y)<1' : 'tiles[2].y>tiles[0].y'}})()`);
    assert.equal(await browser.read('document.documentElement.scrollWidth>innerWidth'), false);
    assert.equal(await browser.read('Array.from(document.querySelector(\'[aria-label="Fixture brand 1"]\').querySelectorAll("div")).some(e=>getComputedStyle(e).backgroundSize==="contain")'), true);
    if ([375, 1440].includes(width)) { const shot = await browser.rpc('Page.captureScreenshot', { format: 'png' }); await writeFile(`.codex-tmp/featured-brands-${width}.png`, Buffer.from(shot.data, 'base64')); }
  }
  failed = true; await browser.rpc('Page.navigate', { url });
  await browser.wait('!!document.querySelector(\'[aria-label="Tải lại thương hiệu"]\')');
  failed = false; await browser.click('[aria-label="Tải lại thương hiệu"]');
  await browser.wait('document.querySelectorAll("[data-testid=featured-brand-logo]").length===4');
  items = []; await browser.rpc('Page.navigate', { url });
  await browser.wait('document.body.textContent.includes("Chưa có thương hiệu nổi bật")');
  items = [{ id: 'broken', name: 'Broken logo', logoUrl: '/missing.png', sortOrder: 0 }]; await browser.rpc('Page.navigate', { url });
  await browser.wait('document.querySelector("[data-testid=featured-brands-grid]") && !document.querySelector("[data-testid=brand-skeleton]") && !document.querySelector("[data-testid=featured-brand-logo]")');
  assert.deepEqual(browser.issues, []);
  console.log('PASS featured brands: logo-only cards, contain sizing, 2/4 columns, no overflow, empty, error/retry and broken-logo removal.');
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }

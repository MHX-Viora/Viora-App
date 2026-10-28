import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { openDocsBrowser } from '../../features/developer/docs/tests/browser-fixture.mjs';

// Real RN Web components with local balances/callbacks; no account or payment calls.
const root = process.cwd();
const result = await build({
  stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {WalletSummaryCard} from './components/wallet/wallet-summary-card';
    import {WalletPromotionRow} from './components/utilities/wallet-promotion-row';
    import firstImage from './assets/images/utilities-mini-app.webp';
    import secondImage from './assets/images/wallet-card-navy-gold.png';
    const wallet={availableBalance:5457000,anktCoinBalance:125};
    const act=name=>()=>{document.getElementById('result').textContent=name};
    function Fixture(){const [slides,setSlides]=React.useState([]);return <div style={{padding:16,maxWidth:1008,margin:'auto'}}>
      <button id="loadBanners" style={{position:'fixed',right:0,bottom:0,zIndex:10}} onClick={()=>setSlides([
        {id:'one',imageUrl:firstImage,targetUrl:'/wallet'},
        {id:'two',imageUrl:secondImage,targetUrl:'/wallet/deposit'}
      ])}>Load slideshow</button>
      <button id="loadBroken" style={{position:'fixed',right:0,bottom:30,zIndex:10}} onClick={()=>setSlides([{id:'broken',imageUrl:'/missing.png',targetUrl:null}])}>Broken image</button>
      <WalletPromotionRow banners={slides} onBannerOpen={target=>act(target)()} onExplore={act('explore')}><WalletSummaryCard wallet={wallet}
        onDeposit={act('deposit')} onWithdraw={act('withdraw')} onHistory={act('history')}/></WalletPromotionRow>
      <div style={{width:288,marginTop:24}}><WalletPromotionRow onExplore={act('narrow')}>
        <WalletSummaryCard wallet={null} error="unavailable" onRetry={act('retry')} onDeposit={()=>{}} onWithdraw={()=>{}} onHistory={()=>{}}/>
      </WalletPromotionRow></div><div id="result"/></div>}
    createRoot(document.getElementById('root')).render(<Fixture/>);
  `, resolveDir: root, loader: 'tsx' },
  bundle: true, jsx: 'automatic', write: false, outdir: path.join(root, '.codex-tmp/wallet-browser-assets'),
  assetNames: '[name]-[hash]', loader: { '.png': 'file', '.webp': 'file' },
  alias: { 'react-native': 'react-native-web', '@': root },
  define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true' },
  plugins: [{ name: 'fixture-context', setup(b) {
    b.onResolve({ filter: /^@\/theme$/ }, () => ({ path: 'theme', namespace: 'fixture' }));
    b.onResolve({ filter: /^@expo\/vector-icons\/Ionicons$/ }, () => ({ path: 'icons', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'theme'
      ? `export const spacing={xs:4,sm:8,md:12,lg:16,xl:24};export const typography={title:{},caption:{}};export const useTheme=()=>({theme:{colors:{}}});`
      : `import React from 'react';export default ({size=20,color})=>React.createElement('svg',{width:size,height:size,viewBox:'0 0 20 20','aria-hidden':true},React.createElement('circle',{cx:10,cy:10,r:7,fill:color}));`, resolveDir: root }));
  } }],
});
const files = new Map(result.outputFiles.map(file => ['/' + path.basename(file.path), file.contents]));
const server = createServer((req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}*{box-sizing:border-box}</style><div id="root"></div><script src="/stdin.js"></script>'); return; }
  const content = files.get(req.url);
  res.setHeader('Content-Type', req.url.endsWith('.js') ? 'text/javascript' : req.url.endsWith('.png') ? 'image/png' : 'image/webp');
  res.statusCode = content ? 200 : 404; res.end(content);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await openDocsBrowser();
  await browser.rpc('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  await browser.wait('document.querySelectorAll("[data-testid=wallet-summary-card]").length===2');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await browser.rpc('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await browser.wait(`getComputedStyle(document.querySelector('[data-testid=wallet-promotion-row]')).flexDirection==='${width >= 768 ? 'row' : 'column'}'`);
    const layout = await browser.read(`(() => {
      const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
      const cards=[...document.querySelectorAll('[data-testid=wallet-summary-card]')];
      const banners=[...document.querySelectorAll('[data-testid=utilities-promotion]')];
      return {cards:cards.map(rect),banners:banners.map(rect),rows:[...document.querySelectorAll('[data-testid=wallet-promotion-row]')].map(rect),overflow:document.documentElement.scrollWidth>innerWidth,
        controls:cards.map(card=>[...card.querySelectorAll('[role=button]')].map(e=>({...rect(e),label:e.getAttribute('aria-label')})))};
    })()`);
    assert.equal(layout.overflow, false, `overflow at ${width}`);
    assert.ok(layout.banners.every((banner, i) => Math.abs(banner.right - layout.rows[i].right) < 1), 'banner must reach the right edge of its parent');
    for (const [index, card] of layout.cards.entries()) {
      assert.ok(card.w <= 420.1);
      assert.ok(Math.abs(card.w / card.h - 1853 / 849) < 0.01);
      for (const control of layout.controls[index]) {
        assert.ok(control.w >= 39 && control.h >= 39, control.label);
        assert.ok(control.x >= card.x && control.right <= card.right + 1 && control.y >= card.y && control.bottom <= card.bottom + 1, `${width}: clipped ${control.label}`);
      }
    }
    assert.ok(layout.banners[1].y >= layout.cards[1].bottom, 'narrow parent must stack on desktop too');
    assert.ok(width >= 768 ? layout.banners[0].x >= layout.cards[0].right : layout.banners[0].y >= layout.cards[0].bottom);
    if ([375, 1440].includes(width)) {
      const screenshot = await browser.rpc('Page.captureScreenshot', { format: 'png' });
      await writeFile(`.codex-tmp/wallet-promotion-${width}.png`, Buffer.from(screenshot.data, 'base64'));
    }
  }
  assert.equal(await browser.read('!!document.querySelector(\'[aria-label="Quản lý ví"]\')'), false);
  for (const label of ['Nạp tiền', 'Rút tiền', 'Lịch sử']) {
    const point = await browser.read(`(()=>{const r=document.querySelector('[aria-label="${label}"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await browser.rpc('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await browser.wait(`document.querySelector('[data-testid=wallet-control-tooltip]')?.textContent==='${label}'`);
    const tooltip = await browser.read(`(()=>{const e=document.querySelector('[data-testid=wallet-control-tooltip]');const r=e.getBoundingClientRect();return {background:getComputedStyle(e).backgroundColor,text:getComputedStyle(e.firstElementChild).color,x:r.x,right:r.right}})()`);
    assert.equal(tooltip.background, 'rgb(33, 53, 74)');
    assert.equal(tooltip.text, 'rgb(244, 248, 252)');
    assert.ok(tooltip.x >= 0 && tooltip.right <= 1440);
  }
  for (const [label, expected] of [['Nạp tiền','deposit'],['Rút tiền','withdraw'],['Lịch sử','history'],['Khám phá Mini App','explore'],['Thử lại','retry']]) {
    await browser.click(`[aria-label="${label}"]`);
    assert.equal(await browser.read('document.getElementById("result").textContent'), expected);
  }
  await browser.click('[aria-label="Ẩn số dư"]');
  assert.equal(await browser.read('document.querySelector("[data-testid=wallet-summary-card]").textContent.includes("5.457.000")'), false);
  await browser.click('[aria-label="Hiện số dư"]');
  const privacyStyle = await browser.read(`(()=>{const s=getComputedStyle(document.querySelector('[aria-label="Ẩn số dư"]'));return {border:s.borderTopWidth,outline:s.outlineStyle,background:s.backgroundColor}})()`);
  assert.deepEqual(privacyStyle, { border: '0px', outline: 'none', background: 'rgba(0, 0, 0, 0)' }, 'privacy control stays frameless while hovered and focused');
  assert.equal(await browser.read('document.querySelector("[data-testid=wallet-summary-card]").textContent.includes("5.457.000")'), true);
  await browser.click('#loadBanners');
  await browser.rpc('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await browser.wait('!!document.querySelector("[data-testid=utility-banner-carousel]")');
  assert.equal(await browser.read(`(()=>{
    const artwork=document.querySelector('[data-testid=banner-artwork]');
    const backdrop=document.querySelector('[data-testid=banner-backdrop]');
    const frame=document.querySelector('[data-testid=utility-banner-carousel]').getBoundingClientRect();
    const controls=document.querySelector('[data-testid=banner-page-control]').getBoundingClientRect();
    return [...artwork.querySelectorAll('div')].some(e=>getComputedStyle(e).backgroundSize==='contain') &&
      [...backdrop.querySelectorAll('div')].some(e=>getComputedStyle(e).backgroundSize==='cover' && getComputedStyle(e).filter.includes('blur')) &&
      Math.abs(artwork.getBoundingClientRect().height-frame.height)<1 && controls.width<frame.width/2 && controls.height<=32;
  })()`), true, 'complete artwork over a blurred background with compact floating dots');
  await browser.wait('!!document.querySelector("[data-testid=banner-incoming]")');
  assert.equal(await browser.read(`(()=>{const current=document.querySelector('[data-testid=banner-current]').getBoundingClientRect();const incoming=document.querySelector('[data-testid=banner-incoming]').getBoundingClientRect();return incoming.x>current.x})()`), true, 'incoming slide enters from right');
  await browser.wait('document.querySelector("[data-testid=banner-current] [aria-label]")?.getAttribute("aria-label")==="Banner tiện ích 2" && !document.querySelector("[data-testid=banner-incoming]")');
  assert.equal(await browser.read('!!document.querySelector(\'[aria-label="Tạm dừng chuyển banner"], [aria-label="Tiếp tục chuyển banner"]\')'), false);
  assert.deepEqual(await browser.read(`(()=>{const active=document.querySelector('[aria-label="Xem banner 2"]');const inactive=document.querySelector('[aria-label="Xem banner 1"]');return {active:active.firstElementChild.getBoundingClientRect().width,inactive:inactive.firstElementChild.getBoundingClientRect().width}})()`), { active: 16, inactive: 6 }, 'active image has an elongated page dot');
  assert.equal(await browser.read(`(()=>{const e=document.querySelector('[data-testid=banner-page-control]');const frame=document.querySelector('[data-testid=utility-banner-carousel]').getBoundingClientRect();return getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)' && Math.abs(e.getBoundingClientRect().bottom-frame.bottom)<1})()`), true, 'transparent dots sit at the bottom of the banner');
  await browser.rpc('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await browser.rpc('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await browser.read('new Promise(resolve=>setTimeout(resolve,4500))');
  assert.equal(await browser.read('document.querySelector("[data-testid=banner-current] [aria-label]").getAttribute("aria-label")'), 'Banner tiện ích 2');
  await browser.click('[aria-label="Xem banner 1"]');
  await browser.wait('document.querySelector("[data-testid=banner-current] [aria-label]")?.getAttribute("aria-label")==="Banner tiện ích 1" && !document.querySelector("[data-testid=banner-incoming]")');
  await browser.click('[aria-label="Banner tiện ích 1"]');
  assert.equal(await browser.read('document.getElementById("result").textContent'), '/wallet');
  await browser.rpc('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: false });
  await browser.wait('getComputedStyle(document.querySelector("[data-testid=wallet-promotion-row]")).flexDirection==="column" && document.querySelector("[data-testid=utility-banner-carousel]").getBoundingClientRect().width<376');
  await browser.wait('document.documentElement.scrollWidth<=innerWidth');
  assert.equal(await browser.read('document.documentElement.scrollWidth>innerWidth'), false);
  const mobileShot = await browser.rpc('Page.captureScreenshot', { format: 'png' });
  await writeFile('.codex-tmp/utilities-banner-carousel-375.png', Buffer.from(mobileShot.data, 'base64'));
  await browser.rpc('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const swipeOrigin = await browser.read(`(()=>{const r=document.querySelector('[data-testid=utility-banner-carousel]').getBoundingClientRect();return {x:r.x+r.width*0.75,y:r.y+r.height/2}})()`);
  const swipeBanner = async direction => {
    const startX = direction === 1 ? swipeOrigin.x : swipeOrigin.x - 140;
    await browser.rpc('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: swipeOrigin.y }] });
    for (const offset of [20, 60, 100, 140]) await browser.rpc('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - direction * offset, y: swipeOrigin.y }] });
    await browser.rpc('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipeBanner(1);
  await browser.wait('document.querySelector("[data-testid=banner-current] [aria-label]")?.getAttribute("aria-label")==="Banner tiện ích 2" && !document.querySelector("[data-testid=banner-incoming]")');
  await swipeBanner(-1);
  await browser.wait('document.querySelector("[data-testid=banner-current] [aria-label]")?.getAttribute("aria-label")==="Banner tiện ích 1" && !document.querySelector("[data-testid=banner-incoming]")');
  await browser.rpc('Emulation.setTouchEmulationEnabled', { enabled: false });
  await browser.rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await browser.rpc('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await browser.rpc('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  await browser.key('Tab');
  await browser.read('new Promise(resolve=>setTimeout(resolve,4500))');
  assert.equal(await browser.read('document.querySelector("[data-testid=banner-current] [aria-label]").getAttribute("aria-label")'), 'Banner tiện ích 1');
  const screenshot = await browser.rpc('Page.captureScreenshot', { format: 'png' });
  await writeFile('.codex-tmp/utilities-banner-carousel-1440.png', Buffer.from(screenshot.data, 'base64'));
  await browser.click('#loadBroken');
  await browser.wait('!document.querySelector("[data-testid=utility-banner-carousel]") && !!document.querySelector(\'[aria-label="Khám phá Mini App"]\')');
  assert.deepEqual(browser.issues, []);
  console.log('PASS wallet/banner: five viewports, auto transition, transparent bottom dots, no pause button, touch swipes, manual selection, reduced motion and fallback.');
} catch (error) { console.error(browser?.issues); throw error; }
finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }

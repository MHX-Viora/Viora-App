// Synthetic Portal UI test; serve-console-ui.cjs must run on loopback port 5496.
import assert from 'node:assert/strict';
import {openDocsBrowser} from '../docs/tests/browser-fixture.mjs';
const browser = await openDocsBrowser();
try {
  await browser.rpc('Browser.grantPermissions', {origin:'http://127.0.0.1:5496',permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
  await browser.rpc('Page.navigate', {url:'http://127.0.0.1:5496/developers/console/apps/app_'+'a'.repeat(43)});
  await browser.wait("document.querySelectorAll('[role=tab]').length===7", 'seven bridge-only tabs');
  assert.deepEqual(await browser.read("[...document.querySelectorAll('[role=tab]')].map(x=>x.textContent)"),['Tổng quan','Thông tin ứng dụng','Tích hợp Auth Bridge','Sandbox','Xét duyệt và phát hành','Hoạt động','Cấu hình tích hợp']);
  await browser.click('#mini-tab-2');
  await browser.wait("document.body.innerText.includes('Đã xác minh')", 'real domain status from fixture API');
  await browser.rpc('Page.bringToFront');
  const target=await browser.rpc('Runtime.evaluate',{expression:"[...document.querySelectorAll('button')].find(x=>x.textContent==='Copy Client ID')"});
  await browser.rpc('DOM.scrollIntoViewIfNeeded',{objectId:target.result.objectId});
  const box = await browser.read("(()=>{const e=[...document.querySelectorAll('button')].find(x=>x.textContent==='Copy Client ID');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
  await browser.rpc('Input.dispatchMouseEvent',{type:'mousePressed',...box,button:'left',clickCount:1});
  await browser.rpc('Input.dispatchMouseEvent',{type:'mouseReleased',...box,button:'left',clickCount:1});
  await browser.wait("document.body.innerText.includes('Đã sao chép Client ID.')",'copy confirmed');
  for (const width of [320,768,1024,1440]) {
    await browser.rpc('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===320});
    assert.ok(await browser.read('document.documentElement.scrollWidth<=innerWidth'), 'no horizontal page overflow at '+width);
    assert.equal(await browser.read("new Set([...document.querySelectorAll('[role=tab]')].map(x=>Math.round(x.getBoundingClientRect().top))).size"),1,'single tab row at '+width);
  }
  assert.deepEqual(await browser.read("window.__consoleFixture.paths.filter(x=>/sso|credentials|redirect-uris/.test(x))"),[]);
  assert.equal(await browser.read('/OIDC|OAuth|SSO/.test(document.body.innerText)'),false);
  assert.equal(browser.issues.length,0,'no browser runtime issues');
  console.log('Portal browser verified: seven tabs, bridge information, Copy Client ID, 320/768/1024/1440 responsive, no legacy API calls or runtime errors.');
} finally {await browser.close();}

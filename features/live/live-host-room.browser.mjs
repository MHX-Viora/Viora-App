import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { openDocsBrowser } from '../developer/docs/tests/browser-fixture.mjs';

const mocks = {
  '@expo/vector-icons/Ionicons': 'export default ()=>null;',
  'react-native-safe-area-context': 'export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});',
  'react-native-svg': 'export default ()=>null;export const Circle=()=>null;',
  '@/components/common/user-avatar': 'export const UserAvatar=()=>null;',
  '@/components/common/app-toast': 'export const showAppToast=value=>{window.lastToast=value.title};',
  '@/services/live-realtime.service': 'export const liveCommentErrorMessage=()=>"error";',
  './live-heart-burst': 'export const LiveHeartBurst=()=>null;',
  'expo-image': 'export const Image=()=>null;',
  './live-gift-overlay': 'export const LiveGiftOverlay=()=>null;',
  './host-agora-preview': `import React from 'react';export const HostAgoraPreview=()=>React.createElement('button',{id:'fixture-camera-drag',style:{position:'absolute',left:70,top:110},onClick:()=>{window.dragClicks=(window.dragClicks||0)+1}},'Camera');`,
  './live-cover-backdrop': 'export const LiveCoverBackdrop=()=>null;',
  './live-top-gifters': 'export const LiveTopGifters=()=>null;',
  './live-cover': 'export const DEFAULT_LIVE_COVER=null;',
};
const result = await build({
  stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import {LiveHostRoom} from './features/live/live-host-room';
    import {initialHostSettings} from './features/live/live-host-model';
    const noop=()=>{},resolved=async()=>{};
    const longText='Bình luận dài cần hiển thị đầy đủ và tự xuống dòng. '.repeat(16);
    const comments=[{id:'h1',userId:'host',name:'Kai',text:longText,time:'now'},{id:'h2',userId:'host',name:'Kai',text:'1234567890'.repeat(60),time:'now'},{id:'v1',userId:'viewer',name:'Viewer',text:longText,time:'now'}];
    function Fixture(){const [ready,setReady]=React.useState(false);const [mode,setMode]=React.useState('check');const[allowComments,setAllowComments]=React.useState(true);window.setComments=setAllowComments;return <>
      <div style={{position:'fixed',top:0,left:0,zIndex:999}}><button id="ready" onClick={()=>setReady(true)}>Enable devices</button><button id="live" onClick={()=>setMode('live')}>Live fixture</button><button id="fail" onClick={()=>window.failSend=!window.failSend}>Toggle send failure</button></div>
      <LiveHostRoom mode={mode} settings={{...initialHostSettings,title:'Live test',allowComments}} comments={comments} pinnedComment={null} hostUserId="host"
        onPinComment={resolved} giftQueue={{}} topGifters={[]} elapsed={90} countdown={3} viewerCount={7} reactionCount={12} heartBurstRef={{current:null}}
        onSendComment={async text=>{if(window.failSend)throw Error('fixture');window.sentComments=[...(window.sentComments||[]),text]}} onReportComment={resolved} onMuteUser={resolved} onDeleteComment={resolved}
        cameraGranted={ready} cameraReady={ready} cameraError={false} cameraSession={0} agoraAppId="fixture" agoraRef={{current:null}}
        onTokenWillExpire={noop} microphoneGranted={ready} cameraOn microphoneOn facing="front" connected
        onRequestPermissions={noop} onCameraToggle={noop} onMicrophoneToggle={noop} onFlipCamera={noop} onCameraReady={noop} onCameraError={noop}
        onScreenShare={noop} screenShareUnavailableReason="Trình duyệt không hỗ trợ live màn hình. Dùng ứng dụng Android; live camera vẫn dùng được."
        onBack={noop} onStart={()=>{document.getElementById('result').textContent='start'}} onCancelCountdown={noop} onEndRequest={noop}/><div id="result"/>
    </>};createRoot(document.getElementById('root')).render(<Fixture/>);`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, jsx: 'automatic', write: false, alias: { 'react-native': 'react-native-web', '@': process.cwd() },
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'device-fixtures', setup(b) {
    b.onResolve({ filter: /.*/ }, a => Object.hasOwn(mocks, a.path) ? { path: a.path, namespace: 'fixture' } : undefined);
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, a => ({ contents: mocks[a.path], resolveDir: process.cwd() }));
  } }],
});
const server = createServer((req, res) => {
  if (req.url === '/app.js') { res.setHeader('Content-Type', 'text/javascript');res.end(result.outputFiles[0].contents);return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}*{box-sizing:border-box}</style><div id="root"></div><script src="/app.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await openDocsBrowser();
  await browser.rpc('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  await browser.wait('document.body.textContent.includes("Trạng thái thiết bị")');
  for (const width of [375, 1440]) {
    await browser.rpc('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.equal(await browser.read('document.body.textContent.includes("giao diện chủ phòng mẫu") || document.body.textContent.includes("dữ liệu minh họa")'), false);
    assert.equal(await browser.read('[...document.querySelectorAll("[role=button]")].find(e=>e.textContent.includes("Bắt đầu live")).getAttribute("aria-disabled")'), 'true');
    assert.equal(await browser.read('!!document.querySelector(\'[aria-label="Bật camera"]\')'), true);
  }
  await browser.click('#ready');
  await browser.wait('[...document.querySelectorAll("[role=button]")].some(e=>e.textContent.includes("Bắt đầu live") && e.getAttribute("aria-disabled")!=="true")');
  assert.equal(await browser.read('[...document.querySelectorAll("[role=button]")].find(e=>e.textContent.includes("Live màn hình / game")).getAttribute("aria-disabled")'),'true');
  await browser.click('#fixture-camera-drag');
  assert.equal(await browser.read('window.dragClicks'),1,'Host stage decoration must allow camera drag interactions');
  const start = await browser.read(`(()=>{const r=[...document.querySelectorAll('[role=button]')].find(e=>e.textContent.includes('Bắt đầu live')).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await browser.rpc('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...start });
  await browser.rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...start });
  assert.equal(await browser.read('document.querySelector("#result").textContent'), 'start');
  await browser.click('#live');
  await browser.wait('!!document.querySelector(\'[aria-label="Kết thúc"]\')');
  assert.equal(await browser.read('document.body.textContent.includes("DEMO") || !!document.querySelector(\'[aria-label="Thoát giao diện mẫu"]\')'), false);
  const openEmoji = async () => {
    await browser.click('[aria-label="Mở emoji"]');
    await browser.wait('!!document.querySelector(\'[aria-label="Bộ emoji cơ bản"]\')&&document.getAnimations().every(a=>a.playState!=="running")');
  };
  for (const width of [1440, 375]) {
    await browser.rpc('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await browser.wait('document.querySelectorAll("[data-testid=live-comment-message]").length>=2');
    const comments = await browser.read(`(()=>{const e=[...document.querySelectorAll('[data-testid=live-comment-message], [data-testid=live-chat-message]')];return e.map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {height:r.height,lineHeight:parseFloat(s.lineHeight),fontSize:parseFloat(s.fontSize),nameAbove:n.previousElementSibling.getBoundingClientRect().bottom<=r.top,clamp:s.webkitLineClamp,overflow:n.scrollWidth>n.clientWidth+1}})})()`);
    assert.ok(comments.every(c=>c.height>c.lineHeight*3 && c.clamp==='none' && !c.overflow), 'long messages wrap without line limits or horizontal overflow');
    assert.ok(comments.every(c=>c.fontSize===13 && c.nameAbove), 'larger message text appears below the name for every commenter');
    const gap = await browser.read(`(()=>{const e=[...document.querySelectorAll('[aria-label^="Quản lý bình luận của Kai:"]')];return e[1].getBoundingClientRect().top-e[0].getBoundingClientRect().bottom})()`);
    assert.ok(gap>=8, 'comment bubbles have at least 8px of separation');
    await openEmoji();
    assert.equal(await browser.read('document.querySelectorAll(\'[aria-label^="Thêm "]\').length'),40);
    await writeFile('.codex-tmp/host-emoji-'+width+'.png',Buffer.from((await browser.rpc('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await browser.click('[aria-label="Thêm 🙂 vào bình luận"]');
    await browser.wait('document.querySelector(\'[aria-label="Bình luận với tư cách chủ Live"]\').value==="🙂"');
    await browser.read('document.querySelector(\'[aria-label="Thêm 🔥 vào bình luận"]\').scrollIntoView({block:"nearest"})');
    await browser.click('[aria-label="Thêm 🔥 vào bình luận"]');
    await browser.wait('document.querySelector(\'[aria-label="Bình luận với tư cách chủ Live"]\').value==="🙂🔥"');
    await browser.click('[aria-label="Đóng emoji"]');
    await browser.click('[aria-label="Gửi bình luận"]');
    await browser.wait('window.sentComments?.at(-1)==="🙂🔥"&&document.querySelector(\'[aria-label="Bình luận với tư cách chủ Live"]\').value===""');
    await browser.click('#fail');await openEmoji();await browser.click('[aria-label="Thêm 🙂 vào bình luận"]');await browser.click('[aria-label="Đóng emoji"]');await browser.wait('document.getAnimations().every(a=>a.playState!=="running")');await browser.click('[aria-label="Gửi bình luận"]');
    await browser.wait('window.lastToast==="Không gửi được bình luận"');
    assert.equal(await browser.read('document.querySelector(\'[aria-label="Bình luận với tư cách chủ Live"]\').value'),'🙂');
    await browser.click('#fail');await browser.click('[aria-label="Gửi bình luận"]');await browser.wait('document.querySelector(\'[aria-label="Bình luận với tư cách chủ Live"]\').value===""');
    await openEmoji();await browser.read('window.setComments(false)');
    await browser.wait('!document.querySelector(\'[aria-label="Bộ emoji cơ bản"]\')');
    assert.equal(await browser.read('document.querySelector(\'[aria-label="Mở emoji"]\').getAttribute("aria-disabled")'),'true');
    await browser.read('window.setComments(true)');
  }
  await openEmoji();await browser.click('[aria-label="Thêm 🙂 vào bình luận"]');await browser.click('[aria-label="Đóng emoji"]');
  await browser.rpc('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await browser.wait('!!document.querySelector(\'[aria-label="Bình luận với tư cách chủ Live"]\')&&document.getAnimations().every(a=>a.playState!=="running")');
  assert.equal(await browser.read('document.querySelector(\'[aria-label="Bình luận với tư cách chủ Live"]\').value'),'🙂','Draft survives viewport layout changes');
  assert.deepEqual(browser.issues, []);
  console.log('PASS host: device checks, wrapped comments, desktop/mobile emoji compose/send/retry and disabled-comment behavior.');
} finally { if (browser) await browser.close();await new Promise(resolve => server.close(resolve)); }

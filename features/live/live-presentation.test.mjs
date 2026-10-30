import assert from 'node:assert/strict';
import test from 'node:test';
import { compile } from './tests/compile-fixture.mjs';
const { audiencePresentationLayout, parseLivePresentation, packedGameFrame, giftEffectFrame } = compile('features/live/live-presentation.ts');
const p = { version: 1, width: 1280, height: 720, cameraOn: true, cameraX: .9, cameraY: .1 };
test('phone fits whole screen horizontally and places camera in the host-selected band', () => {
 for (const width of [320,375,430]) {
  const upper=audiencePresentationLayout({width,height:800},p);
  const lower=audiencePresentationLayout({width,height:800},{...p,cameraY:.9});
  assert.equal(upper.screen.width,width); assert.equal(upper.screen.width/upper.screen.height,16/9);
  assert.ok(upper.camera.top+upper.camera.height<=upper.screen.top);
  assert.ok(lower.camera.top>=lower.screen.top+lower.screen.height);
  for(const rect of [upper.screen,upper.camera,lower.camera])assert.ok(rect.left>=0&&rect.left+rect.width<=width&&rect.top>=76&&rect.top+rect.height<=712);
 }
});
test('desktop constrains and centers video, keeps camera inset and ignores disabled camera',()=>{
 const frame=audiencePresentationLayout({width:1600,height:900},p);
 assert.equal(frame.screen.width,1100);assert.equal(frame.screen.left,250);
 assert.ok(frame.camera.top>=frame.screen.top);
 assert.equal(audiencePresentationLayout({width:375,height:800},{...p,cameraOn:false}).camera,null);
});
test('packed sources do not overlap and metadata rejects unsafe sizes and positions',()=>{
 const {gameStreamLayout}=compile('features/live/game-stream-layout.ts');const layout=gameStreamLayout(1280,720);const packed=packedGameFrame(layout);
 assert.equal(packed.camera.top,packed.screen.height);assert.equal(packed.height,packed.screen.height+packed.camera.height);
 assert.deepEqual(parseLivePresentation(p),p);
 for(const patch of [{width:NaN},{height:0},{width:10000},{width:1279},{version:2},{cameraX:Infinity},{cameraY:-1},{cameraOn:'true'}])assert.equal(parseLivePresentation({...p,...patch}),null);
});
test('gift effects span phone width and stay centered with bounded desktop width',()=>{
 assert.equal(giftEffectFrame({width:375,height:800},true).width,375);
 assert.deepEqual(giftEffectFrame({width:1600,height:900},false),{left:490,width:620,height:522,bottom:28});
});

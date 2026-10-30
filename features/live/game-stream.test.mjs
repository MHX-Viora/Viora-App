import assert from 'node:assert/strict';import test from 'node:test';import {compile} from './tests/compile-fixture.mjs';
test('game stream layout preserves screen shape, caps resolution and places a camera inset inside safe bounds',()=>{
 const {gameStreamLayout}=compile('features/live/game-stream-layout.ts');
 for(const [width,height] of [[1920,1080],[3840,2160],[1080,1920],[720,1280],[NaN,0]]){
  const layout=gameStreamLayout(width,height);assert.ok(layout.width<=1920&&layout.height<=1080);
  assert.equal(layout.width%2,0);assert.equal(layout.height%2,0);
  assert.ok(layout.inset.x>=0&&layout.inset.y>=0);assert.ok(layout.inset.x+layout.inset.width<layout.width);assert.ok(layout.inset.y+layout.inset.height<layout.height);
 }
 assert.deepEqual(gameStreamLayout(3840,2160),gameStreamLayout(1920,1080));
});

test('camera positions clamp within the video and survive portrait rotation', () => {
 const {gameStreamLayout,moveGameCamera}=compile('features/live/game-stream-layout.ts');
 const original=gameStreamLayout(1920,1080);
 const position=moveGameCamera(original,-10000,-10000);
 for(const [w,h] of [[1920,1080],[1080,1920],[720,1280]]){
  const topLeft=gameStreamLayout(w,h,position);
  assert.equal(topLeft.inset.x,Math.max(8,Math.round(topLeft.width*.018)));
  assert.equal(topLeft.inset.y,topLeft.inset.x);
  const bottomRight=gameStreamLayout(w,h,{x:100,y:100});
  assert.ok(bottomRight.inset.x+bottomRight.inset.width<bottomRight.width);
  assert.ok(bottomRight.inset.y+bottomRight.inset.height<bottomRight.height);
 }
 assert.deepEqual(moveGameCamera(original,0,0),moveGameCamera(original,NaN,Infinity));
});

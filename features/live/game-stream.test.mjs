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

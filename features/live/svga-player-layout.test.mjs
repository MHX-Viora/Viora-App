import assert from 'node:assert/strict';
import test from 'node:test';
import { compile } from './tests/compile-fixture.mjs';
test('phone artwork fills width and anchors its bottom for portrait and landscape movies',()=>{
 const {svgaArtworkFrame}=compile('features/live/svga-player-layout.ts');
 for(const source of [{width:750,height:1334},{width:1200,height:600},{width:500,height:1800}]){
  const r=svgaArtworkFrame({width:375,height:800},source,true);
  assert.equal(r.width,375);assert.equal(r.left,0);assert.equal(r.bottom,0);
  assert.ok(Math.abs(r.height/r.width-source.height/source.width)<1e-8);
 }
});
test('desktop artwork fills available height while preserving the complete movie and bottom edge',()=>{
 const {svgaArtworkFrame}=compile('features/live/svga-player-layout.ts');
 const r=svgaArtworkFrame({width:1280,height:800},{width:750,height:1334},false);
 assert.equal(r.height,800);assert.equal(r.bottom,0);assert.equal(r.left,(1280-r.width)/2);
 assert.ok(r.width>400&&r.width<1280);
});

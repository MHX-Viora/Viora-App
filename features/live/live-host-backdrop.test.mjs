import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {compile} from './tests/compile-fixture.mjs';
const require=createRequire(import.meta.url),React=require('react'),native=require('react-native-web');

test('portrait camera fits the stage centrally while leaving side space for the cover',()=>{
 const {getHostVideoFrame}=compile('features/live/host-video-frame.ts');
 assert.deepEqual(getHostVideoFrame({width:1600,height:900},{width:720,height:1280}),{width:506.25,height:900,left:546.875,top:0});
 assert.deepEqual(getHostVideoFrame({width:400,height:800},{width:1920,height:1080}),{width:400,height:225,left:0,top:287.5});
 assert.deepEqual(getHostVideoFrame({width:1600,height:900},{width:1920,height:1080}),{width:1600,height:900,left:0,top:0});
 assert.equal(getHostVideoFrame({width:0,height:0},{width:720,height:1280}),null);
 assert.equal(getHostVideoFrame({width:100,height:100},{width:NaN,height:0}),null);
});

test('blur-only cover omits the sharp layer and retains fallback when loading fails',()=>{
 let index=0;
 const {LiveCoverImage}=compile('features/live/live-cover-image.tsx',{
  react:{...React,useState:()=>[index,value=>{index=typeof value==='function'?value(index):value;}]},
  'react-native':native,'expo-image':{Image:'Image'},
  './live-cover':{DEFAULT_LIVE_COVER:{uri:'default-cover'},LIVE_COVER_ASPECT_RATIO:16/9},
 });
 const layers=React.Children.toArray(LiveCoverImage({source:{uri:'selected-cover'},blurredOnly:true}).props.children)[0];
 let rendered=React.Children.toArray(layers.type(layers.props).props.children).filter(n=>n.type==='Image');
 assert.equal(rendered.length,1);assert.equal(rendered[0].props.blurRadius,28);
 assert.equal(rendered[0].props.source.uri,'selected-cover');
 rendered[0].props.onError();
 rendered=React.Children.toArray(layers.type(layers.props).props.children).filter(n=>n.type==='Image');
 assert.equal(rendered[0].props.source.uri,'default-cover');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { compile } from './tests/compile-fixture.mjs';
test('screen capture requires both a secure origin and the real display capture API',()=>{
 const {webScreenShareUnavailableReason}=compile('features/live/web-screen-share-support.ts');
 assert.equal(webScreenShareUnavailableReason({secure:true,capture:true}),null);
 assert.match(webScreenShareUnavailableReason({secure:true,capture:false}),/Android/);
 assert.match(webScreenShareUnavailableReason({secure:false,capture:true}),/HTTPS/);
 assert.match(webScreenShareUnavailableReason({secure:false,capture:false}),/HTTPS/);
});

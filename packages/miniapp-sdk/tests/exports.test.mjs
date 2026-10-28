import test from 'node:test';
import assert from 'node:assert/strict';
import * as sdk from '../dist/index.js';
test('public SDK exposes only embedded authentication and host capabilities',()=>{
 assert.equal(typeof sdk.createAnktMiniApp,'function');
 for(const name of ['createMiniAppSdk','completePopupRedirect','validateOptions']) assert.equal(name in sdk,false);
});

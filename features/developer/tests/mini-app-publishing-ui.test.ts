import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewClient} from '../lib/mini-app-review';
test('version updates reject retired authentication fields before network calls',async()=>{
 let calls=0;const client=createReviewClient(async()=>{calls++;return {};});
 await assert.rejects(()=>client.updateVersion('app_'+'x'.repeat(43),'11111111-1111-4111-8111-111111111111', {requestId:'11111111-1111-4111-8111-111111111111',concurrencyToken:'11111111-1111-4111-8111-111111111111',versionName:'1',ssoEnabled:true} as never));
 assert.equal(calls,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthBridgeSourceGuard} from '../lib/auth-bridge-source';
test('account switch, source replacement and logout permanently invalidate a mounted Mini App',()=>{
  for(const next of [null,{user:{id:'other'},sessionId:'one'},{user:{id:'user'},sessionId:'two'}]){
    let invalidated=0;const guard=createAuthBridgeSourceGuard(()=>invalidated++);
    const first={user:{id:'user'},sessionId:'one'};
    assert.equal(guard.check(first),true);assert.equal(guard.check({...first}),true);
    assert.equal(guard.check(next),false);assert.equal(invalidated,1);
    assert.equal(guard.check(first),false);assert.equal(invalidated,1);
  }
});

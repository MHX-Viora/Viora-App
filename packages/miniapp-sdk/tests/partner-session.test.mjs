import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PrivateStore, cookie, readCookie} from '../examples/confidential/session.mjs';

test('partner transaction requires its opaque browser binding and is consumed once', () => {
  const store = new PrivateStore(2, () => 100);
  const key = store.put({state: 'expected'}, 1000);
  assert.equal(store.take('forged'), undefined);
  assert.deepEqual(store.take(key), {state: 'expected'});
  assert.equal(store.take(key), undefined);
});
test('an in-flight claimed login is one-use and cancellation prevents late completion', async () => {
  const store = new PrivateStore(); const transaction = {state: 'bound'};
  const handle = store.put(transaction, 300000);
  assert.equal(store.claim(handle), transaction);
  assert.equal(store.claim(handle), undefined);
  let resume; const network = new Promise(resolve => {resume = resolve;});
  const completion = (async () => { await network; return store.take(handle) === transaction; })();
  store.remove(handle); // Logout or a newer login cancels even an already claimed callback.
  resume(); assert.equal(await completion, false);
});
test('partner session expires, revokes and cannot exceed bounded capacity', () => {
  let now = 10; const store = new PrivateStore(1, () => now);
  const key = store.put({sub: 'pairwise'}, 20);
  assert.throws(() => store.put({}, 20), /capacity/);
  now = 30; assert.equal(store.get(key), undefined);
  const replacement = store.put({}, 20);
  assert.notEqual(key, replacement); store.remove(replacement);
  assert.equal(store.get(replacement), undefined);
});
test('partner cookies are secure host-only opaque handles and reject ambiguous cookies', () => {
  const value = 'a'.repeat(43);
  assert.equal(cookie('__Host-PartnerSession', value, 900), `__Host-PartnerSession=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=900`);
  assert.equal(readCookie(`other=x; __Host-PartnerSession=${value}`, '__Host-PartnerSession'), value);
  assert.equal(readCookie(`__Host-PartnerSession=${value}; __Host-PartnerSession=${value}`, '__Host-PartnerSession'), undefined);
  assert.equal(readCookie('__Host-PartnerSession=bad', '__Host-PartnerSession'), undefined);
});

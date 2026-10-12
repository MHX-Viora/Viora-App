import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOAuthRequest } from './oauth-request.mjs';
const request = { response_type: 'code', client_id: 'client-1', redirect_uri: 'https://partner.example/callback', state: 'state-abcdefghijklmnop', nonce: 'nonce-abcdefghijklmnop', code_challenge: 'a'.repeat(43), code_challenge_method: 'S256', scope: 'openid profile' };
test('only bounded authorization-code S256 transactions survive login handoff', () => {
  assert.equal(parseOAuthRequest(request).clientId, 'client-1');
  assert.equal(parseOAuthRequest({ ...request, state: 's'.repeat(1200), nonce: '638965863321.abcdefghijklmnop+/=' }).state.length, 1200);
  for (const invalid of [{ response_type: 'token' }, { client_id: ['client-1'] }, { redirect_uri: 'javascript:alert(1)' }, { redirect_uri: 'https://user:pw@partner.example' }, { code_challenge_method: 'plain' }, { scope: 'openid admin' }, { scope: 'openid openid' }, { state: 'short' }]) assert.equal(parseOAuthRequest({ ...request, ...invalid }), null);
});

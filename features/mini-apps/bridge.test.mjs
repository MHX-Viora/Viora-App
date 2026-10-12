import test from 'node:test';
import assert from 'node:assert/strict';
import { BridgeGuard, allowedNavigation, safeExternalUrl } from './bridge.mjs';
test('source, exact verified origin, binding, replay and payload bounds protect the host', () => {
  const source = {}; const guard = new BridgeGuard({ appId: 'app', sessionId: 'session', nonce: 'nonce', origins: ['https://partner.test'], source });
  const message = { type: 'ANKT_MINI_APP_REQUEST', id: 'req_1', method: 'getAppInfo', appId: 'app', sessionId: 'session', nonce: 'nonce', params: {} };
  assert.equal(guard.accept(message, 'https://partner.test.evil', source), false);
  assert.equal(guard.accept(message, 'https://partner.test', {}), false);
  assert.equal(guard.accept({ ...message, nonce: 'other' }, 'https://partner.test', source), false);
  const cyclic = { ...message }; cyclic.params = cyclic;
  assert.equal(guard.accept(cyclic, 'https://partner.test', source), false);
  assert.equal(guard.accept(message, 'https://partner.test', source), true);
  assert.equal(guard.accept(message, 'https://partner.test', source), false);
  guard.close(); assert.equal(guard.accept({ ...message, id: 'req_2' }, 'https://partner.test', source), false);
});
test('navigation rejects unsafe schemes, credentials and domain suffix lookalikes', () => {
  assert.equal(allowedNavigation('https://partner.test/path', ['partner.test']), true);
  assert.equal(safeExternalUrl('https://partner.test/path'), 'https://partner.test/path');
  for (const url of ['https://%', 'https://user:pw@partner.test', 'javascript:alert(1)', 'http://partner.test']) assert.equal(safeExternalUrl(url), undefined);
  for (const url of ['http://partner.test', 'https://partner.test.evil', 'https://user:pw@partner.test', 'javascript:alert(1)', 'https://sub.partner.test']) assert.equal(allowedNavigation(url, ['partner.test']), false);
});

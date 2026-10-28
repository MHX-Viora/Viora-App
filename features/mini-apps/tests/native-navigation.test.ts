import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeHostUrl, readNativeHostMessage } from '../lib/native-navigation';
const origin = 'https://runtime.example.test';
test('native initial load and later navigation accept only exact trusted shell routes', () => {
  for (const path of ['/mini-app-host', '/mini-app-host/run/11111111-1111-4111-8111-111111111111'])
    assert.equal(nativeHostUrl(origin + path, origin), origin + path);
  for (const url of [origin, origin + '/mini-app-host?grant=private', origin + '/mini-app-host#private',
    origin + '/mini-app-host/other', origin + '/mini-app-host/run/not-an-id', origin + '/mini-app-host/',
    'http://runtime.example.test/mini-app-host', 'https://runtime.example.test.evil/mini-app-host',
    'https://user@runtime.example.test/mini-app-host', origin + ':444/mini-app-host',
    'javascript:alert(1)', 'file:///mini-app-host', origin + '/a/../mini-app-host', origin + '/%6dini-app-host'])
    assert.throws(() => nativeHostUrl(url, origin));
});
test('only native-verified main-frame metadata on current shell can enter the private transport', () => {
  const data = JSON.stringify({ channel: 'ankt.production.host', version: 1, type: 'host.running' });
  const event = { url: origin + '/mini-app-host', isMainFrame: true, data };
  assert.deepEqual(readNativeHostMessage(event, origin), JSON.parse(data));
  for (const invalid of [{ ...event, isMainFrame: false }, { ...event, url: 'https://partner.test/' },
    { ...event, data: '[' }, { ...event, data: 'x'.repeat(16385) }, { ...event, data: '[]' },
    { ...event, data: '{}' }, null]) assert.equal(readNativeHostMessage(invalid, origin), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeHostChannel } from '../lib/native-host-channel';
const origin = 'https://host.example.test', nonce = 'a'.repeat(43), documentNonce = 'b'.repeat(43);
const id = '11111111-1111-4111-8111-111111111111';
const prepared = { channel: 'ankt.production.host', version: 1, type: 'host.prepared', documentNonce,
  bindingId: 'binding', browserNonce: nonce, expiresAt: new Date(Date.now() + 60000).toISOString() };
const receipt = { sessionId: id, publicationId: id, correlationId: id, version: '1', hostOrigin: origin,
  hostUrl: origin + '/mini-app-host', expiresAt: new Date(Date.now() + 60000).toISOString(), grant: 'g'.repeat(43), capabilities: [] };
test('native channel rejects subframe metadata and replays before one real launch; dispose sends scoped stop', async () => {
  const sent: any[] = []; let calls = 0;
  const channel = createNativeHostChannel({ hostOrigin: origin, apiOrigin: 'https://api.test', appOrigin: 'https://app.test',
    launch: async () => { calls++; return receipt; }, send: value => sent.push(JSON.parse(value)), status() {} });
  const event = { isMainFrame: true, url: origin + '/mini-app-host', data: JSON.stringify(prepared) };
  await channel.receive({ ...event, isMainFrame: false });
  await channel.receive({ ...event, url: 'https://partner.test/' });
  assert.equal(calls, 0);
  await channel.receive(event); await channel.receive(event);
  assert.equal(calls, 1); assert.equal(sent[0].type, 'host.launch');
  channel.dispose(); channel.dispose();
  assert.equal(sent.length, 2); assert.equal(sent[1].type, 'host.stop');
  assert.equal(sent[1].sessionId, id);
  await channel.receive(event); assert.equal(calls, 1);
});
test('background/teardown aborts native launch and never restores a late receipt', async () => {
  let finish!: (value: typeof receipt) => void, signal!: AbortSignal;
  const sent: string[] = [], statuses: string[] = [];
  const channel = createNativeHostChannel({ hostOrigin: origin, apiOrigin: 'https://api.test', appOrigin: 'https://app.test',
    launch: async (_binding, _nonce, cancellation) => { signal = cancellation; return await new Promise(resolve => { finish = resolve; }); },
    send: value => sent.push(value), status: value => statuses.push(value) });
  const pending = channel.receive({ isMainFrame: true, url: origin + '/mini-app-host', data: JSON.stringify(prepared) });
  channel.dispose(); assert.equal(signal.aborted, true); finish(receipt); await pending;
  assert.deepEqual(sent, []); assert.deepEqual(statuses, []);
});

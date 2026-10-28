import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductionTransport } from '../lib/host-transport';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', nonce = 'n'.repeat(43), doc = 'd'.repeat(43), run = 'r'.repeat(43);
function fixture(launch?: (signal: AbortSignal) => Promise<any>) {
  const source = {}, sent: any[] = [], statuses: string[] = []; let calls = 0;
  const receipt = { sessionId: id, publicationId: id, version: '1', hostOrigin: 'https://host.example', hostUrl: 'https://host.example/mini-app-host', expiresAt: new Date(Date.now() + 30000).toISOString(), grant: 'g'.repeat(43), capabilities: [], correlationId: id };
  const transport = createProductionTransport({ hostOrigin: 'https://host.example', appOrigin: 'https://app.example', apiOrigin: 'https://api.example', source: () => source,
    launch: async (binding, browserNonce, signal) => { calls++; assert.equal(binding, 'binding'); assert.equal(browserNonce, nonce); return launch ? launch(signal) : receipt; },
    send: value => sent.push(value), status: value => statuses.push(value) });
  const message = (type: string, fields = {}, documentNonce = doc) => ({ origin: 'https://host.example', source,
    data: { channel: 'ankt.production.host', version: 1, type, documentNonce, ...fields } });
  const prepared = () => message('host.prepared', { bindingId: 'binding', browserNonce: nonce, expiresAt: new Date(Date.now() + 60000).toISOString() });
  return { transport, message, prepared, sent, statuses, calls: () => calls, receipt };
}
test('only exact host window may prepare once; run resume requires new generation and matching session', async () => {
  const f = fixture(), event = f.prepared();
  for (const bad of [{ ...event, origin: 'https://host.example.evil' }, { ...event, source: {} }, { ...event, source: null },
    { ...event, data: { ...event.data, token: 'injected' } }]) await f.transport.handle(bad);
  assert.equal(f.calls(), 0);
  await f.transport.handle(event); await f.transport.handle(event);
  assert.equal(f.calls(), 1); assert.equal(f.sent[0].type, 'host.launch');
  await f.transport.handle(f.message('host.runtime.ready', { sessionId: id }));
  await f.transport.handle(f.message('host.runtime.ready', { sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }, run));
  assert.equal(f.sent.length, 1);
  await f.transport.handle(f.message('host.runtime.ready', { sessionId: id }, run));
  assert.deepEqual(f.sent[1], { channel: 'ankt.production.host', version: 1, type: 'host.resume', documentNonce: run, sessionId: id, browserNonce: nonce });
  await f.transport.handle(f.message('bridge.connected', { sessionId: id }));
  assert.equal(f.statuses.includes('bridge.connected'), false);
  await f.transport.handle(f.message('bridge.connected', { sessionId: id }, run));
  assert.equal(f.statuses.at(-1), 'bridge.connected');
  f.transport.dispose(); assert.equal(f.sent.at(-1).type, 'host.stop');
});
test('dispose aborts pending launch and suppresses late receipt, status and private messages', async () => {
  let finish!: (value: any) => void, signal!: AbortSignal;
  const f = fixture(value => { signal = value; return new Promise(resolve => { finish = resolve; }); });
  const pending = f.transport.handle(f.prepared());
  f.transport.dispose(); assert.equal(signal.aborted, true); finish(f.receipt); await pending;
  await f.transport.handle(f.message('host.runtime.ready', { sessionId: id }, run));
  assert.deepEqual(f.sent, []); assert.deepEqual(f.statuses, []);
});
test('expired preparation and forged failure cannot trigger launch or terminal state', async () => {
  const f = fixture();
  await f.transport.handle(f.message('host.prepared', { bindingId: 'binding', browserNonce: nonce, expiresAt: new Date(0).toISOString() }));
  assert.equal(f.calls(), 0);
  await f.transport.handle(f.prepared());
  await f.transport.handle(f.message('host.closed', { sessionId: id, confirmed: true }, run));
  assert.deepEqual(f.statuses, ['launch.granted']);
  f.transport.dispose();
});

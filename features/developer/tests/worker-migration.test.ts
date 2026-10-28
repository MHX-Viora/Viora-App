import assert from 'node:assert/strict';
import test from 'node:test';
import { activateLegacyWorkerReplacement, isLegacyWorker } from '../../pwa/worker-migration';

test('only the same-origin legacy /sw.js controller is eligible for migration', () => {
  assert.equal(isLegacyWorker('https://mxh.ankt.vn/sw.js', 'https://mxh.ankt.vn'), true);
  for (const script of [undefined, 'https://other.example/sw.js', 'https://mxh.ankt.vn/other/sw.js', 'https://mxh.ankt.vn/firebase-messaging-sw.js']) {
    assert.equal(isLegacyWorker(script, 'https://mxh.ankt.vn'), false);
  }
});

function worker(path: string, state: string) {
  const target = new EventTarget(); const messages: unknown[] = [];
  return Object.assign(target, { scriptURL: 'https://mxh.ankt.vn' + path, state, messages, postMessage: (value: unknown) => messages.push(value) });
}
test('waiting replacement activates without consuming responses or clearing account storage', () => {
  const waiting = worker('/firebase-messaging-sw.js?apiKey=public-config', 'installed');
  const registration = Object.assign(new EventTarget(), { waiting, installing: null });
  assert.equal(activateLegacyWorkerReplacement(registration, 'https://mxh.ankt.vn/sw.js', 'https://mxh.ankt.vn'), true);
  assert.deepEqual(waiting.messages, [{ type: 'SKIP_WAITING' }]);
});

test('installing replacement activates once installed, without changing normal update policy', () => {
  const installing = worker('/firebase-messaging-sw.js', 'installing');
  const registration = Object.assign(new EventTarget(), { waiting: null, installing });
  activateLegacyWorkerReplacement(registration, 'https://mxh.ankt.vn/sw.js', 'https://mxh.ankt.vn');
  assert.deepEqual(installing.messages, []);
  installing.state = 'installed'; installing.dispatchEvent(new Event('statechange')); installing.dispatchEvent(new Event('statechange'));
  assert.deepEqual(installing.messages, [{ type: 'SKIP_WAITING' }]);
  const current = worker('/firebase-messaging-sw.js', 'installed');
  activateLegacyWorkerReplacement(Object.assign(new EventTarget(), { waiting: current, installing: null }), 'https://mxh.ankt.vn/firebase-messaging-sw.js', 'https://mxh.ankt.vn');
  assert.deepEqual(current.messages, []);
});

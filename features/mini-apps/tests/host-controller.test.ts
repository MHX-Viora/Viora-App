import assert from 'node:assert/strict';
import test from 'node:test';
import { MiniAppHostController, isPublicMiniAppRoute } from '../lib/host-controller';
const appId = 'app_' + 'a'.repeat(43);
const detail = { app: { id: appId, name: 'Reviewed', logoUrl: null, description: null, category: 'tools', version: '1' }, canOpen: true, loginAvailable: false, capabilities: [] };
test('route exception permits only exact mini app route when enabled', () => {
  assert.equal(isPublicMiniAppRoute(['mini-apps', '[appId]'], true), true);
  for (const segments of [['mini-apps'], ['mini-apps', '[appId]', 'edit'], ['(tabs)', 'utilities'], ['wallet', 'deposit'], ['mini-apps', 'admin']])
    assert.equal(isPublicMiniAppRoute(segments, true), false);
  assert.equal(isPublicMiniAppRoute(['mini-apps', '[appId]'], false), false);
});
test('open guards double press, revalidates every retry and closed controller suppresses late response', async () => {
  let finish!: (value: typeof detail) => void, calls = 0, invalidated = '';
  const controller = new MiniAppHostController(appId, { detail: async () => { calls++; return new Promise(resolve => { finish = resolve; }); } }, id => { invalidated = id; });
  const opening = controller.open(); await controller.open(); assert.equal(calls, 1);
  finish(detail); await opening; assert.equal(controller.snapshot().phase, 'running'); assert.equal(controller.snapshot().attempt, 1);
  controller.hostStatus('website.loaded'); assert.equal(controller.snapshot().status, 'website.loaded');
  controller.hostStatus('bridge.connected'); controller.hostStatus('website.loaded');
  assert.equal(controller.snapshot().status, 'bridge.connected');
  controller.hostStatus('host.error'); assert.equal(controller.snapshot().phase, 'failed'); assert.equal(invalidated, appId);
  const retry = controller.open(); assert.equal(calls, 2); controller.close(); finish(detail); await retry;
  assert.equal(controller.snapshot().phase, 'closed'); controller.hostStatus('bridge.connected'); assert.equal(controller.snapshot().phase, 'closed');
});
test('unavailable app never mounts host and server failure cannot surface raw text', async () => {
  let invalidated = 0;
  const controller = new MiniAppHostController(appId, { detail: async () => ({ ...detail, canOpen: false }) }, () => invalidated++);
  await controller.open(); assert.equal(controller.snapshot().phase, 'failed'); assert.equal(invalidated, 1);
  const failed = new MiniAppHostController(appId, { detail: async () => { throw new Error('database password'); } }, () => {});
  await failed.open(); assert.equal(failed.snapshot().status, 'launch.failed'); assert.equal(JSON.stringify(failed.snapshot()).includes('password'), false);
});

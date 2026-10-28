import assert from 'node:assert/strict';
import test from 'node:test';
import { createMiniAppLaunchClient } from '../../../services/mini-app-launch.service';

const appId = 'app_' + 'a'.repeat(43), id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const request = { requestId: id, platform: 'Web' as const, bindingId: 'protected-binding', browserNonce: 'n'.repeat(43) };
const receipt = () => ({ sessionId: id, publicationId: id, version: '1', hostOrigin: 'https://host.example', hostUrl: 'https://host.example/mini-app-host', expiresAt: new Date(Date.now() + 30000).toISOString(), grant: 'g'.repeat(43), capabilities: ['platform.getContext', 'platform.close'], correlationId: id });
test('fresh launch posts only to configured API, optional bearer never sent to host or cookies', async () => {
  const calls: RequestInit[] = [];
  const client = createMiniAppLaunchClient('https://api.example', 'https://host.example', 'https://app.example', async (url, init) => {
    assert.equal(url, `https://api.example/api/mini-apps/${appId}/launch`);
    assert.equal(init?.method, 'POST'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.cache, 'no-store');
    assert.equal(init?.redirect, 'error'); assert.deepEqual(JSON.parse(String(init?.body)), request);
    calls.push(init!); return Response.json(receipt());
  });
  await client.launch(appId, request, 'social-access');
  assert.equal(new Headers(calls[0].headers).get('Authorization'), 'Bearer social-access');
  await client.launch(appId, request, null);
  assert.equal(new Headers(calls[1].headers).has('Authorization'), false);
});
test('native launch labels the platform and first-party Origin without sending browser cookies', async () => {
  const calls: RequestInit[] = [];
  const client = createMiniAppLaunchClient('https://api.example', 'https://host.example', 'https://app.example', async (_url, init) => {
    calls.push(init!); return Response.json(receipt());
  });
  for (const platform of ['Android', 'iOS'] as const) await client.launch(appId, { ...request, platform }, 'social-access');
  assert.deepEqual(calls.map(call => JSON.parse(String(call.body)).platform), ['Android', 'iOS']);
  for (const call of calls) {
    assert.equal(new Headers(call.headers).get('Origin'), 'https://app.example');
    assert.equal(new Headers(call.headers).get('Authorization'), 'Bearer social-access');
    assert.equal(call.credentials, 'omit');
  }
});

test('invalid bearer response fails once without anonymous fallback or raw server text', async () => {
  let calls = 0;
  const client = createMiniAppLaunchClient('https://api.example', 'https://host.example', 'https://app.example', async () => {
    calls++; return new Response('secret stack trace', { status: 401 });
  });
  await assert.rejects(() => client.launch(appId, request, 'invalid'), /HOST_SOURCE_INVALID/);
  assert.equal(calls, 1);
});
test('launch rejects unpinned origin/path, expired receipt, malformed grant and extra authority', async () => {
  for (const patch of [{ hostOrigin: 'https://evil.example' }, { hostUrl: 'https://host.example/mini-app-host?grant=leak' },
    { expiresAt: new Date(0).toISOString() }, { grant: 'bad' }, { websiteUrl: 'https://evil.example' }, { capabilities: ['auth.login'] }]) {
    const client = createMiniAppLaunchClient('https://api.example', 'https://host.example', 'https://app.example', async () => Response.json({ ...receipt(), ...patch }));
    await assert.rejects(() => client.launch(appId, request, null), /INVALID_LAUNCH_RESPONSE/);
  }
  assert.throws(() => createMiniAppLaunchClient('https://api.example', 'https://app.example', 'https://app.example'), /INVALID_HOST_CONFIGURATION/);
});
test('aborted launch cannot produce a late receipt', async () => {
  const abort = new AbortController();
  const client = createMiniAppLaunchClient('https://api.example', 'https://host.example', 'https://app.example', async () => { abort.abort(); return Response.json(receipt()); });
  await assert.rejects(() => client.launch(appId, request, null, abort.signal), error => error instanceof Error && error.name === 'AbortError');
});

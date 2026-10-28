import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountApiError, accountRequest } from '../lib/account-client';
import { loadSandboxPage, directTestUrl } from '../lib/sandbox-page';

const appId = 'app_' + 'd'.repeat(43);
const app = { appId, name: 'Demo', websiteUrl: 'https://partner.example/app' };

test('disabled Sandbox retains the owned app and structured backend error code', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async input => String(input).endsWith('/sandbox/config')
    ? Response.json({ error: { code: 'SANDBOX_DISABLED', message: 'Sandbox chưa được bật.' } }, { status: 503 })
    : Response.json(app);
  try {
    await assert.rejects(accountRequest('mini-apps/' + appId + '/sandbox/config'), error =>
      error instanceof AccountApiError && error.code === 'SANDBOX_DISABLED');
    assert.deepEqual(await loadSandboxPage(appId), { app, config: null });
  } finally { globalThis.fetch = original; }
});

test('managed Sandbox stays enabled and unrelated errors never select direct testing', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async input => Response.json(String(input).endsWith('/sandbox/config')
      ? { hostOrigin: 'https://sandbox.example' } : app);
    assert.deepEqual(await loadSandboxPage(appId), { app, config: { hostOrigin: 'https://sandbox.example' } });
    for (const [status, code] of [[503, 'SERVICE_UNAVAILABLE'], [403, 'SANDBOX_DISABLED'], [401, 'UNAUTHENTICATED']] as const) {
      globalThis.fetch = async input => String(input).endsWith('/sandbox/config')
        ? Response.json({ error: { code, message: 'Denied' } }, { status }) : Response.json(app);
      await assert.rejects(loadSandboxPage(appId));
    }
    globalThis.fetch = async () => Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    await assert.rejects(loadSandboxPage(appId));
  } finally { globalThis.fetch = original; }
});

test('direct test uses the registered HTTPS URL and rejects unsafe navigation', () => {
  assert.equal(directTestUrl(app.websiteUrl), app.websiteUrl);
  for (const url of [null, '', 'javascript:alert(1)', '//partner.example', 'http://partner.example', 'https://user:secret@partner.example', 'https://localhost', 'https://127.0.0.1'])
    assert.equal(directTestUrl(url), null);
});

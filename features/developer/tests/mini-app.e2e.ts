import assert from 'node:assert/strict';
import type { MiniApp } from '../lib/mini-app-client';

type Api = (path: string, method?: string, body?: unknown) => Promise<Response>;
export async function runMiniAppE2E(api: Api, origin: string, cookie: () => string) {
  const list = await (await api('mini-apps')).json(); assert.equal(list.total, 0);
  // Real PNG bytes; actual Cloudinary decoding, square transformation and persistent upload ticket.
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4XcAAAAASUVORK5CYII=', 'base64');
  const uploaded = await fetch(`${origin}/developers/api/account/mini-apps/logo`, { method: 'POST', headers: {
    Origin: origin, 'X-ANKT-Developer': '1', 'Content-Type': 'image/png', Cookie: cookie(),
  }, body: bytes });
  assert.equal(uploaded.status, 200, 'real Cloudinary logo upload succeeds');
  const logo = await uploaded.json(); assert.match(logo.url, /^https:\/\//); assert.ok(logo.uploadId);
  const request = { name: 'Real E2E Mini App', category: 'utilities', requestId: crypto.randomUUID(), logoUploadId: logo.uploadId };
  const response = await api('mini-apps', 'POST', request); assert.equal(response.status, 200);
  const app: MiniApp = await response.json(); assert.ok(app.appId); assert.equal(app.logoUrl, logo.url);
  const replay: MiniApp = await (await api('mini-apps', 'POST', request)).json(); assert.equal(replay.appId, app.appId);
  const root = `mini-apps/${app.appId}`;
  assert.equal((await api(root + '/credentials')).status, 404);
  const edited = await api(root, 'PATCH', { shortDescription: 'Persisted real E2E draft', websiteUrl: 'https://example.com/mini-app', privacyPolicyUrl: 'https://example.com/privacy', termsOfServiceUrl: 'https://example.com/terms', supportEmail: 'support@example.test' });
  assert.equal(edited.status, 200);
  const reloaded: MiniApp = await (await api(root)).json(); assert.equal(reloaded.shortDescription, 'Persisted real E2E draft');
  assert.equal((await api(root + '/redirect-uris')).status, 404);
  // Leave this app for browser reload/copy/edit checks; the isolated host removes its DB on shutdown.
  console.log(`Real Mini App E2E passed: ${app.appId} (no credentials printed)`);
  return app.appId;
}

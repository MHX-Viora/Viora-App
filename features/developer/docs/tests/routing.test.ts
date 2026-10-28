import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { requiresDeveloperDocumentNavigation } from '../../lib/navigation-policy';
const require = createRequire(import.meta.url);
const { configureDocsPolicy } = require('../../../../server/developer/docs-policy.cjs');
const base = require('../../../../server/developer/vercel-base.json');
test('documentation navigation crosses full-document boundary without broadening Social routes', () => {
  assert.equal(requiresDeveloperDocumentNavigation('/developers', '/developers/docs/sdk'), true);
  assert.equal(requiresDeveloperDocumentNavigation('/developers/docs/sdk', '/developers/console'), true);
  assert.equal(requiresDeveloperDocumentNavigation('/developers', '/developers/login'), false);
});
test('artifact policy preserves account rewrites and excludes unknown docs from SPA fallback', () => {
  const original = JSON.stringify(base), policy = configureDocsPolicy(base, ['', 'sdk']);
  assert.equal(JSON.stringify(base), original);
  assert.ok(policy.rewrites.some((rule: { source: string }) => rule.source === '/developers/api/account/:path*'));
  assert.ok(policy.rewrites.some((rule: { source: string; destination: string }) => rule.source === '/developers/docs/sdk' && rule.destination.endsWith('/sdk/index.html')));
  const fallback = policy.rewrites.find((rule: { destination: string }) => rule.destination === '/');
  assert.ok(!new RegExp('^' + fallback.source + '$').test('/developers/docs/missing'));
  assert.ok(new RegExp('^' + fallback.source + '$').test('/login'));
  assert.throws(() => configureDocsPolicy(base, ['../console']));
});

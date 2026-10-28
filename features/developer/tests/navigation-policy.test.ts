import test from 'node:test';
import assert from 'node:assert/strict';
import { requiresDeveloperDocumentNavigation } from '../lib/navigation-policy';

const app = '/developers/console/apps/app_' + 'a'.repeat(43);
test('navigation loads a fresh document when entering or leaving the Sandbox CSP boundary', () => {
  for (const path of ['/developers/console', '/developers/console/settings', app, '/developers/docs']) {
    assert.equal(requiresDeveloperDocumentNavigation(path, app + '/sandbox'), true);
    assert.equal(requiresDeveloperDocumentNavigation(app + '/sandbox', path), true);
    assert.equal(requiresDeveloperDocumentNavigation(app + '/sandbox/', path), true);
  }
  assert.equal(requiresDeveloperDocumentNavigation('/developers/console', app), true);
  assert.equal(requiresDeveloperDocumentNavigation('/developers/console', '/developers/console/settings'), false);
});

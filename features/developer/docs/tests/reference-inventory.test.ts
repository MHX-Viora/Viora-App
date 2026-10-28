import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL as NodeURL, fileURLToPath } from 'node:url';
import { apiInventory, validateInventory } from '../reference/api-inventory';

test('public API reference rejects private routes, duplicate operations and missing contracts', () => {
  assert.doesNotThrow(() => validateInventory(apiInventory));
  const entry = apiInventory[0];
  for (const path of ['/api/admin/mini-apps', '/internal/sandbox-executor/runs', '/api/mini-app-host/close', '/api/mini-apps/launch'])
    assert.throws(() => validateInventory([{ ...entry, path }]));
  assert.throws(() => validateInventory([entry, entry]));
  assert.throws(() => validateInventory([{ ...entry, description: '' }]));
});

test('inventory methods and route suffixes have actual registration source', () => {
  const files: Record<string, string> = { apps: 'Developer/MiniAppApi.cs', integration: 'Developer/MiniAppIntegrationApi.cs',
    versions: 'Developer/MiniAppVersionApi.cs', reviews: 'Developer/MiniAppReviewApi.cs',
    publishing: 'Developer/MiniAppPublishingApi.cs', catalog: 'Production/MiniAppPublicApi.cs', account: 'Developer/DeveloperApi.cs', sandbox: 'Developer/MiniAppSandboxApi.cs' };
  for (const entry of apiInventory) {
    const source = readFileSync(fileURLToPath(new NodeURL(`../../../../../viora-BE/viora-BE/${files[entry.group]}`, import.meta.url)), 'utf8');
    let suffix = entry.path.replace(entry.group === 'catalog' ? '/api/mini-apps' : entry.group === 'account' ? '/developers/api/account' : '/api/developer/mini-apps', '');
    if (entry.group === 'versions') suffix = suffix.replace('/{appId}/versions', '');
    if (entry.group === 'sandbox') suffix = suffix.replace('/{appId}/sandbox', '');
    suffix = suffix.replace(/\{(versionId|reviewId|sessionId|runId|id)\}/g, '{$1:guid}');
    assert.ok(source.includes(`Map${entry.method[0]}${entry.method.slice(1).toLowerCase()}("${suffix}"`), entry.id);
  }
  assert.ok(apiInventory.length >= 20);
});

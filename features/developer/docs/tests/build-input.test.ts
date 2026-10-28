import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL as NodeURL } from 'node:url';
const root = fileURLToPath(new NodeURL('../../../../', import.meta.url));
test('artifact builder rejects output and base export paths outside the owned workspace before building', () => {
  for (const args of [['--output-dir', '..'], ['--base-export', '../viora-BE']]) {
    const result = spawnSync(process.execPath, ['scripts/build-developer-docs.cjs', ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Output must be a child|Expected a separate workspace Expo export/);
  }
});

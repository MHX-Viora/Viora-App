import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url), ts = require('typescript');
function load() {
  const file = path.resolve('features/article/article-editor-blocks.ts'), mod = new Module(file);
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return mod.exports;
}

test('new blocks retain unique identities and content through edits and reordering', () => {
  const { createEditorBlock, normalizeOrder, serializeEditorBlocks } = load();
  const first = createEditorBlock({ type: 0, content: 'First', orderIndex: 0 });
  const second = createEditorBlock({ type: 0, content: 'Second', orderIndex: 1 });
  assert.notEqual(first.clientKey, second.clientKey);
  const edited = { ...first, content: 'Edited' };
  const reordered = normalizeOrder([second, edited]);
  assert.deepEqual(reordered.map(block => block.clientKey), [second.clientKey, first.clientKey]);
  assert.deepEqual(serializeEditorBlocks(reordered), [
    { type: 0, content: 'Second', orderIndex: 0 },
    { type: 0, content: 'Edited', orderIndex: 1 },
  ]);
  assert.equal(first.orderIndex, 0);
});

test('publishing retains persisted IDs and strips editor-only keys and server timestamps', () => {
  const { createEditorBlock, serializeEditorBlocks } = load();
  const block = createEditorBlock({ id: 'saved', type: 0, content: 'Content', orderIndex: 8, createdAt: 'old', updatedAt: 'old' });
  assert.deepEqual(serializeEditorBlocks([block]), [{ id: 'saved', type: 0, content: 'Content', orderIndex: 0 }]);
});

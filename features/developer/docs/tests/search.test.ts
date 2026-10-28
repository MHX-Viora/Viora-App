import assert from 'node:assert/strict';
import test from 'node:test';
import { searchDocuments, highlightText } from '../lib/search';
import { highlightCode } from '../lib/highlight';
import { introduction } from '../content/introduction';
test('Vietnamese search matches title, heading and content with bounded anchored results', () => {
  const result = searchDocuments([introduction], 'xac minh ten mien');
  assert.equal(result.length, 1); assert.equal(result[0].slug, 'introduction');
  assert.equal(searchDocuments([introduction], 'not-in-content').length, 0);
  assert.equal(searchDocuments([introduction], 'x'.repeat(129)).length, 0);
  assert.equal(searchDocuments([introduction], '   ').length, 0);
  assert.equal(highlightText('Xác minh tên miền', 'xac minh').filter(part => part.match).map(part => part.text).join(''), 'Xác minh');
});
test('syntax tokens preserve every byte and never interpret markup', () => {
  for (const language of ['typescript', 'javascript', 'html', 'csharp', 'bash', 'json', 'http'] as const) {
    const code = 'const value = "<script>&\\n"; // comment\n42';
    assert.equal(highlightCode(code, language).map(token => token.text).join(''), code);
    assert.ok(highlightCode(code, language).some(token => token.kind !== 'plain'));
  }
});

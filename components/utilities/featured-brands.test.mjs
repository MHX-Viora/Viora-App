import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const require = createRequire(import.meta.url), ts = require('typescript');
const mod = new Module('brand-validation');
mod._compile(ts.transpileModule(readFileSync('types/featured-brand.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, 'brand-validation');
const { parseFeaturedBrands } = mod.exports;
const brand = { id: 'one', name: 'Brand', logoUrl: 'https://images.example.test/logo.png', sortOrder: 1 };
test('brand feed rejects malformed, duplicate and unsafe logos', () => {
  assert.deepEqual(parseFeaturedBrands({ items: [brand] }), []);
  assert.equal(parseFeaturedBrands([null, {}, brand, brand]).length, 1);
  for (const logoUrl of ['javascript:alert(1)', '//evil.test/logo.png', 'http://example.test/logo.png', 'https://user:pass@example.test/logo.png', 'https://example.test/ bad.png'])
    assert.deepEqual(parseFeaturedBrands([{ ...brand, logoUrl }]), []);
  assert.deepEqual(parseFeaturedBrands([{ ...brand, name: ' ' }, { ...brand, sortOrder: -1 }]), []);
});
test('brand feed preserves names for accessibility and follows sort order', () => {
  const values = parseFeaturedBrands([brand, { ...brand, id: 'two', name: '<script>Logo</script>', sortOrder: 0 }]);
  assert.deepEqual(values.map(item => item.id), ['two', 'one']);
  assert.equal(values[0].name, '<script>Logo</script>');
});

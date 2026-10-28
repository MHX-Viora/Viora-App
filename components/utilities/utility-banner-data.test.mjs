import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const require = createRequire(import.meta.url), ts = require('typescript');
const mod = new Module('banner-validation');
mod._compile(ts.transpileModule(readFileSync('types/utility-banner.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, 'banner-validation');
const { parseUtilityBanners, safeBannerTarget } = mod.exports;
const slide = { id: 'one', title: 'First', imageUrl: 'https://images.example.test/banner.png', targetUrl: '/wallet', sortOrder: 1 };
test('rejects malformed feed, duplicate ids and unsafe links', () => {
  assert.deepEqual(parseUtilityBanners({ items: [slide] }), []);
  assert.equal(parseUtilityBanners([null, {}, slide, slide, { ...slide, id: 'bad', imageUrl: 'javascript:alert(1)' }]).length, 1);
  for (const target of ['//evil.test', '/\\evil.test', '/%2f%2fevil.test', 'javascript:alert(1)', 'https://user:pass@example.test', 'http://example.test']) assert.equal(safeBannerTarget(target), false, target);
  assert.equal(safeBannerTarget('/wallet'), true);
  assert.equal(safeBannerTarget('https://example.test/promo'), true);
});
test('sorts valid slides and limits the carousel to twenty', () => {
  const values = Array.from({ length: 25 }, (_, i) => ({ ...slide, id: String(i), sortOrder: 25 - i }));
  const parsed = parseUtilityBanners(values);
  assert.equal(parsed.length, 20);
  assert.ok(parsed.every((item, i) => !i || item.sortOrder >= parsed[i - 1].sortOrder));
});

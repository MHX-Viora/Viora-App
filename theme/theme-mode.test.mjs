import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const directory = path.dirname(fileURLToPath(import.meta.url));
function load(name) {
  const filename = path.join(directory, name + '.ts'); const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: 1, target: 9 } }).outputText;
  new Function('module', 'exports', 'require', source)(module, module.exports, name => name.startsWith('.') && existsSync(path.join(directory, name + '.ts')) ? load(name) : require(name));
  return module.exports;
}
test('theme choices expose Light and Ocean without the retired Modern Dark option', () => {
  assert.deepEqual(load('theme-mode').THEME_MODES.slice().sort(), ['classic', 'premium-ocean']);
  assert.deepEqual(load('theme-catalog').themeCatalog.map(option => option.id), ['classic', 'premium-ocean']);
});
test('saved Modern Dark preferences safely fall back to Light', () => {
  const { normalizeThemeMode } = load('theme-mode');
  assert.equal(normalizeThemeMode('modern'), 'classic');
  for (const value of ['classic', 'premium-ocean']) assert.equal(normalizeThemeMode(value), value);
});

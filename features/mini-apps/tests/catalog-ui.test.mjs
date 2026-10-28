import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url), React = require('react'), native = require('react-native-web');
const { renderToStaticMarkup } = require('react-dom/server'), ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
function compile(filename, overrides, cache = new Map()) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = new Module(filename); module.filename = filename; module.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, module);
  module.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
      const candidate = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(existsSync);
      if (candidate) return compile(candidate, overrides, cache);
    }
    return require(name);
  };
  module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return module.exports;
}
function render({ loading = false, state, logoFailed = false } = {}) {
  const controls = [], opened = [];
  const overrides = {
    react: { ...React, useState: initial => React.useState(initial === 0 ? 375 : initial === false ? logoFailed : initial) },
    'react-native': { ...native, useWindowDimensions: () => ({ width: 375, height: 800, scale: 1, fontScale: 1 }),
      Pressable: props => { controls.push(props); return React.createElement(native.Pressable, props); } },
    '@/theme': { spacing: { sm: 8, md: 12, lg: 16, xl: 24 }, useTheme: () => ({ theme: { colors: { text: '#111', textMuted: '#555', card: '#fff', primary: '#135bc0', primarySoft: '#eee', borderSubtle: '#ddd', secondaryBackground: '#eee' } } }) },
    '@react-navigation/native': { useFocusEffect: () => {} },
    '@/features/mini-apps/lib/catalog-state': { MiniAppCatalogState: class {
      subscribe = () => () => {}; snapshot = () => state;
    } },
    '@/services/mini-app.service': { miniAppCatalog: {} },
  };
  const item = { id: 'app_' + 'a'.repeat(43), name: '<script>alert(1)</script>', logoUrl: logoFailed ? 'https://partner.example/logo.png' : null };
  const file = state ? 'mini-app-section' : 'mini-app-grid';
  const components = compile(path.join(root, 'components/mini-apps/' + file + '.tsx'), overrides);
  const Component = state ? components.MiniAppSection : components.MiniAppGrid;
  return { html: renderToStaticMarkup(React.createElement(Component, { items: [item], loading, onOpen: id => opened.push(id) })), controls, opened };
}
test('actual grid escapes partner names, uses accessible controls and sends only app ID on press', () => {
  const result = render();
  assert.ok(!result.html.includes('<script>')); assert.ok(result.html.includes('&lt;script&gt;'));
  const button = result.controls.find(x => x.accessibilityLabel?.startsWith('Mở '));
  assert.equal(button.accessibilityRole, 'button'); button.onPress();
  assert.deepEqual(result.opened, ['app_' + 'a'.repeat(43)]);
});
test('skeleton has no actionable app; failed logo renders local fallback', () => {
  assert.equal(render({ loading: true }).controls.length, 0);
  assert.equal(render({ logoFailed: true }).html.includes('partner.example/logo.png'), false);
});
test('actual section presents empty, error/retry and load-more independently', () => {
  const base = { items: [], page: 1, total: 0, loading: false, error: null };
  assert.match(render({ state: base }).html, /Chưa có Mini App khả dụng/);
  const failure = render({ state: { ...base, error: 'Không thể tải Mini App.' } });
  assert.match(failure.html, /Không thể tải Mini App/); assert.match(failure.html, /Thử lại/);
  assert.match(render({ state: { ...base, total: 30 } }).html, /Xem thêm/);
});

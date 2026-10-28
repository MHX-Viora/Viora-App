import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { createServer } from 'node:http';
import { openDocsBrowser } from '../developer/docs/tests/browser-fixture.mjs';

const require = createRequire(import.meta.url), React = require('react'), native = require('react-native-web');
const ts = require('typescript'), { renderToStaticMarkup } = require('react-dom/server');
const root = process.cwd();
function compile(filename, overrides = {}, expose = '') {
  const mod = new Module(filename); mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('.')) {
      const file = path.resolve(path.dirname(filename), name) + '.ts';
      if (existsSync(file)) return compile(file, overrides);
    }
    if (name.startsWith('@/') || name.startsWith('expo-') || name === '@react-navigation/native') return {};
    return require(name);
  };
  mod._compile(ts.transpileModule(readFileSync(filename, 'utf8') + expose, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const { classicTheme } = compile(path.join(root, 'theme/classic.ts'));
const { premiumOceanTheme } = compile(path.join(root, 'theme/premium-ocean.ts'));
function render(theme, overlay = false) {
  const controls = [], texts = [], icons = [], calls = [], views = [];
  const overrides = {
    react: React,
    'react-native': { ...native,
      View: props => { views.push(props); return React.createElement(native.View, props); },
      Pressable: props => { controls.push(props); return React.createElement(native.Pressable, props); },
      Text: props => { texts.push(props); return React.createElement(native.Text, props); },
    },
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, layout: {}, useTheme: () => ({ theme }) },
    '@expo/vector-icons/Ionicons': props => { icons.push(props); return React.createElement('svg', { width: props.size, height: props.size, fill: props.color }); },
  };
  // Expose private presentational helpers without altering production exports.
  const { EmptyReels, createStyles } = compile(path.join(root, 'features/reels/reels-screen.tsx'), overrides, '\nexport { EmptyReels, createStyles };');
  const { ReelsHeader } = compile(path.join(root, 'components/reels/reels-header.tsx'), overrides);
  const styles = createStyles(theme.colors);
  const html = renderToStaticMarkup(React.createElement(native.View, { style: [styles.page, { height: 600, position: 'relative' }] },
    React.createElement(EmptyReels, { sort: 'friends', message: '' }),
    React.createElement(ReelsHeader, { activeSort: 'friends', height: 64, paddingTop: 8,
      overlay, top: 50,
      onCreatePress: () => calls.push('create'), onSearchPress: () => calls.push('search'), onSortChange: value => calls.push(value) })));
  return { html, styles, controls, texts, icons, calls, views };
}

test('reels page and empty state follow Light and Ocean while video canvas retains contrast', () => {
  for (const theme of [classicTheme, premiumOceanTheme]) {
    const result = render(theme);
    assert.equal(result.styles.page.backgroundColor, theme.colors.background);
    assert.equal(result.styles.container.backgroundColor, theme.colors.background);
    assert.equal(result.styles.centerTitle.color, theme.colors.text);
    assert.equal(result.styles.centerText.color, theme.colors.textMuted);
    assert.equal(result.icons.find(icon => icon.name === 'videocam-outline').color, theme.colors.textMuted);
    for (const name of ['add', 'search']) assert.equal(result.icons.find(icon => icon.name === name).color, theme.colors.text);
    assert.notEqual(classicTheme.reels.background, classicTheme.colors.background);
    assert.equal(classicTheme.reels.text, '#FFFFFF');
  }
});
test('theme change preserves create, sorting and search callbacks', () => {
  const result = render(classicTheme);
  for (const control of result.controls) control.onPress();
  assert.deepEqual(result.calls, ['create', 'friends', 'following', 'popular', 'search']);
});

test('playing reels use a transparent navigation overlay with contrasting controls', () => {
  for (const theme of [classicTheme, premiumOceanTheme]) {
    const result = render(theme, true);
    const header = result.views.map(view => native.StyleSheet.flatten(view.style)).find(style => style?.top === 50);
    assert.equal(header.backgroundColor, 'transparent');
    for (const name of ['add', 'search']) assert.equal(result.icons.find(icon => icon.name === name).color, theme.reels.text);
    assert.match(result.html, /top:50px/);
  }
});

test('mobile reels navigation has no extra top padding', () => {
  const { getReelsOverlayLayout } = compile(path.join(root, 'components/layout/responsive-layout.ts'));
  for (const isCompactWeb of [false, true]) {
    const layout = getReelsOverlayLayout({ isDesktopWeb: false, isCompactWeb });
    assert.equal(layout.headerPaddingTop, 0);
    assert.equal(layout.headerHeight, 56);
  }
});

function renderSearch(theme) {
  const calls = [];
  const overrides = {
    react: React,
    'react-native': { ...native, Modal: props => props.visible ? props.children : null },
    'react-native-safe-area-context': { SafeAreaView: native.View },
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, useTheme: () => ({ theme }) },
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: true }) },
    '@/components/layout/responsive-layout': compile(path.join(root, 'components/layout/responsive-layout.ts')),
    '@expo/vector-icons/Ionicons': () => null,
  };
  const { ReelsSearchModal, createStyles } = compile(path.join(root, 'components/reels/reels-search-modal.tsx'), overrides, '\nexport { createStyles };');
  const feed = compile(path.join(root, 'components/feed/feed-search-modal.tsx'), overrides, '\nexport { createStyles };');
  const html = renderToStaticMarkup(React.createElement(ReelsSearchModal, {
    visible: true, onClose: () => calls.push('close'), onSearch: async () => [],
  }));
  return { html, styles: createStyles(theme.colors), feedStyles: feed.createStyles(theme.colors) };
}

test('video search uses the community search palette and readable input in both themes', () => {
  for (const theme of [classicTheme, premiumOceanTheme]) {
    const result = renderSearch(theme);
    for (const key of ['screen', 'modalRoot', 'desktopScreen', 'header', 'searchBox', 'input', 'emptyText', 'emptyTitle'])
      assert.deepEqual(result.styles[key], result.feedStyles[key], key);
    assert.equal(result.styles.header.backgroundColor, theme.colors.surface);
    assert.equal(result.styles.floatingInput.color, theme.colors.text);
    assert.match(result.html, /Tìm kiếm video ngắn/);
  }
});

if (process.argv.includes('--browser')) {
  test('browser follows Light and Ocean palettes', async () => {
  const server = createServer((req, res) => {
    const theme = req.url.includes('dark') ? premiumOceanTheme : classicTheme;
    const result = req.url.includes('search') ? renderSearch(theme) : render(theme);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><style>${native.StyleSheet.getSheet().textContent}body{margin:0}</style>${result.html}`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); let browser;
  try {
    browser = await openDocsBrowser();
    for (const [query, expected] of [['', 'rgb(241, 243, 245)'], ['?dark', 'rgb(6, 24, 42)']]) {
      await browser.rpc('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/${query}` });
      await browser.wait(`document.body.firstElementChild && getComputedStyle(document.body.firstElementChild).backgroundColor==='${expected}'`);
      const headerColor = await browser.read(`getComputedStyle(document.querySelector('[aria-label="Tìm kiếm reels"] svg')).fill`);
      assert.notEqual(headerColor, 'rgb(255, 255, 255)');
      if (!query) { const shot = await browser.rpc('Page.captureScreenshot', { format: 'png' }); await writeFile('.codex-tmp/reels-light-theme.png', Buffer.from(shot.data, 'base64')); }
    }
    await browser.rpc('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/?search` });
    await browser.wait(`!!document.querySelector('[aria-label="Tìm kiếm video ngắn"]')`);
    const search = await browser.read(`(()=>{const input=document.querySelector('[aria-label="Tìm kiếm video ngắn"]');const box=input.parentElement;const header=box.parentElement;const screen=header.parentElement;return{input:getComputedStyle(input).color,header:getComputedStyle(header).backgroundColor,screen:getComputedStyle(screen).backgroundColor,width:screen.getBoundingClientRect().width}})()`);
    assert.equal(search.header, 'rgb(255, 255, 255)');
    assert.equal(search.screen, 'rgb(241, 243, 245)');
    assert.equal(search.input, 'rgb(28, 30, 33)');
    assert.ok(search.width <= 960);
    const searchShot = await browser.rpc('Page.captureScreenshot', { format: 'png' });
    await writeFile('.codex-tmp/reels-search-light-theme.png', Buffer.from(searchShot.data, 'base64'));
    assert.deepEqual(browser.issues, []);
    console.log('PASS browser: Light and Ocean reels page backgrounds and readable controls.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
  });
}

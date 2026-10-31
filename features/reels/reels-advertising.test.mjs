import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const React = require('react');
const native = require('react-native-web');
const ts = require('typescript');

test('personal account can open the reel advertising form without article publishing permission', () => {
  const navigations = [];
  const reel = { id: 'my-video', isMine: true };
  const noop = () => {};
  const overrides = {
    react: { ...React, useState: value => [value === true ? false : value === 0 ? 600 : typeof value === 'function' ? value() : value, noop],
      useEffect: noop, useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn },
    'react-native': native,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
    'expo-router': { router: { push: value => navigations.push(value) } },
    '@react-navigation/native': { useIsFocused: () => true, useNavigation: () => ({}) },
    '@/stores/session-store': { getSession: async () => ({ user: { accountStyle: 0 } }) },
    '@/types/account-style': { canCreateArticle: () => false },
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: false, isWeb: true }) },
    '@/features/reels/data': { reels: [reel] },
    '@/theme': { useTheme: () => ({ theme: { colors: { visuals: {} } } }), layout: {}, spacing: {} },
    '@/components/layout/responsive-layout': {
      getReelsOverlayLayout: () => ({}), getFixedTopBarLayout: () => ({}),
      getResponsiveContentLayout: () => ({}), getReelContentWidth: () => 375,
    },
    '@/components/layout/tab-bar-style': { createFloatingTabBarStyle: () => ({}), TAB_BAR_BOTTOM: 0, TAB_BAR_HEIGHT: 0 },
  };
  const filename = path.resolve('features/reels/reels-screen.tsx');
  const mod = new Module(filename);
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('@/')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : String(key) });
    if (name.startsWith('expo-') || name.startsWith('@expo/')) return {};
    return require(name);
  };
  mod._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  const findList = node => {
    if (!node || typeof node !== 'object') return null;
    if (node.props?.renderItem) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const found = findList(child);
      if (found) return found;
    }
    return null;
  };
  const list = findList(mod.exports.ReelsScreen());
  assert.ok(list, 'reels list renders');
  const card = list.props.renderItem({ index: 0, item: reel });
  assert.equal(typeof card.props.onAdvertise, 'function', 'personal accounts retain the advertising entry point');
  card.props.onAdvertise(reel);
  assert.deepEqual(navigations, [{ pathname: '/advertise/[postId]', params: { postId: 'my-video', postType: '1' } }]);
});

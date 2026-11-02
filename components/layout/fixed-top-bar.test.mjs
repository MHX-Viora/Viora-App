import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript');
const native = require('react-native-web');

function compile(relativePath, overrides = {}) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const module = new Module(filename); module.filename = filename;
  module.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name);
  module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return module.exports;
}

test('native header background is separate, noninteractive, and only tabs receive safe-area space', () => {
  const layouts = compile('./responsive-layout.ts');
  for (const top of [0, 24, 44, 59]) {
    const overrides = {
      react: { useMemo: callback => callback() },
      'react-native': { ...native, Platform: { OS: 'android' }, View: 'View', Pressable: 'Pressable' },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top, bottom: 0, left: 0, right: 0 }) },
      '@/components/layout/responsive-layout': layouts,
      '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: false, isWeb: false, isLargeDesktop: false, width: 390 }) },
      '@/theme': { useTheme: () => ({ theme: { colors: { background: '#fff' }, isDark: false } }), spacing: { sm: 8, md: 12 }, layout: { feedMaxWidth: 700, pageGutter: 16 } },
      '@expo/vector-icons/Ionicons': { __esModule: true, default: () => null },
    };
    const { FixedTopBar } = compile('./fixed-top-bar.tsx', overrides);
    const { FeedCategoryHeader } = compile('../feed/feed-category-header.tsx', overrides);
    const { ProfileHeader } = compile('../profile/profile-header.tsx', overrides);
    const calls = [];
    const tabs = FeedCategoryHeader({ activeCategory: 'community', onCommunityPress: () => calls.push('community'),
      onReelsPress: () => calls.push('reels'), onArticlesPress: () => calls.push('articles'), onLivePress: () => calls.push('live') });
    const header = FixedTopBar({ categoryOnly: true, children: tabs });
    const frame = native.StyleSheet.flatten(header.props.style);
    const profile = ProfileHeader({ onOpenFriends() {}, onOpenQr() {}, onOpenSettings() {} });
    const profileStyle = native.StyleSheet.flatten(profile.props.style);
    assert.equal(frame.height, profileStyle.paddingTop + 40 + profileStyle.paddingBottom + 2 * profileStyle.borderWidth - 4);
    const [background, content] = header.props.children;
    const fill = native.StyleSheet.flatten(background.props.style);
    const row = native.StyleSheet.flatten(content.props.style);
    assert.equal(frame.top, 0);
    assert.equal(frame.paddingTop, 0);
    assert.equal(background.props.pointerEvents, 'none');
    assert.equal(fill.top + fill.height, frame.height);
    assert.ok(fill.top <= 0);
    assert.equal(row.height, frame.height);
    assert.equal(row.paddingTop, top);
    assert.equal(row.paddingBottom, 8);
    for (const button of content.props.children) {
      const buttonStyle = native.StyleSheet.flatten(button.props.style({ pressed: false }));
      assert.equal(buttonStyle.paddingTop, 0);
      assert.equal(buttonStyle.height, 40);
      assert.deepEqual(native.StyleSheet.flatten(button.props.children[0].props.style).transform, []);
      button.props.onPress();
    }
    assert.deepEqual(calls, ['community', 'reels', 'articles', 'live']);
  }
});

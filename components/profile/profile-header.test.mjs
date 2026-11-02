import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript');
const native = require('react-native-web');

function header(platform, top) {
  const filename = fileURLToPath(new URL('./profile-header.tsx', import.meta.url));
  const overrides = {
    react: { useMemo: callback => callback() },
    'react-native': { ...native, Platform: { OS: platform }, View: 'View', Pressable: 'Pressable' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top, bottom: 0, left: 0, right: 0 }) },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: () => null },
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12 }, useTheme: () => ({ theme: { colors: {} } }) },
  };
  const module = new Module(filename); module.filename = filename;
  module.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name);
  module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  const calls = [];
  const element = module.exports.ProfileHeader({ onOpenFriends: () => calls.push('friends'),
    onOpenQr: () => calls.push('qr'), onOpenSettings: () => calls.push('settings') });
  return { element, style: native.StyleSheet.flatten(element.props.style), calls };
}

test('native profile header clears each status bar with exactly 4px extra space', () => {
  for (const platform of ['android', 'ios']) {
    for (const top of [0, 24, 44, 59]) {
      const result = header(platform, top);
      assert.equal(result.style.paddingTop, top + 4);
      assert.equal(result.style.paddingBottom, 8);
      const [leftActions, settings] = result.element.props.children;
      for (const button of [...leftActions.props.children, settings]) {
        assert.equal(native.StyleSheet.flatten(button.props.style).height, 40);
        button.props.onPress();
      }
      assert.deepEqual(result.calls, ['friends', 'qr', 'settings']);
    }
  }
});

test('web profile header keeps its existing spacing', () => {
  assert.equal(header('web', 59).style.paddingTop, 8);
});

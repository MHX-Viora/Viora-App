import assert from 'node:assert/strict';
import test from 'node:test';
import Module, { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript'), native = require('react-native-web');

test('native reels sorting row starts 7px below the shared category header in both overlay modes', () => {
  for (const platform of ['android', 'ios']) {
    for (const overlay of [false, true]) {
      const filename = fileURLToPath(new URL('./reels-header.tsx', import.meta.url));
      const overrides = {
        react: { useMemo: callback => callback() },
        'react-native': { ...native, Platform: { OS: platform }, View: 'View', Pressable: 'Pressable', Text: 'Text' },
        '@expo/vector-icons/Ionicons': { __esModule: true, default: () => null },
        '@/theme': { spacing: { sm: 8, md: 12 }, useTheme: () => ({ theme: { colors: {}, reels: {} } }) },
      };
      const module = new Module(filename); module.filename = filename;
      module.require = name => Object.hasOwn(overrides, name) ? overrides[name] : require(name);
      module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
      } }).outputText, filename);
      const calls = [];
      const header = module.exports.ReelsHeader({ top: 80, height: 56, paddingTop: 0, overlay, activeSort: 'friends',
        onCreatePress: () => calls.push('create'), onSearchPress: () => calls.push('search'), onSortChange: value => calls.push(value) });
      const style = native.StyleSheet.flatten(header.props.style);
      assert.equal(style.top, 80);
      assert.equal(style.paddingTop, 7);
      assert.equal(style.justifyContent, 'flex-start');
      const row = header.props.children;
      assert.equal(native.StyleSheet.flatten(row.props.style).alignItems, 'flex-start');
      const [create, tabs, search] = row.props.children;
      assert.equal(native.StyleSheet.flatten(create.props.style({ pressed: false })).marginTop, 0);
      create.props.onPress(); for (const tab of tabs) tab.props.onPress(); search.props.onPress();
      assert.deepEqual(calls, ['create', 'friends', 'following', 'popular', 'search']);
    }
  }
});

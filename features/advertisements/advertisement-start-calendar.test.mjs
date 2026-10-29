import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react'), native = require('react-native-web');
function compile(relative, overrides = {}) {
  const file = path.resolve(relative), mod = new Module(file);
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name);
      const target = [base + '.ts', base + '.tsx'].find(existsSync);
      if (target) return compile(target, overrides);
    }
    return require(name);
  };
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return mod.exports;
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const found = find(child, predicate);
    if (found) return found;
  }
  return null;
}

function hooks(initial = {}) {
  const state = new Map(Object.entries(initial).map(([key, value]) => [Number(key), value]));
  let index = 0;
  return {
    reset: () => { index = 0; },
    react: { ...React, useEffect() {}, useMemo: fn => fn(), useRef: value => ({ current: value }), useState: initialValue => {
      const key = index++;
      if (!state.has(key)) state.set(key, typeof initialValue === 'function' ? initialValue() : initialValue);
      return [state.get(key), next => state.set(key, typeof next === 'function' ? next(state.get(key)) : next)];
    } },
  };
}

const theme = { spacing: { xs: 4, sm: 8, md: 12, lg: 16 }, useTheme: () => ({ theme: { colors: {} } }) };

test('web duration slider supports whole days and clamps values to 1–30', () => {
  const values = [], h = hooks();
  const { AdvertisementDurationSlider } = compile('features/advertisements/advertisement-duration-slider.tsx', {
    react: h.react, 'react-native': native, '@/theme': theme,
  });
  const tree = AdvertisementDurationSlider({ value: 3, onChange: value => values.push(value) });
  const input = find(tree, node => node.type === 'input');
  assert.equal(input.props.type, 'range');
  assert.equal(input.props.min, 1);
  assert.equal(input.props.max, 30);
  assert.equal(input.props.step, 1);
  assert.equal(input.props['aria-valuetext'], '3 ngày');
  for (const value of ['1', '17', '30', '35', '-1']) input.props.onChange({ target: { value } });
  assert.deepEqual(values, [1, 17, 30, 30, 1]);
});

test('native duration slider supports dragging and accessibility adjustments at the limits', () => {
  let handlers;
  const values = [], h = hooks();
  const { AdvertisementDurationSlider } = compile('features/advertisements/advertisement-duration-slider.tsx', {
    react: h.react, '@/theme': theme,
    'react-native': { ...native, Platform: { OS: 'android' }, PanResponder: { create: config => { handlers = config; return { panHandlers: {} }; } } },
  });
  const tree = AdvertisementDurationSlider({ value: 30, onChange: value => values.push(value) });
  const slider = find(tree, node => node.props?.accessibilityRole === 'adjustable');
  slider.props.onLayout({ nativeEvent: { layout: { width: 314 } } });
  handlers.onPanResponderGrant({ nativeEvent: { locationX: 12 } });
  handlers.onPanResponderMove({}, { dx: 290 });
  handlers.onPanResponderMove({}, { dx: 500 });
  handlers.onPanResponderMove({}, { dx: -50 });
  slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
  assert.deepEqual(values, [1, 30, 30, 1, 30, 29]);
});

test('calendar opens, disables past dates and previous month, navigates and selects a future date', () => {
  const RealDate = Date;
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [2026, 9, 29, 12])); } };
  try {
    const selected = [], h = hooks();
    const { AdvertisementStartCalendar } = compile('features/advertisements/advertisement-start-calendar.tsx', { react: h.react, 'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' }, '@/theme': theme });
    const render = () => { h.reset(); return AdvertisementStartCalendar({ value: '2026-10-29', onChange: value => selected.push(value) }); };
    let tree = render();
    find(tree, node => node.props?.accessibilityState?.expanded === false).props.onPress();
    tree = render();
    assert.equal(find(tree, node => node.props?.accessibilityLabel === 'Tháng trước').props.disabled, true);
    const past = find(tree, node => node.props?.accessibilityLabel === 'Ngày 28/10/2026');
    assert.equal(past.props.disabled, true);
    past.props.onPress();
    assert.deepEqual(selected, []);
    find(tree, node => node.props?.accessibilityLabel === 'Tháng sau').props.onPress();
    tree = render();
    find(tree, node => node.props?.accessibilityLabel === 'Ngày 3/11/2026').props.onPress();
    assert.deepEqual(selected, ['2026-11-03']);
    tree = render();
    assert.ok(find(tree, node => node.props?.accessibilityState?.expanded === false));
  } finally { globalThis.Date = RealDate; }
});

for (const postType of ['0', '1']) {
  test(`shared advertisement form submits calendar date and rejects yesterday for postType ${postType}`, async () => {
    const { localDateKey, addLocalDays } = compile('features/advertisements/advertisement-schedule.ts');
    const future = addLocalDays(localDateKey(new Date()), 10);
    for (const value of [future, addLocalDays(localDateKey(new Date()), -1)]) {
      const requests = [], messages = [];
      const h = hooks({ 0: postType === '0' ? { id: 'content' } : null, 1: postType === '1' ? { id: 'content' } : null, 2: 3000000, 3: false, 11: value, 13: { width: 1200, height: 900 } });
      const { CreateAdvertisementScreen } = compile('features/advertisements/create-advertisement-screen.tsx', {
        react: h.react, 'react-native': native, '@expo/vector-icons': { Ionicons: 'Icon' }, '@/theme': theme,
        'expo-router': { useLocalSearchParams: () => ({ postId: 'content', postType }), router: { replace() {} } },
        'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
        '@/components/feed/post-card': { PostCard: 'PostCard' },
        './post-advertisement-preview': { createPostAdvertisementPreview: post => post },
        './reel-advertisement-preview': { ReelAdvertisementPreview: 'ReelPreview' },
        './advertisement-start-calendar': { AdvertisementStartCalendar: 'StartCalendar' },
        './advertisement-duration-slider': { AdvertisementDurationSlider: 'DurationSlider' },
        '@/components/common/app-toast': { showAppToast: message => messages.push(message) },
        '@/services/feed.service': {}, '@/services/reel.service': {}, '@/services/wallet.service': {},
        '@/services/advertisement.service': { AdvertisementRequestError: Error, createAdvertisement: async input => { requests.push(input); return { id: 'campaign' }; }, submitAdvertisement: async () => ({ id: 'campaign' }) },
      });
      h.reset();
      let tree = CreateAdvertisementScreen();
      const slider = find(tree, node => node.type === 'DurationSlider');
      assert.equal(slider.props.value, 3);
      slider.props.onChange(30);
      h.reset();
      tree = CreateAdvertisementScreen();
      assert.equal(find(tree, node => node.type === 'DurationSlider').props.value, 30);
      assert.equal(find(tree, node => node.props?.title === '??i t??ng'), null);
      assert.equal(find(tree, node => node.type === 'StartCalendar').props.value, value);
      const submit = find(tree, node => node.props?.accessibilityRole === 'button' && typeof node.props?.disabled === 'boolean' && node.props?.children?.props?.children?.[0]?.startsWith?.('Thanh toán'));
      assert.ok(submit);
      submit.props.onPress();
      await new Promise(resolve => setImmediate(resolve));
      if (value === future) {
        assert.equal(requests.length, 1);
        assert.equal(localDateKey(new Date(requests[0].startAt)), future);
        assert.equal(new Date(requests[0].startAt).getHours(), 0);
        assert.equal(new Date(requests[0].endAt) - new Date(requests[0].startAt), 30 * 86400000);
        assert.equal(requests[0].totalBudget, 1500000);
        assert.equal(requests[0].targetingMode, 0);
        assert.equal(requests[0].minimumAge, undefined);
        assert.equal(requests[0].maximumAge, undefined);
      } else {
        assert.equal(requests.length, 0);
        assert.match(messages[0].message, /hôm nay/);
      }
    }
  });
}

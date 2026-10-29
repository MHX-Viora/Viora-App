import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { compile } from './article-access.test.mjs';
const require = createRequire(import.meta.url), React = require('react'), native = require('react-native-web');

const tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) { const value = find(child, predicate); if (value) return value; }
  return null;
}
const byText = (tree, text) => find(tree, node => typeof node.props?.onPress === 'function' && React.Children.toArray(node.props.children).some(child => child.props?.children === text));

function editor({ width = 375, editing = false, fail = false } = {}) {
  let cursor = 0;
  const state = [], effects = [], requests = [], routes = [];
  const { ArticleEditorScreen } = compile('features/article/article-editor-screen.tsx', {
    react: { ...React, useEffect: fn => effects.push(fn), useMemo: fn => fn(),
      useState: initial => { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
      useRef: initial => { const index = cursor++; state[index] ??= { current: initial }; return state[index]; } },
    'react-native': { ...native, useWindowDimensions: () => ({ width, height: 900 }), Keyboard: { dismiss() {} } },
    'expo-router': { useLocalSearchParams: () => editing ? { id: 'existing' } : {}, router: { canGoBack: () => false, replace: value => routes.push(value) } },
    'expo-image-picker': {}, '@expo/vector-icons/Ionicons': 'Icon',
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    './article-block-list': { __esModule: true, default: 'BlockList', ScaleDecorator: React.Fragment },
    './article-block-drag-handle': { ArticleBlockDragHandle: 'Grip' },
    './article-block-text-input': { ArticleBlockTextInput: 'BlockInput' },
    '@/components/common/hashtag-picker': { HashtagPicker: 'Picker' },
    '@/components/article/article-renderer': { ArticleBlockView: 'Block' },
    '@/components/layout/responsive-layout': { getResponsiveContentLayout: () => ({}) },
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: width >= 1024 }) },
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, layout: {}, useTheme: () => ({ theme: { colors: {} } }) },
    '@/services/article.service': {
      getArticle: async () => ({ title: 'Existing report', blocks: [{ id: 'block', type: 0, content: 'Body', orderIndex: 0 }], hashtags: [{ id: 'topic', name: 'congnghe' }] }),
      createArticle: async payload => { requests.push(payload); if (fail) throw Error('Save failed'); return { id: 'saved' }; },
      updateArticle: async (id, payload) => { requests.push({ ...payload, id }); if (fail) throw Error('Save failed'); return { id }; },
    },
  });
  const render = () => { cursor = 0; return ArticleEditorScreen(); };
  return { render, requests, routes, ready: async () => {
    let tree = render();
    if (editing) { effects[0](); await tick(); return; }
    const initialList = find(tree, node => node.type === 'BlockList');
    find(initialList.props.ListHeaderComponent, node => node.props?.accessibilityLabel === 'Tiêu đề').props.onChangeText('New report');
    const toolbar = find(tree, node => node.props?.horizontal === true && node.props?.renderItem);
    toolbar.props.renderItem({ item: [0, 'Text', 'text-outline'] }).props.onPress();
    tree = render();
    const list = find(tree, node => node.type === 'BlockList');
    const block = list.props.renderItem({ item: list.props.data[0], getIndex: () => 0, drag() {}, isActive: false });
    find(block, node => node.type === 'BlockInput').props.onChangeText('Full report body');
  } };
}

test('topic selection reuses normalized existing names and commits pending text once', () => {
  const { mergePendingHashtags } = compile('utils/hashtag-selection.ts');
  const existing = { id: 'known', name: 'CongNghe', postCount: 5 };
  assert.deepEqual(mergePendingHashtags([existing], '##congnghe'), [{ ...existing, name: 'congnghe' }]);
  assert.deepEqual(mergePendingHashtags([existing], '#Giáo dục').map(tag => tag.name), ['congnghe', 'giáodục']);
  assert.deepEqual(mergePendingHashtags([], '### '), []);
});

test('mobile publish opens topics without saving, then publishes selected topics and retains content', async () => {
  const h = editor(); await h.ready();
  byText(h.render(), 'Đăng').props.onPress(); await tick();
  assert.equal(h.requests.length, 0);
  assert.ok(find(h.render(), node => node.props?.visible === true));
  const picker = find(h.render(), node => node.type === 'Picker');
  picker.props.onChange([{ id: 'existing-tag', name: 'congnghe', postCount: 5 }]);
  byText(h.render(), 'Đăng bài').props.onPress(); await tick();
  assert.deepEqual(h.requests[0].hashtags, ['congnghe']);
  assert.equal(h.requests[0].blocks[0].content, 'Full report body');
  assert.equal(h.requests[0].blocks[0].clientKey, undefined);
  assert.equal(h.routes[0].params.id, 'saved');
});

test('wide editor uses a side panel and automatically commits a typed topic on publish', async () => {
  const h = editor({ width: 1440 }); await h.ready();
  assert.ok(find(h.render(), node => node.props?.accessibilityLabel === 'Chủ đề bài báo'));
  find(h.render(), node => node.type === 'Picker').props.onQueryChange('#KhoaHoc');
  byText(h.render(), 'Đăng').props.onPress(); await tick();
  assert.deepEqual(h.requests[0].hashtags, ['khoahoc']);
  assert.equal(find(h.render(), node => node.props?.visible === true), null);
});

test('editing loads saved topics and a failed publish keeps topics and body for retry', async () => {
  const h = editor({ editing: true, fail: true }); await h.ready();
  assert.equal(find(h.render(), node => node.type === 'Picker').props.selected[0].name, 'congnghe');
  byText(h.render(), 'Đăng').props.onPress(); await tick();
  assert.equal(h.requests[0].id, 'existing');
  assert.deepEqual(h.requests[0].hashtags, ['congnghe']);
  assert.equal(find(h.render(), node => node.type === 'Picker').props.selected[0].name, 'congnghe');
  const list = find(h.render(), node => node.type === 'BlockList');
  assert.equal(list.props.data[0].content, 'Body');
  assert.equal(h.routes.length, 0);
});

test('closing the mobile topic prompt keeps the draft and selection for reopening', async () => {
  const h = editor(); await h.ready();
  byText(h.render(), 'Đăng').props.onPress(); await tick();
  find(h.render(), node => node.type === 'Picker').props.onChange([
    { id: 'existing-tag', name: 'giaoduc', postCount: 8 },
  ]);
  find(h.render(), node => node.props?.accessibilityLabel === 'Đóng chủ đề').props.onPress();
  assert.equal(find(h.render(), node => node.props?.visible === true), null);
  assert.equal(h.requests.length, 0);
  find(h.render(), node => node.props?.accessibilityLabel === 'Chủ đề bài báo, 1 đã chọn').props.onPress();
  assert.equal(find(h.render(), node => node.type === 'Picker').props.selected[0].name, 'giaoduc');
  byText(h.render(), 'Đăng bài').props.onPress(); await tick();
  assert.deepEqual(h.requests[0].hashtags, ['giaoduc']);
  assert.equal(h.requests[0].title, 'New report');
  assert.equal(h.requests[0].blocks[0].content, 'Full report body');
});

test('repeated publish presses submit the article with topics only once', async () => {
  const h = editor(); await h.ready();
  byText(h.render(), 'Đăng').props.onPress(); await tick();
  find(h.render(), node => node.type === 'Picker').props.onQueryChange('#CongNghe');
  const submit = byText(h.render(), 'Đăng bài').props.onPress;
  submit(); submit(); submit(); await tick();
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.requests[0].hashtags, ['congnghe']);
  assert.equal(h.routes.length, 1);
});

test('a failed mobile publish keeps the topic prompt open for retry', async () => {
  const h = editor({ fail: true }); await h.ready();
  byText(h.render(), 'Đăng').props.onPress(); await tick();
  find(h.render(), node => node.type === 'Picker').props.onQueryChange('#GiaoDuc');
  byText(h.render(), 'Đăng bài').props.onPress(); await tick();
  assert.ok(find(h.render(), node => node.props?.visible === true));
  assert.equal(find(h.render(), node => node.type === 'Picker').props.selected[0].name, 'giaoduc');
  assert.ok(find(h.render(), node => node.props?.accessibilityRole === 'alert' && node.props.children === 'Save failed'));
  byText(h.render(), 'Đăng bài').props.onPress(); await tick();
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.requests[1], h.requests[0]);
  assert.equal(h.routes.length, 0);
});

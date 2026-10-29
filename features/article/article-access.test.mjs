import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url), ts = require('typescript');
export function compile(relative, overrides = {}) {
  const file = path.resolve(relative), mod = new Module(file);
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name);
      const target = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(existsSync);
      if (target) return compile(target, overrides);
    }
    return require(name);
  };
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return mod.exports;
}

test('account style refresh handles new grants, revocation and failed requests without changing login tokens', async () => {
  for (const accountStyle of [2, 0, null]) {
    let session = { accessToken: 'existing-token', user: { id: 'owner', accountStyle: accountStyle === 0 ? 2 : 0, displayName: 'Old' } };
    const { refreshCurrentUser } = compile('services/current-user.service.ts', {
      '@/stores/session-store': { getSession: async () => session, updateUser: async user => { session = { ...session, user }; } },
      '@/services/user.service': { getUserProfile: async () => { if (accountStyle === null) throw Error('offline'); return { id: 'owner', accountStyle, displayName: 'Current' }; } },
    });
    const user = await refreshCurrentUser();
    assert.equal(user.accountStyle, accountStyle ?? 0);
    assert.equal(session.user.accountStyle, accountStyle ?? 0);
    assert.equal(session.accessToken, 'existing-token');
  }
});

test('a completed profile request cannot overwrite a switched or signed-out account', async () => {
  for (const current of [{ user: { id: 'new', accountStyle: 0 } }, null]) {
    let calls = 0, writes = 0;
    const { refreshCurrentUser } = compile('services/current-user.service.ts', {
      '@/stores/session-store': { getSession: async () => ++calls === 1 ? { user: { id: 'old' } } : current, updateUser: async () => { writes++; } },
      '@/services/user.service': { getUserProfile: async () => ({ id: 'old', accountStyle: 2 }) },
    });
    assert.equal((await refreshCurrentUser())?.id, current?.user?.id);
    assert.equal(writes, 0);
  }
});

const React = require('react'), native = require('react-native-web');
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}
export function management(accountStyle = 2, failure = false) {
  let cursor = 0, focus;
  const state = [], requests = [], routes = [], deletions = [];
  const post = { id: 'mine', authorId: 'owner', postType: 2, article: { title: 'My report' }, comments: 2, viewCount: 10 };
  const { ArticleManagementScreen } = compile('features/article/article-management-screen.tsx', {
    react: { ...React, useMemo: fn => fn(), useCallback: fn => fn,
      useRef: initial => { const index = cursor++; state[index] ??= { current: initial }; return state[index]; },
      useState: initial => { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; } },
    'react-native': native, '@expo/vector-icons/Ionicons': 'Icon',
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useFocusEffect: fn => { focus = fn; }, router: { push: route => routes.push(route), canGoBack: () => true } },
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, useTheme: () => ({ theme: compile('theme/classic.ts').classicTheme }) },
    '@/components/common/app-toast': { showAppToast() {} },
    '@/services/current-user.service': { refreshCurrentUser: async () => ({ id: 'owner', accountStyle }) },
    '@/services/feed.service': { getPosts: async query => { requests.push(query); if (failure) throw Error('Load failed'); return { posts: [post, { ...post, id: 'foreign', authorId: 'other' }, { ...post, id: 'regular', postType: 0 }], totalPages: 2 }; } },
    '@/services/post.service': { deletePost: async id => deletions.push(id) },
  });
  return { render: () => { cursor = 0; return ArticleManagementScreen(); }, focus: () => focus(), requests, routes, deletions };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const button = (tree, label) => find(tree, node => node.props?.accessibilityRole === 'button' && React.Children.toArray(node.props.children).some(child => child.props?.children === label));

test('journalist management filters ownership, paginates, navigates and requires delete confirmation', async () => {
  const h = management(); h.render(); h.focus(); await tick();
  let tree = h.render();
  const list = find(tree, node => typeof node.props?.renderItem === 'function');
  assert.equal(list.props.data.length, 1);
  assert.equal(h.requests[0].userId, 'owner');
  assert.equal(h.requests[0].postType, 2);
  button(tree, 'Viết bài').props.onPress();
  assert.equal(h.routes[0], '/article/editor');
  const row = list.props.renderItem({ item: list.props.data[0] });
  button(row, 'Chỉnh sửa').props.onPress();
  assert.deepEqual(h.routes[1], { pathname: '/article/editor', params: { id: 'mine' } });
  list.props.onEndReached(); await tick();
  tree = h.render();
  assert.equal(h.requests[1].page, 2);
  assert.equal(find(tree, node => typeof node.props?.renderItem === 'function').props.data.length, 1);
  button(row, 'Xóa').props.onPress();
  assert.deepEqual(h.deletions, []);
  tree = h.render();
  assert.ok(find(tree, node => node.props?.visible === true));
  button(tree, 'Xóa bài báo').props.onPress(); await tick();
  assert.deepEqual(h.deletions, ['mine']);
  assert.equal(find(h.render(), node => typeof node.props?.renderItem === 'function').props.data.length, 0);
});

test('personal accounts cannot load management and load failures expose retry', async () => {
  const denied = management(0); denied.render(); denied.focus(); await tick();
  assert.equal(find(denied.render(), node => typeof node.props?.renderItem === 'function'), null);
  assert.deepEqual(denied.requests, []);
  const failed = management(2, true); failed.render(); failed.focus(); await tick();
  const list = find(failed.render(), node => typeof node.props?.renderItem === 'function');
  assert.ok(find(list.props.ListHeaderComponent, node => node.props?.accessibilityRole === 'alert'));
  button(list.props.ListHeaderComponent, 'Thử lại').props.onPress(); await tick();
  assert.equal(failed.requests.length, 2);
});

export function renderArticleTools(accountStyle) {
  const { renderToStaticMarkup } = require('react-dom/server');
  const theme = compile('theme/classic.ts').classicTheme;
  const allowed = compile('types/account-style.ts').canCreateArticle(accountStyle);
  const noop = () => {};
  const overrides = {
    react: React, 'react-native': native, '@expo/vector-icons/Ionicons': () => null,
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, useTheme: () => ({ theme, mode: 'classic' }), getThemeDefinition: () => ({ name: 'Classic' }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/components/common/user-avatar': { UserAvatar: () => null },
    '@/components/layout/fixed-top-bar': { FixedTopBar: props => React.createElement(native.View, null, props.children) },
    '@/components/feed/feed-category-header': { FeedCategoryHeader: () => null },
    '@/components/landing/desktop-download-promo': { DesktopDownloadPromo: () => null },
    '@/components/profile/theme-mode-sheet': { ThemeModeSheet: () => null },
    '@/components/common/tmi-sponsor': { TmiSponsor: () => null },
    '@/components/pwa/pwa-install-action': { PwaInstallAction: () => null },
    '@/components/common/app-toast': {},
  };
  const { PostComposer } = compile('components/feed/post-composer.tsx', overrides);
  const { ProfileSettingsSheet } = compile('components/profile/profile-settings-sheet.tsx', overrides);
  const composer = renderToStaticMarkup(React.createElement(PostComposer, { activeCategory: 'articles', articleSort: 'recommended', canCreateArticle: allowed }));
  const settings = renderToStaticMarkup(React.createElement(ProfileSettingsSheet, { inline: true, visible: true, onOpenArticles: allowed ? noop : undefined }));
  return { composer, settings };
}

test('journalist sees write and manage entries while personal account sees neither', () => {
  const journalist = renderArticleTools(2), personal = renderArticleTools(0);
  assert.match(journalist.composer, /Viết bài/);
  assert.match(journalist.settings, /Quản lý bài báo/);
  assert.doesNotMatch(personal.composer, /Viết bài/);
  assert.doesNotMatch(personal.settings, /Quản lý bài báo/);
});

test('editor close returns through history or a safe fallback after a direct open', () => {
  for (const [id, hasHistory] of [[undefined, true], [undefined, false], ['article', false]]) {
    const routes = [];
    const { ArticleEditorScreen } = compile('features/article/article-editor-screen.tsx', {
      react: { ...React, useEffect() {}, useMemo: fn => fn(), useRef: value => ({ current: value }), useState: value => [typeof value === 'boolean' ? false : value, () => {}] },
      'react-native': { ...native, Keyboard: { dismiss() {} }, useWindowDimensions: () => ({ width: 375, height: 800 }) },
      '@/components/common/hashtag-picker': { HashtagPicker: 'HashtagPicker' },
      'expo-router': { useLocalSearchParams: () => ({ id }), router: { canGoBack: () => hasHistory, back: () => routes.push('back'), replace: value => routes.push(value) } },
      '@expo/vector-icons/Ionicons': 'Icon', 'expo-image-picker': {},
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
      './article-block-list': { default: 'BlockList', ScaleDecorator: React.Fragment },
      '@/components/article/article-renderer': { ArticleBlockView: 'Block' },
      '@/components/layout/responsive-layout': { getResponsiveContentLayout: () => ({}) },
      '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: false }) },
      '@/services/article.service': {},
      '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16 }, layout: {}, useTheme: () => ({ theme: { colors: {} } }) },
    });
    const close = find(ArticleEditorScreen(), node => node.props?.accessibilityLabel === 'Đóng');
    close.props.onPress();
    assert.deepEqual(routes, [hasHistory ? 'back' : id ? '/article/manage' : { pathname: '/', params: { category: 'articles' } }]);
  }
});

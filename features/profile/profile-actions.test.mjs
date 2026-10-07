import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const React = require('react');
const native = require('react-native-web');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profile = { id: 'recipient', displayName: 'Recipient', canMessage: true, conversationId: null, isFollowing: true, followerCount: 3, followingCount: 0, friendCount: 0, postCount: 0, accountStyle: 0, friendship: null };

function render({ value = profile, failure = null, friendMessage = '', outgoing = false } = {}) {
  const buttons = [], toasts = [], requests = [], routes = [];
  let current = outgoing ? { ...value, friendship: { status: 'Pending', friendshipId: 'friendship-1', isRequester: true } } : value;
  let stateIndex = 0;
  const overrides = {
    react: { ...React, useEffect: () => {}, useState: initial => { const index = stateIndex++; return [index === 0 ? current : index === 3 ? false : initial, next => { if (index === 0) current = typeof next === 'function' ? next(current) : next; }]; } },
    'react-native': { ...native, Alert: { alert: () => {} }, Pressable: props => { buttons.push(props); return React.createElement(native.Pressable, props); } },
    'expo-router': { useLocalSearchParams: () => ({ userId: value.id }), router: { push: route => routes.push(route) } },
    '@expo/vector-icons/Ionicons': () => null,
    '@/components/common/app-toast': { showAppToast: payload => toasts.push(payload) },
    '@/components/comments/comments-modal': { CommentsModal: () => null },
    '@/components/layout/responsive-content': { ResponsiveContent: props => React.createElement('main', {}, props.children) },
    '@/components/profile/profile-overview': { ProfileOverview: () => null },
    '@/components/profile/profile-content': { ProfileContent: () => null },
    '@/services/chat.service': { createPrivateConversation: async id => { requests.push(['chat', id]); if (failure) throw new Error(failure); return 'conversation-1'; } },
    '@/services/user.service': { getUserProfile: async () => ({ ...profile, friendship: null }), followUser: async id => { requests.push(['follow', id]); if (failure) throw new Error(failure); return { isFollowing: false, followerCount: 2 }; }, sendFriendRequest: async id => { requests.push(['invite', id]); if (failure) throw new Error(failure); return { success: true, friendshipId: 'friendship-1', status: 'Pending', message: friendMessage }; } },
    '@/services/friend.service': { deleteFriend: async id => { requests.push(['cancel', id]); if (failure) throw new Error(failure); } },
  };
  const cache = new Map();
  function compile(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename); cache.set(filename, compiled);
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    compiled.require = name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === '@/theme') return { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }, useTheme: () => ({ theme: compile(path.join(root, 'theme/modern.ts')).modernTheme }) };
      if (name.startsWith('.') || name.startsWith('@/')) {
        const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
        const candidate = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(existsSync);
        if (candidate) return compile(candidate);
      }
      return require(name);
    };
    compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
    return compiled.exports;
  }
  // Unused API boundaries must not initialize a real session or network client.
  for (const module of ['@/features/profile/open-profile', '@/features/profile/profile-posts', '@/services/post.service', '@/services/reel.service', '@/services/share-link.service', '@/stores/session-store']) overrides[module] = {};
  const { UserProfileScreen } = compile(path.join(root, 'features/profile/user-profile-screen.tsx'));
  const markup = renderToStaticMarkup(React.createElement(UserProfileScreen));
  const press = async label => {
    const button = buttons.find(button => React.Children.toArray(button.children).some(child => React.isValidElement(child) && child.props.children === label));
    assert.ok(button, `Missing action ${label}`);
    await button.onPress();
  };
  return { markup, press, requests, toasts, routes, get profile() { return current; } };
}

test('Profile messaging opens an existing room or creates a new one', async () => {
  const existing = render({ value: { ...profile, conversationId: 'existing-room' } });
  await existing.press('Nhắn tin');
  assert.equal(existing.routes[0].params.conversationId, 'existing-room');
  assert.equal(existing.requests.length, 0);
  const fresh = render(); await fresh.press('Nhắn tin');
  assert.equal(fresh.routes[0].params.conversationId, 'conversation-1');
  assert.deepEqual(fresh.requests, [['chat', 'recipient']]);
});
test('Messaging, follow and invitation errors are visible on web', async () => {
  for (const label of ['Nhắn tin', 'Đã theo dõi', 'Kết bạn']) {
    const h = render({ failure: 'Kết nối bị chặn' }); await h.press(label);
    assert.equal(h.toasts[0]?.type, 'error');
    assert.equal(h.toasts[0]?.message, 'Kết nối bị chặn');
    assert.equal(h.routes.length, 0);
    assert.equal(h.profile.isFollowing, true);
  }
});
test('Invitation always confirms success even if API omits the message', async () => {
  const h = render(); await h.press('Kết bạn');
  assert.equal(h.toasts[0]?.title, 'Đã gửi lời mời');
  assert.ok(h.toasts[0]?.message);
  assert.equal(h.profile.friendship.status, 'Pending');
});
test('Unfollow updates the server result and shows confirmation', async () => {
  const h = render(); await h.press('Đã theo dõi');
  assert.equal(h.profile.isFollowing, false);
  assert.equal(h.profile.followerCount, 2);
  assert.equal(h.toasts[0]?.title, 'Đã bỏ theo dõi');
});
test('Cancelling an invitation uses its friendship ID and confirms completion', async () => {
  const h = render({ outgoing: true }); await h.press('Hủy lời mời');
  assert.deepEqual(h.requests, [['cancel', 'friendship-1']]);
  assert.equal(h.profile.friendship, null);
  assert.equal(h.toasts[0]?.title, 'Đã hủy lời mời');
});

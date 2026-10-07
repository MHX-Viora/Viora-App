import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

function loader(overrides) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename);
    cache.set(filename, compiled);
    compiled.require = name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name.startsWith('@/')) {
        const base = path.join(root, name.slice(2));
        return load([base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(existsSync));
      }
      return require(name);
    };
    compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return relative => load(path.join(root, relative));
}

function service(fetch) {
  return loader({ '@/services/authenticated-fetch': { authenticatedFetch: fetch } })('services/notification.service.ts');
}

for (const message of ['Failed to fetch', 'Network request failed', 'Load failed']) {
  test(`Notification transport failure (${message}) shows a Vietnamese connection error`, async () => {
    const api = service(async () => { throw new TypeError(message); });
    await assert.rejects(api.getNotifications({ page: 1, pageSize: 20 }), /Không thể kết nối.*thông báo/);
  });
}

test('Notification service does not mislabel other failures as network errors', async () => {
  const failure = new Error('Phiên đăng nhập không hợp lệ.');
  const api = service(async () => { throw failure; });
  await assert.rejects(api.getNotifications({ page: 1, pageSize: 20 }), error => error === failure);
});

test('Notification HTTP errors preserve the server explanation', async () => {
  const api = service(async () => new Response(JSON.stringify({ message: 'Phiên đăng nhập đã hết hạn.' }), { status: 401 }));
  await assert.rejects(api.getNotifications({ page: 1, pageSize: 20 }), /Phiên đăng nhập đã hết hạn/);
});

test('Notification listing and read actions match the backend routes', async () => {
  const requests = [];
  const api = service(async (url, options) => {
    requests.push({ url, method: options?.method || 'GET' });
    return new Response(JSON.stringify({ page: 2, pageSize: 20, totalPages: 2, totalItems: 21, unreadCount: 1,
      items: [{ id: 'notification-1', title: 'Lời mời kết bạn', type: 1, isRead: false, createdAt: '2026-10-07T00:00:00Z' }] }));
  });
  const result = await api.getNotifications({ page: 2, pageSize: 20, isRead: false, type: 1 });
  assert.equal(result.items[0].title, 'Lời mời kết bạn');
  assert.equal(result.unreadCount, 1);
  assert.match(requests[0].url, /\/api\/notifications\?page=2&pageSize=20&isRead=false&type=1$/);
  await api.markNotificationRead('notification-1');
  await api.markAllNotificationsRead();
  assert.match(requests[1].url, /\/api\/notifications\/notification-1\/read$/);
  assert.match(requests[2].url, /\/api\/notifications\/read-all$/);
  assert.equal(requests[1].method, 'PUT');
  assert.equal(requests[2].method, 'PUT');
});

function screen() {
  const state = [], effects = [], buttons = [], requests = [];
  let index = 0, fail = true;
  const load = loader({
    react: { ...React,
      useState: initial => { const id = index++; if (!(id in state)) state[id] = initial; return [state[id], next => { state[id] = typeof next === 'function' ? next(state[id]) : next; }]; },
      useEffect: effect => { effects.push(effect); },
    },
    'react-native': { ...native,
      Pressable: props => { buttons.push(props); return React.createElement(native.Pressable, props); },
      FlatList: props => React.createElement(native.View, {}, props.ListHeaderComponent,
        props.data.length ? props.data.map(item => React.createElement('div', { key: item.id }, item.title)) : props.ListEmptyComponent),
    },
    'expo-router': { router: {} },
    '@expo/vector-icons/Ionicons': () => null,
    '@/components/layout/responsive-content': { ResponsiveContent: props => React.createElement('main', {}, props.children) },
    '@/components/layout/responsive-layout': { getResponsiveBottomPadding: () => 0 },
    '@/components/notifications/notification-header': { NotificationHeader: () => React.createElement('h1', {}, 'Thông báo') },
    '@/components/notifications/notification-skeleton': { NotificationSkeleton: () => null },
    '@/components/notifications/notification-item': { NotificationItem: () => null },
    '@/features/notifications/notification-events': { subscribeRealtimeNotifications: () => () => {} },
    '@/features/notifications/notification-navigation': { navigateNotification: () => {} },
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: true }) },
    '@/utils/notification-unread-count': { setNotificationUnreadCount: () => {} },
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, layout: {}, useTheme: () => ({ theme: { notifications: { primary: '#008aad', background: '#fff', text: '#111', textMuted: '#666' } } }) },
    '@/services/notification.service': { getNotifications: async query => {
      requests.push(query);
      if (fail) throw new Error('Không thể kết nối đến máy chủ thông báo. Vui lòng thử lại.');
      return { page: 1, totalPages: 1, unreadCount: 1, items: [{ id: 'notification-1', title: 'Lời mời kết bạn' }] };
    } },
  });
  const { NotificationsScreen } = load('features/notifications/notifications-screen.tsx');
  const render = () => { index = 0; buttons.length = 0; return renderToStaticMarkup(React.createElement(NotificationsScreen)); };
  return { effects, buttons, requests, render, recover: () => { fail = false; } };
}

test('The notification page can recover from fetch failure with a visible retry button', async () => {
  const h = screen();
  h.render();
  await h.effects[0]();
  const markup = h.render();
  assert.match(markup, /Không thể kết nối/);
  const retry = h.buttons.find(button => button.accessibilityLabel === 'Thử tải lại thông báo');
  assert.ok(retry, 'Web needs a visible retry action; pull-to-refresh is unavailable');
  h.recover();
  await retry.onPress();
  // The refresh callback starts an asynchronous load; drain its completion.
  await Promise.resolve();
  const recovered = h.render();
  assert.match(recovered, /Lời mời kết bạn/);
  assert.doesNotMatch(recovered, /Không thể kết nối/);
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.requests[1], { page: 1, pageSize: 20 });
});

test('An empty successful notification list is not displayed as a connection failure', async () => {
  const load = loader({ react: React, 'react-native': native, '@expo/vector-icons/Ionicons': () => null,
    '@/theme': { spacing: {}, useTheme: () => ({ theme: { notifications: {} } }) } });
  const { NotificationEmpty } = load('components/notifications/notification-empty.tsx');
  const markup = renderToStaticMarkup(React.createElement(NotificationEmpty, { onRetry: () => {} }));
  assert.match(markup, /Chưa có thông báo/);
  assert.doesNotMatch(markup, /Thử lại/);
});

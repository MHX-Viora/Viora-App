import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function fixture() {
  const toasts = [], sounds = [];
  const filename = fileURLToPath(new URL('./foreground-notification.service.web.ts', import.meta.url));
  const module = new Module(filename);
  module.require = name => name === '@/components/common/app-toast' ? { showAppToast: value => toasts.push(value) }
    : name === './notification-sound.service' ? { playNotificationSound: async key => sounds.push(key) } : require(name);
  module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return { toasts, sounds, show: module.exports.showRealtimeNotification };
}
test('Friend requests, accepted friendships and follows show a web notification once per event', async () => {
  const h = fixture();
  for (const type of [1, 2, 3]) {
    const item = { id: `notification-${type}`, type, title: 'Lời mời kết bạn', content: 'Người dùng đã gửi lời mời.', isRead: false };
    await h.show(item); await h.show(item);
  }
  assert.equal(h.toasts.length, 3);
  assert.equal(h.sounds.length, 3);
  assert.equal(h.toasts[0].title, 'Lời mời kết bạn');
  assert.equal(h.toasts[0].message, 'Người dùng đã gửi lời mời.');
});
test('Read notifications and chat events do not create extra social banners', async () => {
  const h = fixture();
  await h.show({ id: 'read', type: 1, isRead: true, content: 'Đã đọc' });
  await h.show({ id: 'message', type: 9, isRead: false, content: 'Tin nhắn' });
  assert.equal(h.toasts.length, 0);
  assert.equal(h.sounds.length, 0);
});
test('Other new notifications play the sound without adding extra social banners', async () => {
  const h = fixture();
  const notification = { id: 'post-like', type: 4, title: 'Lượt thích mới', isRead: false };
  await h.show(notification); await h.show(notification);
  assert.deepEqual(h.sounds, ['post-like']); assert.equal(h.toasts.length, 0);
});

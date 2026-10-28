import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require = createRequire(import.meta.url);
const compile = file => require('typescript').transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: 1 } }).outputText;

test('web audio plays once across duplicate events and contains autoplay errors', async () => {
  const players = [], module = { exports: {} };
  class FakeAudio {
    constructor(source) { this.source = source; this.plays = 0; players.push(this); }
    play() { this.plays++; return Promise.resolve(); }
  }
  vm.runInNewContext(compile('./notification-sound.service.web.ts'), { module, exports: module.exports, Audio: FakeAudio, Date, window: {}, require(name) {
    if (name === 'expo-asset') return { Asset: { fromModule: () => ({ uri: '/notification.wav' }) } };
    if (name.endsWith('.wav')) return 'asset';
    throw new Error(name);
  } });
  await module.exports.playNotificationSound('event-1');
  await module.exports.playNotificationSound('event-1');
  assert.equal(players.length, 1); assert.equal(players[0].plays, 1);
  players[0].play = () => Promise.reject(new Error('Autoplay blocked'));
  await assert.doesNotReject(module.exports.playNotificationSound('event-2'));
});

test('notification asset is bundled and Android uses new general/chat channels', () => {
  const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  const plugin = config.expo.plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-notifications')[1];
  assert.ok(plugin.sounds.includes('./assets/audio/ankt_notification.wav'));
  assert.equal(plugin.defaultChannel, 'ankt_notifications_v2');
  const module = { exports: {} };
  vm.runInNewContext(compile('./notification-sound.ts'), { module, exports: module.exports });
  assert.equal(module.exports.NOTIFICATION_SOUND_FILE, 'ankt_notification.wav');
  assert.equal(module.exports.NOTIFICATION_SOUND_ANDROID, 'ankt_notification');
  assert.equal(module.exports.NOTIFICATION_CHANNEL_ID, plugin.defaultChannel);
  assert.equal(module.exports.CHAT_SOUND_CHANNEL_ID, 'ankt_messages_v2');
  const wav = readFileSync(new URL('../assets/audio/ankt_notification.wav', import.meta.url));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(22), 1); assert.equal(wav.readUInt32LE(24), 44100);
  assert.ok(wav.length > 30000 && wav.length < 100000);
});

test('native foreground notification selects the new sound/channel once and skips read events', async () => {
  const calls = [], module = { exports: {} };
  vm.runInNewContext(compile('./foreground-notification.service.ts'), { module, exports: module.exports, Date, console, require(name) {
    if (name === 'expo-notifications') return { scheduleNotificationAsync: async config => calls.push(config) };
    if (name === './notification-channel.service') return { ensureNotificationSoundChannel: async () => {}, notificationSoundTrigger: () => ({ channelId: 'ankt_notifications_v2' }) };
    if (name === './notification-sound') return { NOTIFICATION_SOUND_FILE: 'ankt_notification.wav' };
    if (name === '@/features/chat/chat-events') return { getActiveChatConversation: () => null };
    if (name === '@/utils/push-notification-time') return { getCurrentNotificationData: data => data };
    throw new Error(name);
  } });
  const notification = { id: 'fixture', title: 'New event', type: 4, isRead: false };
  await module.exports.showRealtimeNotification(notification);
  await module.exports.showRealtimeNotification(notification);
  await module.exports.showRealtimeNotification({ ...notification, id: 'read', isRead: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].content.sound, 'ankt_notification.wav');
  assert.equal(calls[0].trigger.channelId, 'ankt_notifications_v2');
});

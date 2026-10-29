import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react'), native = require('react-native-web');
const { renderToStaticMarkup } = require('react-dom/server');
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
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return mod.exports;
}

test('paid owner advertisements are live presentations with separate non-billable ownership', async () => {
  const clicks = [], navigations = [];
  const service = compile('services/advertisement.service.ts', {
    '@/services/authenticated-fetch': {}, '@/services/feed.service': { mapFeedPost: value => value }, '@/services/reel.service': { mapReel: value => value },
  });
  const ad = { id: 'paid', advertiserId: 'owner', content: { user: {} }, ctaType: 0 };
  const presentations = [service.advertisementToReel(ad, false, true), service.advertisementToFeedPost(ad, false, 'owner', true)];
  const { openAdvertisement } = compile('features/advertisements/open-advertisement.ts', {
    'expo-router': { router: { push: value => navigations.push(value) } }, 'react-native': native,
    '@/features/profile/open-profile': {}, '@/services/chat.service': {},
    '@/services/advertisement.service': { trackAdvertisementClick: async id => clicks.push(id), createAdvertisementEventId: () => 'event' },
  });
  for (const item of presentations) {
    assert.equal(item.advertisement.isPreview, false);
    assert.equal(item.advertisement.isOwnerView, true);
    await openAdvertisement(item.advertisement, { id: 'content', authorId: 'owner', postType: 1 });
  }
  assert.deepEqual(clicks, []);
  assert.equal(navigations.length, 2);
  await openAdvertisement(service.advertisementToReel(ad).advertisement, { id: 'content', authorId: 'owner', postType: 1 });
  assert.deepEqual(clicks, ['paid']);
  assert.equal(service.advertisementToReel(ad, true).advertisement.isPreview, true);
});

export function renderReel(advertisement) {
  const { classicTheme } = compile('theme/classic.ts');
  const overrides = {
    react: React, 'react-native': { ...native, useWindowDimensions: () => ({ width: 375, height: 800 }) },
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16 }, useTheme: () => ({ theme: classicTheme }) },
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: false }) },
    '@expo/vector-icons/Ionicons': () => null,
    expo: { useEvent: (_, __, initial) => initial },
    'expo-video': { useVideoPlayer: () => ({ status: 'readyToPlay', currentTime: 0, duration: 10 }), VideoView: () => React.createElement('div') },
    'expo-image': { Image: () => null }, 'expo-web-browser': {},
    '@/components/common/user-avatar': { UserAvatar: () => React.createElement('div', { 'data-avatar': 'author', style: { width: 48, height: 48 } }) },
    '@/components/common/verified-badge': { VerifiedBadge: () => null },
    '@/components/common/app-toast': {}, '@/services/post.service': {}, '@/services/user.service': {},
    '@/components/reels/reel-action': { ReelAction: props => React.createElement('button', { 'aria-label': props.label }, props.label) },
  };
  const { ReelCard } = compile('components/reels/reel-card.tsx', overrides);
  const reel = { id: 'content', authorId: 'owner', author: 'Kai', avatar: '', caption: 'Paid video', hashtags: '#ANKT', isFollowing: true, isMine: true, videoUrl: '', likes: '1', comments: '0', advertisement };
  return renderToStaticMarkup(React.createElement(ReelCard, { reel, height: 800, active: false, onOpenAuthor() {} }));
}

test('paid reel keeps sponsored CTA, omits preview text, and shares the normal action-rail avatar', () => {
  const organic = renderReel();
  const paid = renderReel({ id: 'paid', ctaType: 8, isPreview: false, isOwnerView: true });
  for (const html of [organic, paid]) {
    assert.equal((html.match(/data-avatar="author"/g) || []).length, 1);
    assert.ok(html.indexOf('Paid video') < html.indexOf('data-avatar="author"'), 'avatar follows caption in the action rail');
    assert.ok(html.indexOf('data-avatar="author"') < html.indexOf('aria-label="Thích reels"'), 'avatar precedes like action');
  }
  assert.doesNotMatch(paid, /Bản xem trước quảng cáo/);
  assert.match(paid, /Được tài trợ/);
  assert.match(paid, /Theo dõi quảng cáo/);
});

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript'), React = require('react'), native = require('react-native-web');
const root = process.cwd();
const advertisement = { id: 'campaign', ctaType: 1, destinationUrl: 'https://example.test/offer', headline: 'Offer', description: 'Details', isPreview: true };
const apiContent = { id: 'post', content: 'Original', createdAt: new Date().toISOString(), visibility: 0, reactionCount: 42, commentCount: 12, saveCount: 3, shareCount: 4, user: { id: 'owner', displayName: 'Owner' }, media: [{ mediaUrl: '/video.mp4', thumbnailUrl: '/cover.png' }], hashtags: [], advertisement };

function compile(relative, overrides = {}) {
  const file = path.resolve(root, relative), mod = new Module(file);
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'react-native') return native;
    if (name === '@/services/authenticated-fetch' || name === '@/services/authenticated-upload' || name === '@/stores/session-store') return {};
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.resolve(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      const candidate = [base + '.ts', base + '.tsx', path.join(base, 'index.ts')].find(existsSync);
      if (candidate) return compile(candidate, overrides);
    }
    return require(name);
  };
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return mod.exports;
}

test('profile post and reel mappings retain campaign, ownership and actual counts', () => {
  const { mapFeedPost } = compile('services/feed.service.ts', { '@/utils/post-upload': {} });
  const { mapReel } = compile('services/reel.service.ts', { '@/utils/reel-upload': {} });
  const post = mapFeedPost(apiContent, { id: 'owner' });
  const reel = mapReel(apiContent, 'owner');
  assert.deepEqual(post.advertisement, advertisement);
  assert.deepEqual(reel.advertisement, advertisement);
  assert.equal(post.isMine, true); assert.equal(reel.isMine, true);
  assert.equal(post.reactions, 42); assert.equal(reel.likes, '42');
  assert.equal(post.comments, 12); assert.equal(reel.comments, '12');
  assert.equal(post.body, 'Original'); assert.equal(reel.videoUrl, '/video.mp4');
  assert.equal(mapFeedPost({ ...apiContent, advertisement: null }).advertisement, undefined);
  assert.equal(mapReel({ ...apiContent, advertisement: null }).advertisement, undefined);
});

test('community owner ad previews preserve ownership for personal post options', () => {
  const { advertisementToFeedPost } = compile('services/advertisement.service.ts', { '@/utils/post-upload': {}, '@/utils/reel-upload': {} });
  const campaign = { ...advertisement, advertiserId: 'owner', content: apiContent };
  const own = advertisementToFeedPost(campaign, true, 'owner');
  assert.equal(own.isMine, true);
  assert.equal(own.advertisement.isPreview, true);
  assert.equal(advertisementToFeedPost(campaign, false, 'visitor').isMine, false);
  assert.equal(advertisementToFeedPost(campaign).isMine, false);
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const found = find(child, predicate);
    if (found) return found;
  }
  return null;
}

function uiOverrides(onOpen, state = value => value) {
  const theme = compile('theme/classic.ts').classicTheme;
  return {
    react: { ...React, useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {}, useState: value => [state(value), () => {}], useTransition: () => [false, fn => fn()] },
    'react-native': native,
    '@expo/vector-icons/Ionicons': 'Icon',
    'expo-image': { Image: 'Image' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }), SafeAreaView: 'SafeAreaView' },
    '@/theme': { useTheme: () => ({ theme }), spacing: { xs: 4, sm: 8, md: 12, lg: 16 }, layout: {} },
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: false }) },
    '@/components/layout/responsive-layout': { getResponsiveContentLayout: () => ({}) },
    '@/components/feed/post-card': { PostCard: 'PostCard' },
    '@/components/reels/reel-card': { ReelCard: 'ReelCard' },
    '@/components/reels/reels-grid-viewer': { ReelsGridViewer: 'ReelsGridViewer' },
    '@/services/reel.service': { formatReelCount: String },
    '@/features/advertisements/open-advertisement': { openAdvertisement: (...args) => onOpen(...args) },
  };
}

test('profile post CTA opens the campaign destination through existing advertisement navigation', () => {
  const opened = [];
  const { ProfileContent } = compile('components/profile/profile-content.tsx', uiOverrides((...args) => opened.push(args)));
  const post = { id: 'post', authorId: 'owner', postType: 0, advertisement };
  const tree = ProfileContent({ posts: [post], reels: [], stats: [] });
  const card = find(tree, node => node.type === 'PostCard');
  assert.equal(card.props.post, post);
  card.props.onAdvertisementPress(post);
  assert.deepEqual(opened, [[advertisement, { id: 'post', authorId: 'owner', postType: 0 }]]);
});

test('opening a sponsored profile video retains its campaign and connects its CTA', () => {
  const opened = [];
  const reel = { id: 'video', authorId: 'owner', author: 'Owner', caption: 'Video', likes: '42', advertisement };
  let nullStates = 0;
  const overrides = uiOverrides((...args) => opened.push(args), value => value === null ? (++nullStates === 1 ? 0 : null) : value === 0 ? 600 : value);
  const { ReelsGridViewer } = compile('components/reels/reels-grid-viewer.tsx', overrides);
  const tree = ReelsGridViewer({ reels: [reel] });
  assert.ok(find(tree, node => node.props?.children === 'Được tài trợ'));
  const list = find(tree, node => typeof node.props?.renderItem === 'function');
  const card = list.props.renderItem({ index: 0, item: reel });
  assert.equal(card.type, 'ReelCard'); assert.equal(card.props.reel, reel);
  card.props.onAdvertisementPress(reel);
  assert.deepEqual(opened, [[advertisement, { id: 'video', authorId: 'owner', postType: 1 }]]);
});

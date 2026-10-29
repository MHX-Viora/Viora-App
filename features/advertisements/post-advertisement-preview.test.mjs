import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react'), native = require('react-native-web');
const { renderToStaticMarkup } = require('react-dom/server');
const root = process.cwd();
function compile(file, overrides = {}) {
  const mod = new Module(file); mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      const candidate = [base + '.ts', base + '.tsx'].find(existsSync);
      if (candidate) return compile(candidate, overrides);
    }
    return require(name);
  };
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, file);
  return mod.exports;
}
const { createPostAdvertisementPreview } = compile(path.resolve('features/advertisements/post-advertisement-preview.ts'));
const post = { id: 'sample', author: 'Kai', authorId: 'author', avatar: '', isAuthorVerified: false, isMine: true,
  link: null, location: null, publishedAt: 'yesterday', body: 'Kết nối cộng đồng\nChia sẻ mọi khoảnh khắc.', images: [],
  isReacted: false, isSaved: false, reactionType: 0, reactions: 3, saveCount: 2, comments: 4, shares: 1, visibility: 0, postType: 0, viewCount: 0 };

test('draft presentation preserves content and counts without mutating the source or creating a paid ad', () => {
  const preview = createPostAdvertisementPreview(post, 0, ' https://ankt.vn/community ');
  assert.equal(post.advertisement, undefined);
  assert.deepEqual(preview.advertisement, { id: 'preview:sample', ctaType: 0, destinationUrl: 'https://ankt.vn/community', headline: null, description: null, isPreview: true });
  assert.equal(preview.body, post.body); assert.equal(preview.reactions, 3);
  assert.equal(createPostAdvertisementPreview(post, 2, ' ').advertisement.destinationUrl, null);
});

export function renderPreview(themeName = 'classic', cta = 0, withMedia = false, copy = {}) {
  const theme = compile(path.join(root, `theme/${themeName}.ts`))[themeName === 'classic' ? 'classicTheme' : 'premiumOceanTheme'];
  let stateIndex = 0;
  const overrides = {
    react: { ...React, useState: initial => {
      const index = stateIndex++;
      const [value, setValue] = React.useState(index === 1 ? Boolean(copy.optionsOpen) : initial);
      return [value, index === 1 && copy.onOptionsChange ? copy.onOptionsChange : setValue];
    } },
    'react-native': { ...native,
      Modal: props => props.visible ? React.createElement(native.View, null, props.children) : null,
      Pressable: props => { copy.controls?.push(props); return React.createElement(native.Pressable, props); },
    },
    '@/theme': { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }, typography: { body: { fontSize: 14, lineHeight: 20 } }, useTheme: () => ({ theme }) },
    '@expo/vector-icons/Ionicons': props => React.createElement('svg', { width: props.size, height: props.size, fill: props.color }),
    '@/hooks/use-responsive': { useResponsive: () => ({ isDesktopWeb: true }) },
    '@/components/common/app-toast': { showAppToast() {} },
    '@/services/post.service': {},
    '@/components/common/user-avatar': { UserAvatar: () => React.createElement(native.View, { style: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EED7AE' } }) },
    '@/components/common/verified-badge': { VerifiedBadge: () => null },
    '@/components/common/viewable-image': { ViewableImage: props => React.createElement(native.Image, { source: props.source, resizeMode: 'cover', style: { width: '100%', height: 240 } }) },
    '@/components/common/adaptive-media-image': { AdaptiveMediaImage: () => null },
    '@/components/mentions/mention-text': { MentionText: props => React.createElement(native.Text, props) },
  };
  const { PostCard } = compile(path.resolve('components/feed/post-card.tsx'), overrides);
  const content = { ...post, ...copy.post, ...(withMedia ? { images: ['/preview-art.png'] } : {}) };
  const presented = createPostAdvertisementPreview(content, cta, copy.destinationUrl ?? 'https://ankt.vn', copy.headline, copy.description);
  if (copy.published) presented.advertisement = { ...presented.advertisement, id: 'delivered-ad', isPreview: false };
  return renderToStaticMarkup(React.createElement(PostCard, { advertisementPreviewLayout: !copy.ownerPreview && copy.published !== true, onAdvertise: copy.onAdvertise, variant: copy.post?.postType === 2 ? 'news' : 'default', post: copy.organic ? content : presented }));
}

test('owner preview opens normal post options while creation demo stays disabled', () => {
  const controls = [], changes = [];
  const html = renderPreview('classic', 0, false, { ownerPreview: true, optionsOpen: true, controls, onOptionsChange: value => changes.push(value), onAdvertise() {} });
  const options = controls.find(control => control.accessibilityLabel === 'Tùy chọn bài viết');
  assert.ok(!options.disabled);
  assert.equal(typeof options.onPress, 'function');
  options.onPress();
  assert.deepEqual(changes, [true]);
  assert.match(html, /Xóa bài viết/);
  assert.match(html, /Quảng cáo bài viết/);
  assert.doesNotMatch(html, /Ẩn quảng cáo|Báo cáo quảng cáo|Thông tin nhà quảng cáo|Không quan tâm/);
  const demo = [];
  renderPreview('classic', 0, false, { controls: demo });
  assert.equal(demo.find(control => control.accessibilityLabel === 'Tùy chọn bài viết').disabled, true);
});

test('other advertisers retain feedback options without owner actions', () => {
  const html = renderPreview('classic', 0, false, { published: true, optionsOpen: true, post: { isMine: false } });
  assert.match(html, /Ẩn quảng cáo/); assert.match(html, /Báo cáo quảng cáo/);
  assert.doesNotMatch(html, /Xóa bài viết|Quảng cáo bài viết/);
});

test('delivered ads use the preview presentation and retain live options', () => {
  for (const theme of ['classic', 'premium-ocean']) {
    const html = renderPreview(theme, 0, true, { published: true });
    assert.match(html, /ANKT.VN/);
    assert.match(html, /Tìm hiểu thêm/);
    assert.match(html, /Được tài trợ/);
    assert.match(html, /Công khai/);
    assert.match(html, /Tùy chọn bài viết/);
    assert.doesNotMatch(html, /yesterday|Xem trước|post-advertisement-preview/);
  }
  assert.match(renderPreview('classic', 1, false, { published: true }), /Mua ngay/);
  const organic = renderPreview('classic', 0, false, { published: true, organic: true });
  assert.match(organic, /yesterday/);
  assert.doesNotMatch(organic, /Được tài trợ|Tìm hiểu thêm|ANKT.VN/);
});

test('preview places sponsorship at author and destination CTA before real interaction counts', () => {
  for (const theme of ['classic', 'premium-ocean']) {
    const html = renderPreview(theme);
    assert.match(html, /Được tài trợ/); assert.match(html, /ANKT.VN/); assert.match(html, /Tìm hiểu thêm/);
    assert.match(html, /Công khai/);
    assert.doesNotMatch(html, /yesterday/);
    assert.match(html, /aria-label="Tùy chọn bài viết"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*aria-label="Tùy chọn bài viết"/);
    assert.ok(html.indexOf('Được tài trợ') < html.indexOf('Kết nối cộng đồng'));
    assert.ok(html.indexOf('ANKT.VN') < html.indexOf('Tìm hiểu thêm'));
  }
  assert.match(renderPreview('classic', 1), /Mua ngay/);
});

test('custom headline and description replace fallback in preview and feed without rendering HTML', () => {
  const copy = { headline: ' Custom <b>headline</b> ', description: ' A short description ' };
  for (const published of [false, true]) {
    const html = renderPreview('classic', 0, false, { ...copy, published });
    assert.match(html, /Custom &lt;b&gt;headline&lt;\/b&gt;/);
    assert.match(html, /A short description/);
    assert.doesNotMatch(html, /<b>headline<\/b>/);
  }
  const draft = createPostAdvertisementPreview(post, 0, '', copy.headline, copy.description);
  assert.equal(draft.advertisement.headline, 'Custom <b>headline</b>');
  assert.equal(draft.advertisement.description, 'A short description');
  assert.equal(post.advertisement, undefined);
});

test('article ads retain custom destination copy even when they have a thumbnail', () => {
  const html = renderPreview('classic', 0, false, { headline: 'Custom article offer', description: 'Custom article details',
    post: { postType: 2, article: { title: 'Original article', thumbnailUrl: 'https://example.test/cover.png', preview: 'Article preview', readingTimeMinutes: 1 } } });
  assert.match(html, /Custom article offer/); assert.match(html, /Custom article details/);
});

test('delivery mapping carries saved copy into the feed presentation', () => {
  const service = compile(path.resolve('services/advertisement.service.ts'), {
    '@/services/authenticated-fetch': { authenticatedFetch() { throw Error('No network in this test'); } },
    '@/services/feed.service': { mapFeedPost: () => post },
    '@/services/reel.service': { mapReel: () => ({}) },
  });
  const mapped = service.advertisementToFeedPost({ id: 'saved-ad', ctaType: 0, destinationUrl: null, headline: 'Saved title', description: 'Saved description', content: {} });
  assert.equal(mapped.advertisement.headline, 'Saved title');
  assert.equal(mapped.advertisement.description, 'Saved description');
});

test('blank destination copy stays hidden without substituting the author or post content', () => {
  for (const published of [false, true]) {
    const html = renderPreview('classic', 0, false, { headline: ' ', description: ' ', destinationUrl: '', published });
    assert.doesNotMatch(html, /advertisement-destination-copy|Trong ANKT|TRONG ANKT/);
    assert.equal((html.match(/>Kai</g) || []).length, 1, 'author appears only in the post header');
  }
  const linked = renderPreview('classic', 0, false, { headline: '', description: '', destinationUrl: 'https://ankt.vn' });
  assert.match(linked, /ANKT.VN/);
  assert.equal((linked.match(/>Kai</g) || []).length, 1);
});

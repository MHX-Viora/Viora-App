import test from 'node:test';
import assert from 'node:assert/strict';
import { pages, searchDocs } from './content.mjs';
import { escapeHtml, renderBody, renderDocument } from './render.mjs';
import { safeDeveloperReturn } from './route-policy.mjs';
import { writePublicProfileHint } from './public-profile-hint.mjs';

for (const page of pages) test(`SEO and content contract: ${page.path}`, () => {
  const html = renderDocument(page.slug);
  assert.ok(html.includes(`<title>${escapeHtml(page.title)} | ANKT Developers</title>`));
  assert.ok(html.includes(`<meta name="description" content="${escapeHtml(page.description)}">`));
  assert.ok(html.includes(`<link rel="canonical" href="https://mxh.ankt.vn${page.path}">`));
  for (const section of page.sections) assert.ok(html.includes(`id="${section.id}"`));
  assert.doesNotMatch(html, /<script[^>]+src="https?:/);
  const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1];
  assert.equal(JSON.parse(json)['@graph'][1].url, `https://mxh.ankt.vn${page.path}`);
});
test('trusted renderer escapes markup and refuses unknown documents', () => {
  assert.equal(escapeHtml('<script a="x">&\''), '&lt;script a=&quot;x&quot;&gt;&amp;&#39;');
  assert.throws(() => renderBody('unknown'));
  assert.throws(() => renderDocument('../../login'));
});
test('all specified console destinations are allowlisted without URL decoding tricks', () => {
  for (const path of ['/developers/register', '/developers/console', '/developers/console/apps', '/developers/console/apps/a-b_12', '/developers/console/credentials', '/developers/console/analytics']) assert.equal(safeDeveloperReturn(path), path);
  for (const path of ['/developers/console/apps/%2e%2e', '/developers/console/apps/a/b', '/developers/console#external', '/developers/console\\evil', '/developers/console/', '/developers/console/apps/' + 'x'.repeat(81)]) assert.equal(safeDeveloperReturn(path), null);
});
test('empty, untrusted and absent terms do not return unrelated pages', () => {
  assert.deepEqual(searchDocs('   '), []);
  assert.deepEqual(searchDocs('<img src=x onerror=alert(1)>'), []);
  assert.deepEqual(searchDocs('unfindableword984782'), []);
  assert.ok(searchDocs('LIEN KET TAI KHOAN').some(page => page.slug === 'account-linking'));
});
test('SSO configuration contains only educational values and no invented endpoint or package', () => {
  const html = renderDocument('sso');
  assert.match(html, /CLIENT_ID/); assert.match(html, /CLIENT_SECRET/); assert.match(html, /REDIRECT_URI/);
  assert.match(html, /partner\.example/);
  assert.match(renderDocument('sdk'), /ANKT Mini App SDK/);
  assert.doesNotMatch(html, /https:\/\/[^"\s<>]+\/(connect|oauth|token)/);
});
test('public display hint excludes credentials and clearing or blocked storage is safe', () => {
  const original = globalThis.window;
  const values = new Map();
  try {
    globalThis.window = { localStorage: { setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } };
    writePublicProfileHint({ displayName: 'Người dùng', accessToken: 'fixture-secret', id: 'private-id' });
    assert.deepEqual(JSON.parse(values.get('ankt.public-profile-hint')), { displayName: 'Người dùng' });
    writePublicProfileHint(null);
    assert.equal(values.size, 0);
    globalThis.window.localStorage.setItem = () => { throw new Error('Storage blocked'); };
    assert.doesNotThrow(() => writePublicProfileHint({ displayName: 'User' }));
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});

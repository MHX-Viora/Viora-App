import test from 'node:test';
import assert from 'node:assert/strict';
import { pages, searchDocs } from './content.mjs';
import { renderDocument, validateContent } from './render.mjs';
import { isPublicDeveloperPath, safeDeveloperReturn } from './route-policy.mjs';

test('Vietnamese search folds accents and ranks title/content without unsafe markup', () => {
  const results = searchDocs('dang ky developer');
  assert.equal(results[0].slug, 'register-developer');
  assert.ok(searchDocs('PKCE').some(result => result.slug === 'sso'));
  assert.ok(searchDocs('cookie').some(result => result.slug === 'webview'));
  assert.deepEqual(searchDocs('<script>alert(1)</script>'), []);
});

test('public documentation and private console have separate exact route boundaries', () => {
  assert.equal(isPublicDeveloperPath('/developers/docs/security'), true);
  assert.equal(isPublicDeveloperPath('/developers'), true);
  assert.equal(isPublicDeveloperPath('/developers/console'), false);
  assert.equal(isPublicDeveloperPath('/developers/docs/unknown'), false);
  assert.equal(safeDeveloperReturn('/developers/console/apps/fixture'), '/developers/console/apps/fixture');
  for (const value of ['https://evil.example', '//evil.example', '/developers/console/../../wallet', '/developers/console?next=https://evil.example', '/wallet', ['/developers/register']]) {
    assert.equal(safeDeveloperReturn(value), null);
  }
});

test('every public route has complete server HTML and only approved internal links', () => {
  assert.equal(pages.length, 13);
  assert.deepEqual(validateContent(), []);
  for (const page of pages) {
    const html = renderDocument(page.slug);
    assert.match(html, /<html lang="vi"/);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.ok(html.includes(page.title));
    assert.ok(html.includes(`https://mxh.ankt.vn${page.path}`));
    assert.match(html, /property="og:title"/);
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /Mini App nằm trong Tiện ích/);
    assert.doesNotMatch(html, /\/api\/admin|\/swagger|sessionToken|JWT signing/i);
  }
});

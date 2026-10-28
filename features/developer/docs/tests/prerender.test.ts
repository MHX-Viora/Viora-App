import assert from 'node:assert/strict';
import test from 'node:test';
import { renderDocument, renderNotFoundDocument } from '../lib/render-document';
import { pages } from '../lib/manifest';

test('docs 404 uses the shared header and hydrates mobile navigation', () => {
  const html = renderNotFoundDocument({ script: '/developers/docs-assets/client.js', stylesheet: '/developers/docs-assets/docs.css' });
  assert.match(html, /developer-public-header/);
  assert.match(html, /data-slug="__not-found__"/);
  assert.match(html, /src="\/developers\/docs-assets\/client.js"/);
  assert.match(html, /noindex,nofollow/);
});

test('raw HTML contains complete public content, safe metadata and external scripts before JS', () => {
  const html = renderDocument(pages.find(page => page.slug === 'introduction')!, { origin: 'https://portal.example.test', script: '/developers/docs-assets/client.js', stylesheet: '/developers/docs-assets/docs.css' });
  assert.match(html, /<h1[^>]*>Mini App ANKT/);
  assert.match(html, /Auth Bridge/);
  assert.match(html, /rel="canonical" href="https:\/\/portal.example.test\/developers\/docs\/introduction"/);
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /src="\/developers\/docs-assets\/client.js"/);
  assert.doesNotMatch(html, /<script(?![^>]*src=)[^>]*>/);
  assert.match(html, /developer-public-header/);
  for (const href of ['/developers/docs', '/developers/docs/sdk', '/developers/docs/getting-started', '/'])
    assert.ok(html.includes(`href="${href}"`), `Shared home navigation: ${href}`);
  assert.match(html, /data-theme="light"/);
  assert.doesNotMatch(html, /docs-theme-toggle/);
  assert.throws(() => renderDocument(pages[0], { origin: 'https://user:secret@portal.test', script: '/client.js', stylesheet: '/docs.css' }));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { pages } from '../lib/manifest';
import { renderDocument } from '../lib/render-document';
test('every public page returns complete crawlable HTML with unique canonical and heading IDs', () => {
  const canonicals = new Set<string>();
  for (const page of pages) {
    const html = renderDocument(page, { origin: 'https://portal.example.test', script: '/developers/docs-assets/client.js', stylesheet: '/developers/docs-assets/docs.css' });
    assert.ok(html.includes(page.title.replace(/&/g, '&amp;')), page.slug);
    assert.match(html, /<html lang="vi"/);
    assert.match(html, /<meta name="description"/);
    assert.match(html, /<meta property="og:url"/);
    assert.match(html, /<meta name="twitter:card"/);
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical && !canonicals.has(canonical)); canonicals.add(canonical);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'Duplicate DOM ids: ' + page.slug);
    assert.doesNotMatch(html, /<script(?![^>]*src=)[^>]*>/);
    assert.doesNotMatch(html, /\/api\/admin\/|\/internal\/sandbox-executor|BEGIN PRIVATE KEY/);
  }
});

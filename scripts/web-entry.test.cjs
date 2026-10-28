const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const html = readFileSync(require.resolve('../public/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];

function visit(pathname, search = '', hash = '') {
  const redirects = [];
  const window = { location: { pathname, search, hash, replace: (url) => redirects.push(url) } };
  for (const [, script] of scripts) runInNewContext(script, { window });
  return redirects;
}

test('opening the raw HTML entry redirects to the Expo application', () => {
  assert.deepEqual(visit('/index.html'), ['/']);
});

test('the entry redirect preserves query parameters and fragments', () => {
  assert.deepEqual(visit('/index.html', '?source=browser', '#welcome'), ['/?source=browser#welcome']);
});

test('application routes do not redirect or loop', () => {
  for (const path of ['/', '/login', '/developers']) assert.deepEqual(visit(path), []);
});

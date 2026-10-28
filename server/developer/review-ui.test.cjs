const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { resolve } = require('node:path');
const Module = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const file = resolve(__dirname, '../../features/developer/components/review-history.tsx');
const compiled = new Module(file, module); compiled.filename = file; compiled.paths = module.paths;
compiled._compile(buildSync({ entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external' }).outputFiles[0].text, file);
const { ReviewChecklist, ReviewHistoryDetail, VersionSnapshot } = compiled.exports;
test('server capability controls submit and missing readiness never becomes local authority', () => {
  for (const readyForReview of [true, false]) {
    const html = renderToStaticMarkup(React.createElement(ReviewChecklist, { readiness: { readyForReview, evaluatedAt: '2026-10-21T00:00:00Z', requiredChecks: [], blockingReasons: [] }, busy: false, onSubmit() {} }));
    assert.equal(/disabled=""/.test(html), !readyForReview);
  }
  assert.match(renderToStaticMarkup(React.createElement(ReviewChecklist, { readiness: null, onSubmit() {} })), /Chưa có đánh giá/);
});
test('frozen snapshot and decision reasons render as escaped text with a clear version boundary', () => {
  const snapshot = { name: '<script>bad</script>', category: 'utilities', ssoEnabled: false, websiteUrl: 'https://partner.example.com' };
  const html = renderToStaticMarkup(React.createElement(VersionSnapshot, { snapshot, title: 'Bản đã gửi duyệt' }));
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  const detail = { review: { status: 'ChangesRequested', versionCode: 1 }, versionName: '1.0', snapshot, reason: '<img src=x onerror=bad()>',
    changes: [{ field: 'websiteUrl', message: '<script>reason</script>' }], actions: [], evidence: { evaluatedAt: '2026-10-21T00:00:00Z', checks: [] } };
  const rendered = renderToStaticMarkup(React.createElement(ReviewHistoryDetail, { detail, onEdit() {} }));
  assert.ok(!rendered.includes('<img')); assert.ok(rendered.includes('Tạo bản nháp mới')); assert.ok(rendered.includes('Website'));
});

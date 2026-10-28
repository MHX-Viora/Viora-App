import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDocuments, documentUrl, headingId, type DocPage } from '../lib/content-schema';

const page: DocPage = { slug: 'introduction', title: 'Mini App ANKT', description: 'Hướng dẫn tích hợp', group: 'Bắt đầu',
  order: 1, revision: 1, updatedAt: '2026-10-23', status: 'implemented-and-verified',
  sections: [{ id: 'overview', title: 'Tổng quan', blocks: [{ type: 'paragraph', text: 'Nội dung công khai.' }] }], related: [] };
test('content rejects duplicate routes/anchors, broken links and executable content', () => {
  assert.doesNotThrow(() => validateDocuments([page]));
  for (const input of [[page, page], [{ ...page, slug: '../console' }], [{ ...page, related: ['missing'] }],
    [{ ...page, sections: [page.sections[0], page.sections[0]] }], [{ ...page, sections: [{ ...page.sections[0], blocks: [{ type: 'html', text: '<script>bad</script>' }] }] }]])
    assert.throws(() => validateDocuments(input as DocPage[]));
  assert.equal(documentUrl('introduction', 'overview'), '/developers/docs/introduction#overview');
  assert.equal(headingId('introduction', 'overview'), 'overview');
});

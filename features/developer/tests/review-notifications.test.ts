import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewFocus } from '../lib/review-notifications';
import { requiresDeveloperDocumentNavigation } from '../lib/navigation-policy';
const id = '11111111-1111-4111-8111-111111111111';
test('deep links accept only exact review tab and GUID references and preserve editor document navigation', () => {
  assert.deepEqual(reviewFocus('?tab=review&reviewId=' + id + '&versionId=' + id), { reviewId: id, versionId: id, publicationId: undefined });
  for (const query of ['?tab=review&reviewId=bad', '?tab=review&reviewId=' + id + '&reviewId=' + id, '?tab=review&redirect=//evil.example', '?tab=settings'])
    assert.equal(reviewFocus(query), null);
  assert.equal(requiresDeveloperDocumentNavigation('/developers/console/notifications', '/developers/console/apps/app_' + 'a'.repeat(43) + '?tab=review&versionId=' + id), true);
});

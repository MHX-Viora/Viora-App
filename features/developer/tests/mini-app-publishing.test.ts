import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublishingClient, parsePublicationReadiness } from '../lib/mini-app-publishing';
import { createNotificationClient, parseReviewNotification } from '../lib/review-notifications';

const id = '11111111-1111-4111-8111-111111111111', app = 'app_' + 'a'.repeat(43);
const ready = { versionId: id, snapshotHash: 'a'.repeat(64), approvedReviewRequestId: id, appVersion: id,
  publicationId: null, publicationRevision: null, operationalRevision: null, canPublish: true, canUnpublish: false, evaluatedAt: '2026-10-21T00:00:00Z', blockingReasons: [] };
test('publication readiness binds exact approved target and rejects forged capability shapes', async () => {
  assert.equal(parsePublicationReadiness(ready).canPublish, true);
  for (const value of [{ ...ready, approvedReviewRequestId: null }, { ...ready, canUnpublish: true }, { ...ready, canPublish: 'yes' }, { ...ready, token: 'private' }])
    assert.throws(() => parsePublicationReadiness(value));
  let calls = 0;
  const client = createPublishingClient(async () => { calls++; return ready; });
  await client.readiness(app, id);
  await assert.rejects(() => client.publish(app, { requestId: id, concurrencyToken: id, versionId: id, publicationId: null, publicationRevision: id, operationalRevision: null }));
  assert.equal(calls, 1);
});
test('notification parser accepts only its generated owned-app deep link', async () => {
  const receipt = { id, eventType: 'ReviewApproved', appId: app, reviewId: id, versionId: id, publicationId: null,
    deepLink: `/developers/console/apps/${app}?tab=review&reviewId=${id}&versionId=${id}`, createdAt: '2026-10-21T00:00:00Z', readAt: null };
  assert.equal(parseReviewNotification(receipt).id, id);
  for (const deepLink of ['https://evil.example', '//evil.example', '/developers/console/apps/other', receipt.deepLink + '&redirect=https://evil.example'])
    assert.throws(() => parseReviewNotification({ ...receipt, deepLink }));
  let calls = 0;
  const client = createNotificationClient(async (path, method, body) => { calls++; assert.equal(method, 'POST'); assert.deepEqual(body, {}); return receipt; });
  await client.read(id); await assert.rejects(() => client.list(1, 101)); assert.equal(calls, 1);
});

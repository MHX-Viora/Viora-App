import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewClient, parseVersion, parseReviewReadiness, parseReviewDetail, ReviewRequestSequence } from '../lib/mini-app-review';

const id = '11111111-1111-4111-8111-111111111111';
const app = 'app_' + 'a'.repeat(43);
const version = { id, versionCode: 1, versionName: '1.0', state: 'Draft', snapshotHash: 'a'.repeat(64), concurrencyToken: id,
  createdAt: '2026-10-21T00:00:00Z', updatedAt: '2026-10-21T00:00:00Z', submittedAt: null };
test('version contract rejects credential fields, unsafe integers and unknown state', () => {
  assert.equal(parseVersion(version).state, 'Draft');
  for (const value of [{ ...version, clientSecret: 'do not expose' }, { ...version, versionCode: Number.MAX_SAFE_INTEGER + 1 },
    { ...version, state: 'Published' }, { ...version, concurrencyToken: 'bad' }]) assert.throws(() => parseVersion(value));
  assert.throws(() => parseReviewReadiness({ versionId: id, readyForReview: true }));
});
test('review client validates command boundaries before transport and preserves retry request IDs', async () => {
  const calls: { path: string; method?: string; body?: unknown }[] = [];
  const client = createReviewClient(async (path, method, body) => { calls.push({ path, method, body }); return version; });
  const command = { requestId: id, appVersion: id, versionName: '1.0' };
  await client.createVersion(app, command); await client.createVersion(app, command);
  assert.deepEqual(calls[0], calls[1]); assert.equal(calls[0].path, `mini-apps/${app}/versions`);
  await assert.rejects(() => client.createVersion(app, { ...command, actor: id } as typeof command));
  await assert.rejects(() => client.createVersion('../other', command));
  await assert.rejects(() => client.versions(app, 0, 101));
  assert.equal(calls.length, 2);
});
test('request generations reject out-of-order and unmounted responses', () => {
  const sequence = new ReviewRequestSequence(); const old = sequence.begin(); const current = sequence.begin();
  assert.equal(sequence.isCurrent(old), false); assert.equal(sequence.isCurrent(current), true);
  sequence.invalidate(); assert.equal(sequence.isCurrent(current), false);
});
test('readiness accepts the uppercase fingerprint emitted by Stage 6 without relaxing its checklist shape', () => {
  const keys = ['logo', 'name', 'category', 'description', 'website', 'domain', 'supportEmail', 'callbacks', 'privacyPolicy', 'termsOfService', 'environment', 'ssoClient', 'discovery', 'runtime', 'bridge', 'consent', 'token', 'userInfo'];
  const ready = { versionId: id, snapshotHash: 'a'.repeat(64), concurrencyToken: id, appVersion: id, readyForReview: false,
    evaluatedAt: version.createdAt, sandboxRunId: null, configurationFingerprint: 'A'.repeat(64), blockingReasons: [], warnings: [],
    requiredChecks: keys.map(key => ({ key, applicable: true, status: 'NotImplemented', messageCode: 'MISSING_EVIDENCE', evidenceSource: 'Server', evidenceAt: null })) };
  assert.equal(parseReviewReadiness(ready).configurationFingerprint, ready.configurationFingerprint);
  assert.throws(() => parseReviewReadiness({ ...ready, requiredChecks: ready.requiredChecks.map(() => ready.requiredChecks[0]) }));
});

test('sealed Bridge server evidence is readable alongside legacy evidence and rejects unknown schemas', () => {
  const snapshot = { schemaVersion: 1, name: 'Bridge', category: 'utilities', logoUrl: null, shortDescription: null,
    description: null, websiteUrl: 'https://partner.example.com', domain: 'partner.example.com', privacyPolicyUrl: null,
    termsOfServiceUrl: null, supportEmail: null, ssoEnabled: false, sandbox: null, production: null };
  const keys = ['logo', 'name', 'category', 'description', 'website', 'domain', 'supportEmail', 'callbacks', 'privacyPolicy', 'termsOfService', 'environment', 'ssoClient', 'discovery', 'runtime', 'bridge', 'consent', 'token', 'userInfo'];
  const detail = { review: { id, versionId: id, versionCode: 1, status: 'PendingReview', submittedAt: version.createdAt,
    reviewStartedAt: null, decidedAt: null, concurrencyToken: id }, versionName: '1.0', snapshotHash: version.snapshotHash,
    snapshot, evidence: { schemaVersion: 2, versionId: id, snapshotHash: version.snapshotHash, sandboxRunId: id,
      configurationFingerprint: 'A'.repeat(64), evaluatedAt: version.createdAt,
      checks: keys.map(key => ({ key, applicable: true, status: 'Passed', messageCode: 'CHECK_PASSED', evidenceSource: 'ServerProtocol', evidenceAt: version.createdAt })) },
    reason: null, changes: [], actions: [] };
  assert.equal(parseReviewDetail(detail).evidence.schemaVersion, 2);
  assert.equal(parseReviewDetail({ ...detail, evidence: { ...detail.evidence, schemaVersion: 1 } }).evidence.schemaVersion, 1);
  assert.throws(() => parseReviewDetail({ ...detail, evidence: { ...detail.evidence, schemaVersion: 3 } }));
});

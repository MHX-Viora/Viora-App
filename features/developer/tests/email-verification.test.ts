import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmailVerification, verificationToken } from '../lib/email-verification';

test('reads only a valid base64url token from the fragment', () => {
  const token = 'a'.repeat(43);
  assert.equal(verificationToken('#token=' + token), token);
  for (const fragment of ['', '#token=short', '#token=' + '!'.repeat(43), '#other=' + token]) {
    assert.equal(verificationToken(fragment), null);
  }
});

test('StrictMode subscriptions share a single verification request', async () => {
  const token = 'a'.repeat(43); let calls = 0;
  const controller = createEmailVerification(token, async (path, method, body) => {
    calls++; assert.equal(path, 'auth/verify-email'); assert.equal(method, 'POST');
    assert.deepEqual(body, { token }); return {};
  });
  const first = controller.verify();
  assert.equal(controller.verify(), first);
  await Promise.all([first, controller.verify()]);
  assert.equal(calls, 1);
});

test('a failed request is retried only by explicit user action', async () => {
  let calls = 0;
  const controller = createEmailVerification('a'.repeat(43), async () => {
    if (++calls === 1) throw new Error('Synthetic network failure');
    return {};
  });
  await assert.rejects(controller.verify()); await assert.rejects(controller.verify());
  assert.equal(calls, 1);
  controller.retry(); await controller.verify(); assert.equal(calls, 2);
});

test('invalid tokens never reach the API', () => {
  assert.throws(() => createEmailVerification('short', async () => { throw new Error('Must not run'); }));
});

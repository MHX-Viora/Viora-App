import assert from 'node:assert/strict';
import test from 'node:test';
import { playVideoPreview } from './video-preview-playback.ts';

test('starts an audible preview when autoplay is allowed', async () => {
  const video = { muted: false, async play() {} };
  await playVideoPreview(video);
  assert.equal(video.muted, false);
});

test('falls back to muted autoplay when the browser blocks sound', async () => {
  let attempts = 0;
  const video = { muted: false, async play() {
    attempts++;
    if (!this.muted) throw new DOMException('User gesture required', 'NotAllowedError');
  } };
  await playVideoPreview(video);
  assert.equal(attempts, 2);
  assert.equal(video.muted, true);
});

test('does not hide decode or unsupported media failures by muting', async () => {
  let attempts = 0;
  const error = new DOMException('Unsupported media', 'NotSupportedError');
  const video = { muted: false, async play() { attempts++; throw error; } };
  await assert.rejects(playVideoPreview(video), error);
  assert.equal(attempts, 1);
  assert.equal(video.muted, false);
});

test('surfaces a blocked muted fallback so the UI can show a play button', async () => {
  const video = { muted: false, async play() { throw new DOMException('Blocked', 'NotAllowedError'); } };
  await assert.rejects(playVideoPreview(video), { name: 'NotAllowedError' });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { compile } from './tests/compile-fixture.mjs';

const React = createRequire(import.meta.url)('react');
function fixture() {
  const effects = [], calls = [], ref = { current: null };
  let handler, captureCode = 0, mixCode = 0;
  const engine = new Proxy({}, { get: (_, method) => (...args) => {
    calls.push([method, ...args]);
    if (method === 'registerEventHandler') handler = args[0];
    return method === 'startScreenCapture' ? captureCode : method === 'startLocalVideoTranscoder' ? mixCode : 0;
  } });
  const { HostAgoraPreview } = compile('features/live/host-agora-preview.native.tsx', {
    react: { ...React, useRef: current => ({ current }), useState: initial => [initial, () => {}], useEffect: fn => effects.push(fn), useImperativeHandle: (target, fn) => { target.current = fn(); } },
    'react-native': { View: () => null },
    'react-native-agora': { createAgoraRtcEngine: () => engine, RtcSurfaceView: () => null,
      ChannelProfileType: {}, ClientRoleType: {}, DegradationPreference: {}, OrientationMode: {}, RenderModeType: {}, StreamPublishState: { PubStatePublished: 3 }, VideoMirrorModeType: {}, VideoSourceType: { VideoSourceScreenPrimary: 2, VideoSourceCameraPrimary: 0, VideoSourceTranscoded: 10 } },
    './game-capture-service.native': { startGameCaptureService: () => calls.push(['foreground-start']), stopGameCaptureService: () => calls.push(['foreground-stop']) },
  });
  globalThis.__DEV__ = false;
  HostAgoraPreview.render({ appId: 'fixture', cameraOn: true, microphoneOn: true, facing: 'front', onReady() {}, onError() {}, onTokenWillExpire() {}, onScreenShareChanged: value => calls.push(['sharing', value]) }, ref);
  const cleanup = effects.map(fn => fn()).filter(Boolean);
  return { calls, ref, get handler() { return handler; }, set captureCode(value) { captureCode = value; }, set mixCode(value) { mixCode = value; }, cleanup: () => cleanup.forEach(fn => fn()) };
}

test('native game capture publishes screen and camera as one video and restores camera on stop', async () => {
  const f = fixture();
  const capture = f.ref.current.shareScreen();
  assert.equal(f.calls.findIndex(c => c[0] === 'foreground-start') < f.calls.findIndex(c => c[0] === 'startScreenCapture'), true);
  await f.ref.current.shareScreen(); // A second press does not start another capture.
  assert.equal(f.calls.filter(c => c[0] === 'startScreenCapture').length, 1);
  f.handler.onFirstLocalVideoFrame(2, 1920, 1080);
  await capture;
  const configuration = f.calls.find(c => c[0] === 'startLocalVideoTranscoder')[1];
  assert.equal(configuration.streamCount, 2);
  assert.deepEqual(configuration.videoInputStreams.map(s => s.sourceType), [2, 0]);
  const join = f.ref.current.join({ appId: 'fixture', role: 'broadcaster', channelName: 'room', uid: 1, token: 'test' });
  f.handler.onJoinChannelSuccess({}); f.handler.onVideoPublishStateChanged(10, 'room', 0, 3); await join;
  const options = f.calls.find(c => c[0] === 'joinChannel')[4];
  assert.equal(options.publishTranscodedVideoTrack, true); assert.equal(options.publishCameraTrack, false);
  f.handler.onLocalVideoStateChanged(2, 0);
  assert.ok(f.calls.some(c => c[0] === 'updateChannelMediaOptions' && c[1].publishCameraTrack && !c[1].publishTranscodedVideoTrack));
  assert.ok(f.calls.some(c => c[0] === 'foreground-stop'));
  f.cleanup();
});

test('native permission rejection and transcoder failure release capture and foreground service', async () => {
  for (const failMix of [false, true]) {
    const f = fixture();
    if (failMix) f.mixCode = -1; else f.captureCode = -2;
    const capture = f.ref.current.shareScreen();
    if (failMix) f.handler.onFirstLocalVideoFrame(2, 720, 1280);
    await assert.rejects(capture);
    assert.ok(f.calls.some(c => c[0] === 'foreground-stop'));
    assert.ok(f.calls.some(c => c[0] === 'stopScreenCapture'));
    assert.equal(f.calls.some(c => c[0] === 'sharing' && c[1]), false);
    f.cleanup();
  }
});

test('native closing a pending permission request rejects it and releases all capture resources', async () => {
  const f = fixture(), capture = f.ref.current.shareScreen();
  f.cleanup(); await assert.rejects(capture);
  assert.ok(f.calls.some(c => c[0] === 'stopLocalVideoTranscoder'));
  assert.ok(f.calls.some(c => c[0] === 'foreground-stop'));
});

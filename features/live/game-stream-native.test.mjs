import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { compile } from './tests/compile-fixture.mjs';

const React = createRequire(import.meta.url)('react');
function fixture({ cameraOn = true, showSharing = false } = {}) {
  const effects = [], calls = [], ref = { current: null };
  let handler, captureCode = 0, mixCode = 0, updateMixCode = 0, mediaCode = 0;
  const engine = new Proxy({}, { get: (_, method) => (...args) => {
    calls.push([method, ...args]);
    if (method === 'registerEventHandler') handler = args[0];
    return method === 'startScreenCapture' ? captureCode : method === 'startLocalVideoTranscoder' ? mixCode : method === 'updateLocalTranscoderConfiguration' ? updateMixCode : method === 'updateChannelMediaOptions' ? mediaCode : 0;
  } });
  const { HostAgoraPreview } = compile('features/live/host-agora-preview.native.tsx', {
    react: { ...React, useCallback: fn => fn, useRef: current => ({ current }), useState: initial => [typeof initial === 'boolean' ? showSharing : initial, () => {}], useEffect: fn => effects.push(fn), useImperativeHandle: (target, fn) => { target.current = fn(); } },
    'react-native': { View: () => null },
    'react-native-agora': { createAgoraRtcEngine: () => engine, RtcSurfaceView: () => null,
      ChannelProfileType: {}, ClientRoleType: {}, DegradationPreference: {}, OrientationMode: {}, RenderModeType: {}, StreamPublishState: { PubStatePublished: 3 }, VideoMirrorModeType: {}, VideoSourceType: { VideoSourceScreenPrimary: 2, VideoSourceCameraPrimary: 0, VideoSourceTranscoded: 10 } },
    './game-capture-service.native': { startGameCaptureService: () => calls.push(['foreground-start']), stopGameCaptureService: () => calls.push(['foreground-stop']) },
    './game-camera-drag': { GameCameraDrag: () => null },
  });
  globalThis.__DEV__ = false;
  const props = { appId: 'fixture', cameraOn, microphoneOn: true, facing: 'front', onReady() {}, onError() {}, onTokenWillExpire() {}, onScreenShareChanged: value => calls.push(['sharing', value]), onScreenShareError: () => calls.push(['share-error']) };
  const tree = HostAgoraPreview.render(props, ref);
  const cleanup = effects.map(fn => fn()).filter(Boolean);
  return { calls, ref, moveCamera: position => tree.props.children[1].props.onMove(position), get handler() { return handler; }, set captureCode(value) { captureCode = value; }, set mixCode(value) { mixCode = value; }, set updateMixCode(value) { updateMixCode = value; }, set mediaCode(value) { mediaCode = value; }, setCamera(value) { props.cameraOn = value; effects[2](); }, cleanup: () => cleanup.forEach(fn => fn()) };
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

test('native camera toggles during sharing update capture and retain game publication', async () => {
  const f = fixture({ cameraOn: false });
  try {
    const capture = f.ref.current.shareScreen();
    f.handler.onFirstLocalVideoFrame(2, 1280, 720); await capture;
    assert.equal(f.calls.find(c => c[0] === 'startLocalVideoTranscoder')[1].streamCount, 1);
    f.handler.onJoinChannelSuccess({});
    f.calls.length = 0;
    f.setCamera(true);
    assert.ok(f.calls.some(c => c[0] === 'enableLocalVideo' && c[1] === true));
    assert.ok(f.calls.some(c => c[0] === 'updateLocalTranscoderConfiguration' && c[1].streamCount === 2));
    assert.ok(f.calls.some(c => c[0] === 'updateChannelMediaOptions' && c[1].publishTranscodedVideoTrack && !c[1].publishCameraTrack));
    f.setCamera(false);
    assert.ok(f.calls.some(c => c[0] === 'enableLocalVideo' && c[1] === false));
    assert.equal(f.calls.filter(c => c[0] === 'updateLocalTranscoderConfiguration').at(-1)[1].streamCount, 1);
    await f.ref.current.stopScreenShare();
    assert.equal(f.calls.filter(c => c[0] === 'updateChannelMediaOptions').at(-1)[1].publishCameraTrack, false);
  } finally { f.cleanup(); }
});

test('native game live start ignores publication callbacks for stale camera frames', async () => {
  const f = fixture();
  try {
    const capture = f.ref.current.shareScreen();
    f.handler.onFirstLocalVideoFrame(2, 1280, 720); await capture;
    let published = false;
    const join = f.ref.current.join({ appId: 'fixture', role: 'broadcaster', channelName: 'room', uid: 1, token: 'test' }).then(() => { published = true; });
    f.handler.onJoinChannelSuccess({});
    f.handler.onFirstLocalVideoFramePublished({}); // Does not identify a video source.
    f.handler.onVideoPublishStateChanged(0, 'room', 0, 3);
    await Promise.resolve(); await Promise.resolve();
    assert.equal(published, false);
    f.handler.onVideoPublishStateChanged(10, 'room', 0, 3);
    await join;
    assert.equal(published, true);
  } finally { f.cleanup(); }
});

test('native rotation or publication failure restores camera and notifies the host once', async () => {
  for (const failure of ['rotation', 'publication']) {
    const f = fixture();
    try {
      const capture = f.ref.current.shareScreen();
      f.handler.onFirstLocalVideoFrame(2, 1280, 720); await capture;
      f.handler.onJoinChannelSuccess({});
      if (failure === 'rotation') f.updateMixCode = -1; else f.mediaCode = -1;
      f.handler.onVideoSizeChanged({}, 2, 0, 720, 1280);
      assert.ok(f.calls.some(c => c[0] === 'sharing' && c[1] === false));
      assert.equal(f.calls.filter(c => c[0] === 'share-error').length, 1);
      assert.ok(f.calls.some(c => c[0] === 'foreground-stop'));
      const count = f.calls.filter(c => c[0] === 'startLocalVideoTranscoder').length;
      f.handler.onFirstLocalVideoFrame(2, 1280, 720);
      f.handler.onLocalVideoTranscoderError();
      assert.equal(f.calls.filter(c => c[0] === 'startLocalVideoTranscoder').length, count);
      assert.equal(f.calls.filter(c => c[0] === 'share-error').length, 1);
    } finally { f.cleanup(); }
  }
});

test('native rotation keeps composition aligned with the captured screen', async () => {
  const f = fixture();
  try {
    const capture = f.ref.current.shareScreen();
    f.handler.onFirstLocalVideoFrame(2, 1920, 1080); await capture;
    f.handler.onVideoSizeChanged({}, 2, 0, 1080, 1920);
    const config = f.calls.find(c => c[0] === 'updateLocalTranscoderConfiguration')[1];
    assert.ok(config.videoOutputConfiguration.dimensions.height > config.videoOutputConfiguration.dimensions.width);
    assert.equal(config.streamCount, 2);
    const [screen, camera] = config.videoInputStreams;
    assert.equal(screen.width, config.videoOutputConfiguration.dimensions.width);
    assert.equal(screen.height + camera.height, config.videoOutputConfiguration.dimensions.height);
    assert.equal(camera.y, screen.height);
    assert.ok(camera.x >= 0 && camera.x + camera.width <= screen.width);
    await f.ref.current.stopScreenShare();
    const callsAfterStop = f.calls.length;
    f.handler.onVideoSizeChanged({}, 2, 0, 1920, 1080);
    f.handler.onFirstLocalVideoFrame(2, 1920, 1080);
    assert.equal(f.calls.length, callsAfterStop);
  } finally { f.cleanup(); }
});

test('native camera composition failure stops sharing and preserves disabled camera', async () => {
  const f = fixture();
  try {
    const capture = f.ref.current.shareScreen();
    f.handler.onFirstLocalVideoFrame(2, 1280, 720); await capture;
    f.handler.onJoinChannelSuccess({});
    f.updateMixCode = -1;
    f.setCamera(false);
    assert.equal(f.calls.filter(c => c[0] === 'share-error').length, 1);
    assert.equal(f.calls.filter(c => c[0] === 'enableLocalVideo').at(-1)[1], false);
    assert.equal(f.calls.filter(c => c[0] === 'updateChannelMediaOptions').at(-1)[1].publishCameraTrack, false);
    assert.ok(f.calls.some(c => c[0] === 'foreground-stop'));
  } finally { f.cleanup(); }
});

test('native stopping game capture before publication rejects live start', async () => {
  const f = fixture();
  try {
    const capture = f.ref.current.shareScreen();
    f.handler.onFirstLocalVideoFrame(2, 1280, 720); await capture;
    const join = f.ref.current.join({ appId: 'fixture', role: 'broadcaster', channelName: 'room', uid: 1, token: 'test' });
    const result = join.then(() => 'published', () => 'rejected');
    f.handler.onJoinChannelSuccess({});
    f.handler.onLocalVideoStateChanged(2, 0);
    f.handler.onVideoPublishStateChanged(0, 'room', 0, 3);
    assert.equal(await result, 'rejected');
  } finally { f.cleanup(); }
});

test('native camera strip stays separate from the clean screen across drag, rotation and camera toggle', async () => {
  const f = fixture({ showSharing: true });
  try {
    const capture = f.ref.current.shareScreen();
    f.handler.onFirstLocalVideoFrame(2, 1280, 720); await capture;
    const publications = f.calls.filter(c => c[0] === 'updateChannelMediaOptions').length;
    f.moveCamera({ x: 0, y: 0 });
    const config = f.calls.filter(c => c[0] === 'updateLocalTranscoderConfiguration').at(-1)[1];
    assert.equal(config.videoInputStreams[1].x, 0);
    assert.equal(config.videoInputStreams[1].y, 720);
    assert.equal(f.calls.filter(c => c[0] === 'updateChannelMediaOptions').length, publications);
    f.handler.onVideoSizeChanged({}, 2, 0, 1080, 1920);
    f.setCamera(false); f.setCamera(true);
    const rotated = f.calls.filter(c => c[0] === 'updateLocalTranscoderConfiguration').at(-1)[1];
    assert.equal(rotated.videoInputStreams[1].x, 0);
    assert.equal(rotated.videoInputStreams[1].y, 1080);
    f.updateMixCode = -1;
    f.moveCamera({ x: 1, y: 1 });
    assert.ok(f.calls.some(c => c[0] === 'share-error'));
  } finally { f.cleanup(); }
});

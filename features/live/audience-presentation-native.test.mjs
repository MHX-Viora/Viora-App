import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { compile } from './tests/compile-fixture.mjs';
const React = createRequire(import.meta.url)('react');
const p = { version: 1, width: 1280, height: 720, cameraOn: true, cameraX: .9, cameraY: .1 };
function render(presentation, decoded = { width: 1280, height: 892 }) {
  const values = [{ width: 375, height: 800 }, decoded, 1];let index = 0;
  const { AudienceAgoraView } = compile('features/live/audience-agora-view.native.tsx', {
    react: { ...React, useState: () => [values[index++], () => {}], useRef: current => ({ current }), useEffect() {} },
    'react-native': { View: 'View' },
    'react-native-agora': { RtcSurfaceView: 'Video', RenderModeType: { RenderModeFit: 2 }, VideoMirrorModeType: { VideoMirrorModeDisabled: 1 }, VideoViewSetupMode: { VideoViewSetupAdd: 1 } },
  });
  const tree = AudienceAgoraView({ access: { appId: 'test', channelName: 'room', uid: 9, token: 'test' }, presentation });
  const views = [];
  function walk(node) { if (!node || typeof node !== 'object') return; if (node.type === 'Video') views.push(node); React.Children.toArray(node.props?.children).forEach(walk); }
  walk(tree);return views;
}
test('native audience crops the clean screen and face strip, fitting both without cropping edges', () => {
  const views = render(p);
  assert.equal(views.length, 2);
  assert.deepEqual(views[0].props.canvas.cropArea, { x: 0, y: 0, width: 1280, height: 720 });
  assert.deepEqual(views[1].props.canvas.cropArea, { x: 0, y: 720, width: 306, height: 172 });
  for (const v of views) { assert.equal(v.props.canvas.renderMode, 2); assert.equal(v.props.canvas.setupMode, 1); }
});
test('native crop coordinates follow decoded resolution and disabled camera removes the second surface', () => {
  const views = render(p, { width: 640, height: 446 });
  assert.deepEqual(views[1].props.canvas.cropArea, { x: 0, y: 360, width: 153, height: 86 });
  assert.equal(render({ ...p, cameraOn: false }).length, 1);
  const legacy = render(null);
  assert.equal(legacy.length, 1);assert.equal(legacy[0].props.canvas.cropArea, undefined);assert.equal(legacy[0].props.canvas.renderMode, 2);
});

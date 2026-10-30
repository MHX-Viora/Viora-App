# Live game with camera inset

Current audience layout and game-video transport are described in
[responsive playback](live-responsive-playback.md). That follow-up replaces the
original baked inset with a separate camera region in the same encoded video and
adds authenticated presentation metadata. The notes below record earlier capture
and drag implementation history.

Implemented desktop web and Android host screen sharing. Device check and live
controls expose screen/game capture. Screen is the main image; camera is composed
at bottom right, above the controls. Camera toggle hides the inset. Existing mic
track carries voice; system/game audio capture is not included.

## Implementation

- Web: Agora screen video + camera MediaStream tracks → canvas → custom Agora
  video track. Explicit button gesture opens the browser capture permission flow.
  Publish one composed video under the existing host UID; viewer/backend unchanged.
- Android: Agora screen capture + local video transcoder. Publish only the
  transcoded video and existing mic. Size callbacks update composition on rotation.
- `modules/live-game-capture`: Expo-autolinked Android camera/microphone foreground
  service, started before the permission dialog while app is foreground. Agora's
  own service handles mediaProjection. Stop both capture and app service on
  cancellation, stop, failure, leave, or unmount. Manifest survives Expo prebuild.
- Denied/cancelled screen selection preserves camera mode; OS stop returns to
  camera. Pending selection blocks live start; live start/countdown blocks mode
  switching. Existing app install without the native module reports update needed.

## Platform status and remaining validation

- Web browser tests validate actual canvas MediaStream pixels (screen + inset),
  composed-track publication, camera toggle, denial, OS stop, and resource cleanup.
  Agora acquisition/transport are mocked; a real two-device Agora session remains
  to be checked. Desktop requires browser screen-capture support and secure origin.
- Android Kotlin module compilation and app manifest merge pass. Native SDK mock
  tests cover composition/publication, repeated press, denial, transcoder failure,
  stop, and pending-permission unmount. A **new native build** is required. Still
  validate on physical Android: permission dialog, moving into game, background
  camera/mic, rotation, OS stop, and viewer output. No APK/device run was performed.
- **iOS game capture outside the app is not implemented.** The repository has no
  ReplayKit Broadcast Upload Extension/App Group wiring. iOS attempts report this
  limitation before starting capture. Adding and signing that extension and
  validating iPhone background-camera limits is separate remaining native work;
  do not describe current iOS behavior as working screen/game broadcast.

## Checks

### Movable camera inset

- Hosts can drag the camera frame in screen-share preview/live on web and Android.
  The small "Kéo camera" button also cycles corners (including Enter activation).
  These host controls are not included in the broadcast.
- `game-camera-drag.tsx` maps gestures through the contained video frame, excluding
  letterboxing. `game-stream-layout.ts` clamps normalized placement within video
  bounds. Position is retained during the mounted host session, including camera
  toggles, screen-sharing restarts and Android rotation.
- Web canvas reads the latest position each frame. Android updates transcoder
  coordinates without stopping or republishing the video. Update failures follow
  the existing capture cleanup/error path.
- Host stage shade ignores pointer events so it cannot intercept drag controls.
- Verified: 12 game layout/native regression tests, actual Chrome mouse/touch
  drag and composed-video pixels, keyboard corner cycling, camera toggle retention,
  resize at 375/1280px and the host-room browser regression including hit testing.
  TypeScript and focused lint pass. Android Hermes export passes; physical-device
  dragging/background capture and a real two-device Agora stream remain unverified.

### Reliability follow-up — 2026-10-30

- Camera toggles now update native capture as well as the inset, then reapply
  transcoded publication. Stopping restores the current camera preference.
- Game live start waits for the transcoded source publication callback; stale
  camera callbacks cannot mark it published. Capture stopping during join rejects
  the pending start rather than accepting a subsequent camera callback.
- Rotation and camera inset updates check Agora return codes. Composition or
  publication failure releases screen/transcoder/service resources and reports
  the sharing error; failed camera restoration also reports a camera error.
- Stable callbacks prevent camera toggles from recreating the Agora engine.
- Verified: 20 tests across native game capture, game layout, host backdrop and
  SVGA regression files; `npx tsc --noEmit`; focused ESLint with zero warnings.
  Android production export including Hermes bytecode passes at
  `.codex-tmp/live-game-android-check` (not an installable APK).
  Native SDK calls are mocked. ADB listed no connected devices; physical Android,
  background capture and two-device Agora verification remain outstanding.
- Restricted worker spawning requires `--experimental-test-isolation=none` for
  Node tests and `--max-workers 1` for Expo export in this workspace. Hermes needs
  execution outside the restricted sandbox because spawning its compiler is blocked.

```sh
npx tsc --noEmit
npx eslint features/live/host-agora-preview.native.tsx features/live/host-agora-preview.web.tsx features/live/live-host-room.tsx features/live/live-host-screen.tsx features/live/game-stream-layout.ts features/live/game-stream-compositor.ts features/live/game-capture-service.native.ts
node --test --experimental-test-isolation=none features/live/game-stream.test.mjs features/live/game-stream-native.test.mjs
node features/live/game-stream.browser.mjs
cd android
./gradlew :ankt-live-game-capture:compileDebugKotlin :app:processDebugMainManifest
```

SDK contracts: installed react-native-agora 4.6.4 and agora-rtc-sdk-ng declarations.
References: [Agora native engine](https://agoraio-extensions.github.io/react-native-agora/classes/IRtcEngine.html),
[screen sharing](https://docs.agora.io/en/realtime-media/rtc/build/capture-and-render-video/screen-sharing).
Production gift-schema migration remains untouched and outside this feature.

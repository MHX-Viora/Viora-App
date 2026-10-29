# Live game with camera inset

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

```sh
npx tsc --noEmit
npx eslint features/live/host-agora-preview.native.tsx features/live/host-agora-preview.web.tsx features/live/live-host-room.tsx features/live/live-host-screen.tsx features/live/game-stream-layout.ts features/live/game-stream-compositor.ts features/live/game-capture-service.native.ts
node --test features/live/game-stream.test.mjs features/live/game-stream-native.test.mjs
node features/live/game-stream.browser.mjs
cd android
./gradlew :ankt-live-game-capture:compileDebugKotlin :app:processDebugMainManifest
```

SDK contracts: installed react-native-agora 4.6.4 and agora-rtc-sdk-ng declarations.
References: [Agora native engine](https://agoraio-extensions.github.io/react-native-agora/classes/IRtcEngine.html),
[screen sharing](https://docs.agora.io/en/realtime-media/rtc/build/capture-and-render-video/screen-sharing).
Production gift-schema migration remains untouched and outside this feature.

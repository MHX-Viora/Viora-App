# Responsive live playback

## Behavior

- Legacy/camera-only video uses contain/fit on web and native; screen edges are
  not cropped to fill a portrait phone.
- Game hosts publish one video containing a clean screen and a separate face
  strip beneath it. Host preview uses the original screen/camera with the existing
  draggable, unlabeled hit target. No second UID, token or microphone track.
- Audience renders the screen/face regions independently. Portrait small stages
  fit the game horizontally and put the face in the top/bottom spare band based
  on the host's normalized vertical position. With insufficient spare space or on
  desktop, use the host's inset placement. Camera off hides only the face region.
- Desktop video is centered with a 1100px cap. The existing blurred cover fills
  unused space. Gift banners and SVGA effects are centered near the bottom, above
  the composer; effects span the compact stage or cap at 620px on larger stages.

## Protocol / deployment

- Frontend `live-presentation.ts` and backend `LivePresentation` describe version 1
  screen dimensions, camera enabled state and normalized x/y position.
- `SetLivePresentation` validates dimensions/positions and permits only the live
  host. `LivePresentation` broadcasts updates; `JoinLive` includes the latest
  cached presentation for late viewers and reconnects. Frontend rejects malformed
  metadata and ignores events from other live rooms.
- Host coalesces drag changes and refreshes metadata every 10 seconds. Cache TTL
  is 45 seconds and uses the existing single-node in-memory realtime topology.
- Deploy the backend additions together with updated host/viewer clients. No DB
  migration or new package. Missing metadata falls back to fitting the whole
  video; older viewers can see the packed camera strip but cannot reflow it.
- Native crops use the installed SDK's `VideoCanvas.cropArea` and `setupMode=Add`,
  scaled to decoded frame dimensions. See [Agora VideoCanvas](https://agoraio-extensions.github.io/react-native-agora/classes/VideoCanvas.html).

## Verification

- 29 frontend tests: layout bounds/phone bands, clean packed sources, native crop
  coordinates at full/half decode resolution, disabled camera and legacy fit,
  metadata snapshot/reconnect/room isolation, existing capture/gift regressions.
- Browser tests exercise actual canvas MediaStreams and audience video crops:
  both screen edges visible in screenshot pixels, camera upper/lower placement,
  camera off/on, gift bounds and 320/375/430/768/1600px stages. Host drag/capture
  and host-room browser regressions pass. SVGA playback and Agora transport are
  fixture-backed; no real gift asset or production session was contacted.
- TypeScript and focused lint pass. Viewer screen retains a pre-existing
  `accessGeneration.current` cleanup warning. Backend authorization/validation/cache
  tests pass. Web export and Android Hermes export pass.
- Still requires physical Android two-device verification of native multi-view
  crops/background capture and an actual Agora session. iOS host screen sharing
  remains unsupported as documented in the original capture handoff.

Commands: `node --test --experimental-test-isolation=none features/live/*test.mjs`,
`node features/live/game-stream.browser.mjs`,
`node features/live/live-presentation.browser.mjs`,
`node features/live/live-host-room.browser.mjs`, `npx tsc --noEmit`.
Backend: `dotnet test Viora.Application.Tests/Viora.Application.Tests.csproj --filter FullyQualifiedName~LivePresentationTests`.

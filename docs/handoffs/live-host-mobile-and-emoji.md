# Host mobile web capture and emoji

- `web-screen-share-support.ts` checks secure context and the actual
  `getDisplayMedia` function. Unsupported browsers receive an explanation and an
  Android-app/desktop alternative at device check. The capture button is disabled
  independently from camera-live readiness; live controls omit unavailable capture.
  Direct preview capture calls are guarded before touching Agora/resources.
- This does not implement screen capture on browsers that lack the platform API.
  Chrome Android is unsupported in current [MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/MediaDevices.json).
  Detection remains capability-based so supporting browsers are not blocked solely
  because they are mobile. Native capture behavior is unchanged.
- `host-comment-composer.tsx` supplies a desktop popover/mobile sheet with the
  same 40 basic emojis as viewers. Both import `live-basic-emojis.ts`. Selecting
  appends to the draft; failed sends preserve it; pending sends cannot duplicate;
  disabling comments closes the picker and disables editing/emoji/send.
  Draft remains owned by the room so switching viewport layouts preserves unsent
  text. Desktop picker opens above the composer to stay within the room panel.
- Browser checks cover missing capture API without losing camera, restored desktop
  capture, camera-live readiness despite unsupported screen sharing, host emoji
  compose/send/retry and disabled-comment updates at 1440/375px. Screenshots are
  `.codex-tmp/host-emoji-*.png`. Permission acquisition/Agora are fixtures.
- TypeScript, focused ESLint and 20 capture/layout/realtime regression tests pass.
  Web production export passes.
  No backend or Android service changes. No physical phone permission/capture test
  was performed; unsupported browser capability cannot be enabled by deployment.

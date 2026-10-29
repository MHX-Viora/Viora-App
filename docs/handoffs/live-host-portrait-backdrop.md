# Live host portrait camera backdrop

- Spec: `docs/specs/live-host-portrait-backdrop.md`.
- Host stage places a blur-only LiveCoverBackdrop behind an active/ready camera,
  using settings.coverUri (selected live cover) or the default cover. Existing
  camera-off/not-ready full-cover presentation is retained.
- LiveCoverImage/LiveCoverBackdrop accept optional blurredOnly (default false).
  Blur-only hides the sharp foreground and retains load-error fallback through
  the blurred image's onError. Normal cover callers keep their current behavior.
- Web HostAgoraPreview uses getHostVideoFrame to fit and center its SDK container
  at the actual camera aspect ratio, with Agora fit=contain. This confines SDK
  black backgrounds to the camera area, revealing the cover around it.
  Track settings supply initial dimensions; video metadata/resize events update
  them on orientation/device changes. RN onLayout handles stage resizing.
  MutationObserver handles delayed/replaced player elements; all observers and
  listeners are removed on cleanup. Publishing/encoder settings are unchanged.
- Tests: contained-frame geometry, invalid dimensions, blur-only layers and
  image failure fallback passed. TypeScript/targeted ESLint passed. Chrome
  fixture checked portrait desktop/mobile, centered camera, selected cover blur,
  stage resize, landscape video resize, cover changes without camera remount,
  camera-off cover, existing controls and long-comment layout; screenshot reviewed.
- Browser checks mock Agora/devices/images; no real camera or live broadcast was
  used. Native Agora rendering and audience playback were not changed/tested.
  Existing RN Web pointerEvents/animation/shadow warnings are excluded in fixture.

```text
node --test features/live/live-host-backdrop.test.mjs
node .codex-tmp/live-host-backdrop.browser.mjs
npx tsc --noEmit
npx eslint features/live/host-video-frame.ts features/live/host-agora-preview.web.tsx features/live/live-cover-image.tsx features/live/live-cover-backdrop.tsx features/live/live-host-room.tsx features/live/live-host-backdrop.test.mjs
```

# Game livestream with camera inset

Responsive audience layout supersedes the original baked-inset transport below:
see [live-responsive-playback.md](live-responsive-playback.md).

Add a user-triggered screen sharing action to host device check and live controls.
Main video is the chosen screen/window (web) or system screen capture (native),
with a small camera inset at bottom right above controls. Publish one composed
video so existing viewers see both sources without a new channel/UID/backend.
Microphone audio remains the existing host audio. Permission rejection/cancel
keeps camera mode; browser/OS stop-sharing returns to camera. Camera toggle hides
only the inset while sharing. Prevent overlapping capture/switch requests,
disable starting live during selection, and release capture on leave/unmount.

Web: explicit button gesture invokes Agora screen capture, canvas composition
and custom video track. Native: Agora screen capture + local video transcoder;
respond to permission/capture callbacks and use transcoded preview/publication.
Android permission/service configuration must survive prebuild. iOS background
capture depends on ReplayKit support/signing in the native build and must be
validated on device; do not claim a camera-only fallback is screen capture.

Plan: layout/resource tests; web capture+composition; native capture+composition;
shared controls/state; mocked browser/SDK checks and TS/lint/native build checks
where possible. No backend schema or production DB changes.

## Android reliability acceptance (2026-10-30)

- Camera toggles update capture and composition while preserving screen publication.
- Live start waits for publication of the active video source, ignoring stale camera
  callbacks during game sharing.
- Rotation/composition/publication failures stop sharing, release capture resources,
  restore the configured camera state, and notify the host.
- Late screen callbacks after stop cannot restart composition.
- Verify with SDK regression tests, TypeScript and focused lint. Physical Android
  background capture and a real Agora viewer remain required device checks.

## Movable camera inset

Hosts can drag the camera inset within the shared video on web and Android,
before and during live. The composed broadcast uses the same position. Constrain
the inset to the video (excluding letterboxing); retain its relative position on
resize/rotation and camera off/on during the host session. Default stays bottom
right. Provide a keyboard/screen-reader accessible corner cycling action.

Implementation: normalized bounded layout + drag overlay, then web canvas and
Android transcoder integration. Verify bounds/rotation with unit tests, native
configuration with SDK tests, and mouse/touch plus actual broadcast pixels in a
browser. No backend or new dependencies.

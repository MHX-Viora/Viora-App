# Game livestream with camera inset

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

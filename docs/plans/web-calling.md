# Plan: Web calling

1. Add browser WebRTC adapter matching the existing voice-call signaling contract; test cleanup and media-state controls.
2. Replace the web voice-call unavailable screen with the existing call lifecycle plus browser media elements.
3. Replace the web group-call unavailable screen with a `livekit-client` room using server-issued join credentials.
4. Verify web routes exclude native LiveKit/WebRTC imports, then run the full test and lint suites.
5. Add a shared responsive call-surface layout and apply it to the incoming
   call host without changing native sizing.
6. Bring the one-to-one Web call presentation in line with native for outgoing,
   connecting, and active audio/video states; preserve browser media behavior.
7. Add UI contract coverage for call visuals, responsive sizing, status timing,
   and accessible controls.

## Risks

- Browser media permission or autoplay can block playback; present a visible error and require user-initiated join.
- TURN configuration comes from the existing ICE endpoint; deployments must expose valid STUN/TURN servers for cross-network calls.

# Calls handoff

## Scope

- One-to-one audio and video calls.
- REST owns durable `CallSession` state.
- `/hubs/realtime` delivers incoming, accepted, and terminal lifecycle events.
- `/hubs/calls` carries SDP, ICE, readiness, and reconnect signals.
- `react-native-webrtc` owns local and remote media.

## Required ordering

1. Receiver accepts through REST.
2. Receiver creates its peer and local media.
3. Receiver sends `CallAccepted` readiness through the call hub.
4. Caller creates and sends the SDP offer.
5. Receiver applies the offer, sends the answer, then drains queued ICE.
6. Caller applies the answer, then drains queued ICE.
7. UI enters `active` and starts the timer only after WebRTC reports `connected`.

Offer and ICE handlers must never discard events because the peer or remote
description is not ready. Peer creation is guarded by one shared promise.

## Media lifecycle

- Video callers create local media immediately for self-preview.
- Incoming-call notifications use the boosted bundled `nhac_chuong.mp3` on the
  receiver. Audio callers hear the same track as ringback until answer/timeout.
- Android incoming calls are FCM data-only, high-priority messages with a
  30-second TTL. The client owns presentation through Notifee's call category
  and full-screen action, avoiding Firebase's normal default-channel banner.
- Delayed call-screen navigation is cancelled on unmount to prevent stale
  `router.replace()` calls while the root navigator is unavailable.
- Notifee vibration durations must all be positive; a leading zero rejects
  channel creation and prevents both incoming UI notification and ringtone.
- Full-screen notification actions run only from background delivery. Foreground
  calls use `IncomingCallHost`, avoiding duplicate activity/wake-lock activation.
- Ringback cleanup relies on the audio hook's native release during unmount;
  effects never call `pause()` on an already released shared player.
- The audio-call screen has a 30-second local timeout. The backend
  `CallTimeoutHostedService` remains responsible for persisting missed status.
- Mic and camera buttons change the local track `enabled` state.
- Camera switching uses the native video track `_switchCamera`.
- Terminal realtime events close the peer and stop every local track, including
  while the call screen is minimized.
- The active-call store retains the peer so the banner can reopen the call.

## Verification

```powershell
cd viora
npx tsc --noEmit
npm run lint

cd ..\viora-BE
dotnet build viora-BE\viora-BE.csproj --no-restore
dotnet test Viora.Infrastructure\Viora.Infrastructure.Tests\Viora.Infrastructure.Tests.csproj --no-restore --filter "FullyQualifiedName~CallHubPolicyTests|FullyQualifiedName~PersistenceModelTests"
```

## Deployment requirement

STUN alone is not sufficient for reliable calls across carrier NAT, Wi-Fi/4G,
or restrictive networks. Configure a production TURN service with environment
variables:

```text
Calls__Turn__Url=turn:turn.example.com:3478
Calls__Turn__Username=<username>
Calls__Turn__Credential=<credential>
```

Do not commit TURN credentials. Keeping an ongoing call after the Android
process is killed requires a native foreground call service and system call UI;
the current JavaScript call store only survives navigation and backgrounding
while the process remains alive.

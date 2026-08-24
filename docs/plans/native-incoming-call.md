# Native incoming call on Android

## Problem

Incoming-call FCM is currently rendered by a React Native headless task and opens
`MainActivity`, which is globally configured to appear over the lock screen. A
cold JS start can delay the alert, while the broad activity flags expose more of
the app than the call surface.

## Contract

- SignalR owns foreground delivery; FCM remains a deduplicated fallback.
- A native FCM receiver renders `NotificationCompat.CallStyle` immediately when
  the app is not foregrounded.
- Full-screen intent targets a dedicated native `IncomingCallActivity` with
  `showWhenLocked` and `turnScreenOn`; it never dismisses the keyguard.
- Reject/answer notification and activity actions are forwarded into the existing
  RN Firebase headless handler. Reject calls the existing API; answer persists the
  call then opens the existing call route.
- Lifecycle FCM cancels both the native notification and native activity.
- If Android 14+ denies full-screen intent access, the same CallStyle notification
  remains as the supported expanded heads-up fallback.
- Native and JS delivery deduplicate by `callId`; no WebRTC implementation changes.

## Security boundaries

- Remove `SYSTEM_ALERT_WINDOW` and lock-screen flags from `MainActivity`.
- Do not call `requestDismissKeyguard` or use overlay windows.
- Keep FCM call payload private to app process and expire it after 30 seconds.
- Backend authentication remains in the existing RN service; native actions do
  not copy access tokens into plaintext preferences.

## Verification

- Static contract tests for manifest, receiver, CallStyle, actions and JS dedupe.
- TypeScript, lint and Android debug build.
- Physical-device matrix remains mandatory for Android 12–15: foreground,
  background, other app, locked, process killed, full-screen access denied,
  answer/reject, cancel, timeout and duplicate SignalR + FCM.

# Incoming call auto-open handoff

## Delivered

- Android incoming-call FCM is persisted before the full-screen notification is shown.
- Authenticated bootstrap restores the pending call before normal notification navigation is enabled, validates it is still `Calling`, then opens the existing incoming-call UI.
- Full-screen/notification-open and explicit answer are separate actions; automatic launch no longer accepts the call.
- SignalR and FCM delivery are deduplicated by `callId`; ended and active calls are ignored.
- Call lifecycle events, reject, accept, timeout, and modal cleanup remove matching persisted state.
- Cold-start validation preserves `callType`, so video calls restore as video.
- Backend always starts both SignalR and high-priority FCM delivery. The online registry is no longer used as a push gate.

## Verification

- Mobile tests: 12/12 passed.
- TypeScript: passed.
- ESLint: passed.
- Android `:app:assembleDebug`: passed.
- Production dependency audit: 0 vulnerabilities.
- Backend application tests: 22/22 passed.
- Backend build: passed with 0 warnings/errors.

## Device acceptance still required

No Android device was connected to ADB during implementation. Verify audio and video calls with the receiver in foreground, background, process-killed, and locked-screen states. Also verify accept, reject, caller cancel before answer, timeout, and duplicate SignalR + FCM delivery.

On Android 14+, full-screen intent access can be disabled or revoked for apps that are not recognized as calling/alarm apps. In that state Android falls back to an expanded heads-up notification; the app cannot bypass the OS/user setting.

## Relevant files

- `services/pending-incoming-call.service.ts`
- `features/notifications/notification-response-navigation.ts`
- `services/incoming-call-notification.service.ts`
- `services/incoming-call-notifee-events.ts`
- `features/calls/call-events.ts`
- `app/_layout.tsx`
- Backend: `Viora.Application/Calls/CallHandlers.cs`

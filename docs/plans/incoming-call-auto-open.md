# Implementation Plan: Incoming call auto-open

## Root cause
- Android call-channel/full-screen configuration already exists, but the call
  payload is only carried by a notification/open callback and in-memory event.
  A headless/killed process can therefore schedule the native call UI without
  leaving durable state for the newly started React process.
- The notification's automatic `fullScreenAction` shares the `Trả lời` action ID,
  so merely displaying the system incoming-call UI is handled as a user answer.
- `CallDeliveryService` skips FCM while SignalR's registry still says the receiver
  is online. During the foreground-to-background race, neither a usable realtime
  event nor an FCM wake-up is guaranteed.
- Cold-start validation rebuilds the event without `callType`, converting restored
  video calls to audio. Incoming events are not deduplicated by `callId`.

## Architecture decisions
- Persist only the sanitized incoming-call envelope and receive timestamp in
  SecureStore from the FCM background handler. Keep the 30-second call TTL and
  validate status through `GET /api/calls/{id}` before showing UI.
- Restore and validate this pending call during authenticated bootstrap before
  marking the app ready, so Home cannot become the final cold-start destination.
- Use distinct action IDs for automatic full-screen opening, notification-body
  opening, explicit Accept, and Reject.
- Always deliver the Android high-priority, data-only call FCM even when SignalR
  is connected; deduplicate client-side by `callId`.
- Keep existing Notifee, Firebase Messaging, Expo Router, and WebRTC libraries.

## Tasks

### Task 1: Pending-call durability
- Acceptance: background FCM stores a sanitized call envelope; terminal lifecycle
  messages clear the matching envelope; expired or malformed state is ignored.
- Verify: focused Node regression test and TypeScript.
- Files: pending-call service, background messaging handler, test runner.

### Task 2: Bootstrap priority and validation
- Acceptance: authenticated bootstrap restores pending state, validates `Calling`,
  preserves voice/video metadata, and emits incoming UI before launch splash exits.
- Verify: source regression test, TypeScript, existing call tests.
- Files: root layout, notification response navigation, focused test.
- Dependency: Task 1.

### Task 3: Native action semantics and dedupe
- Acceptance: automatic full-screen open does not accept/reject the call; explicit
  actions remain distinct; duplicate SignalR/FCM events do not create a second UI.
- Verify: focused tests and lint.
- Files: call events, Notifee notification/event services, tests.

### Task 4: Reliable server delivery
- Acceptance: one-to-one incoming calls publish both realtime and FCM; Android
  payload stays data-only, high-priority, 30-second TTL, with complete caller data.
- Verify: focused backend unit tests and build.
- Files: call delivery service and application tests.

## Native constraints
- Android 14+ may revoke default full-screen-intent access unless Google Play/user
  grants it to the calling app. The manifest permission and call-category/high
  channel remain required; denied devices fall back to an expanded heads-up call
  notification as required by Android.
- Physical-device foreground/background/killed/locked verification is required for
  release sign-off. No Android device was attached to ADB during implementation.

## Checkpoint
- `npm test`, `npx tsc --noEmit`, `npm run lint`.
- Android config/build verification confirms permission, locked-screen activity,
  high call channel, full-screen action, and data-only high-priority FCM.
- Backend focused tests and build pass.

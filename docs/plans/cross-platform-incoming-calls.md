# Implementation plan: cross-platform incoming calls

## Architecture decisions

- Extend the existing Call flow; do not add a new call API or hub.
- Keep the shared realtime connection alive for hidden Web tabs while preserving native background behavior.
- Reuse Firebase device tokens for Web Push and use a small additive service worker.
- Make `Calling -> Accepted` a conditional database update so the backend remains the race-condition authority.
- Identify the winning realtime connection in the accept request and ignore `CallAnsweredElsewhere` only on that connection.

## Files intentionally not modified

- `services/chat-*`, `features/chat/*`: realtime message, list, unread, typing, and conversation behavior.
- Backend `RealtimeHub`, connection registry, SignalR user mapping, chat handlers, friendship, presence, notification, post/reaction, and group-chat contracts.
- Existing event names and payloads outside the Call module.

## Tasks

### Task 1: Web tab lifetime and pending-call recovery

- Acceptance: hidden Web tabs keep SignalR; incoming payloads persist in session storage; refresh restores only after server validation.
- Verify: focused frontend contract/unit tests.
- Files: root layout, pending-call service, realtime Call listener, tests.

### Task 2: Web notification and closed-tab push

- Acceptance: hidden tabs set title/show browser notification; cleanup restores title; FCM Web token registers with the existing backend; service-worker clicks focus/open the call URL without accepting.
- Verify: Web platform tests, TypeScript, Web export.
- Files: Web push/notification adapters, service worker, environment example, tests.

### Checkpoint

- Frontend focused tests and typecheck pass.

### Task 3: Atomic acceptance and answered elsewhere

- Acceptance: only one `Calling -> Accepted` update succeeds; accepted connection is identified; other receiver connections get `CallAnsweredElsewhere`; non-participants remain forbidden.
- Verify: backend tests/build plus frontend lifecycle tests.
- Files: call controller/contracts/handler/repository, frontend call REST/realtime services, tests.

### Task 4: End-to-end cleanup and regression

- Acceptance: terminal and answered-elsewhere events stop ringtone, clear pending UI, and close media; listener registration remains single-instance.
- Verify: full frontend tests/typecheck/lint/export and backend tests/build.
- Files: Call host/events/screens only if a failing test proves a gap.

## Risks and mitigations

- Browser autoplay can block ringtone: never fail the call UI; browser notification/title remain available.
- Notification permission requires user interaction: registration is best effort and never auto-accepts.
- Web Push requires HTTPS (except localhost), Firebase Web config, and VAPID key: document as deployment requirements.
- Accept/cancel races: use an atomic conditional database update and treat a lost transition as conflict.
- Shared realtime regression: only add Call handlers beside existing Call handlers; do not change connection/reconnect or non-call events.


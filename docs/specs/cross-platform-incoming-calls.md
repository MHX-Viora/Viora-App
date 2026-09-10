# Cross-platform incoming calls

## Objective

Complete the existing one-to-one call system so authenticated Android and Web clients can call and receive across App-App, App-Web, Web-App, and Web-Web without changing unrelated realtime behavior.

## Existing architecture

- REST `/api/calls` owns durable call state and participant authorization.
- `/hubs/realtime` delivers `IncomingCall`, `CallAccepted`, and terminal lifecycle events to every connection mapped by SignalR `Clients.User`.
- `/hubs/calls` carries WebRTC readiness, SDP offer/answer, ICE, and reconnect signals.
- React Native and browser-specific WebRTC adapters share the same call identifiers and event contract.
- `IncomingCallHost` is mounted at the root, outside chat routes.

## Commands

- Frontend tests: `npm test`
- Frontend types: `npx tsc --noEmit`
- Frontend lint: `npm run lint`
- Frontend Web export: `npx expo export --platform web`
- Backend tests: `dotnet test Viora.Application.Tests/Viora.Application.Tests.csproj --no-restore`
- Backend build: `dotnet build viora-BE/viora-BE.csproj --no-restore`

## Project structure

- `app`, `components/calls`, `features/calls`: global incoming and active call UI.
- `services`: REST, SignalR, browser notification/push, pending-call persistence, and WebRTC adapters.
- `types`: existing call contracts.
- `docs/specs`, `docs/plans`, `docs/handoffs`: requirements, tasks, and final audit.
- `../viora-BE/Viora.Application/Calls`: call commands and delivery only.
- `../viora-BE/Viora.Infrastructure/Persistence/Repositories`: atomic call state transitions.
- `../viora-BE/viora-BE/Controllers`: authenticated call endpoints.

## Code style

Keep platform behavior isolated behind `.web.ts` adapters and preserve existing event names:

```ts
connection.on("CallAnsweredElsewhere", (payload) => {
  if (!isAcceptedOnThisConnection(payload, connection?.connectionId)) {
    handleCallLifecyclePayload(payload, "CallAnsweredElsewhere");
  }
});
```

## Testing strategy

- Pure/source contract tests first for background-tab lifetime, pending-call persistence, notification cleanup, listener uniqueness, and Web push registration.
- Backend unit tests for delivery and accepted-device propagation where existing test boundaries allow it.
- Backend build validates the PostgreSQL atomic transition implementation.
- Full frontend regression suite protects message, unread, navigation, notification, and call behavior.

## Boundaries

- Always: authenticate from JWT, authorize call participants, validate `CallId` and state, stop ringtone/media on terminal events, preserve listener cleanup.
- Ask first: database migrations, a new push provider, a new TURN service, or shared realtime architecture changes.
- Never: rename unrelated events, change chat payloads, log JWT/push tokens/SDP, hard-code TURN credentials, auto-accept or auto-enable media from push.

## Success criteria

- Active and background Web tabs receive incoming calls without refresh.
- Hidden Web tabs show an in-app overlay, title indicator, ringtone when allowed, and browser notification when permission exists.
- Closed Web tabs can receive an FCM Web Push after the user grants notification permission and deployment supplies Firebase Web/VAPID configuration.
- Refresh/reconnect restores only a still-ringing call after server validation.
- Exactly one device can transition a call from `Calling` to `Accepted`; other receiver connections close via `CallAnsweredElsewhere`.
- Audio/video WebRTC uses existing offer/answer/ICE contracts and always releases tracks/peer state.
- Existing App-App and non-call realtime tests/builds remain unchanged and pass.

## Deployment assumptions

- Firebase Admin and device-token storage remain the only push backend.
- Firebase Web identifiers and VAPID public key are deployment configuration; no credential is committed.
- TURN remains optional backend configuration through `Calls:Turn`; this task does not provision infrastructure.


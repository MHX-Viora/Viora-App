# Spec: Web calling

## Objective

Enable authenticated web users to join the existing one-to-one audio/video and group-call flows. Web calls must use the current backend contracts and fail clearly when browser media permission or connection setup is unavailable.

## Tech stack

- Expo Router / React Native Web
- `@microsoft/signalr` for one-to-one signaling
- Browser WebRTC APIs for one-to-one media
- Existing `livekit-client` for group-call media

## Commands

- Test: `npm test`
- Lint: `npm run lint`
- Web dev: `npm run web`

## Project structure

- `features/calls/*.web.tsx`: browser-specific call screens
- `services/*.web.ts`: browser media adapters
- `components/calls/`: shared call UI helpers

## Boundaries

- Always: request media only after the user enters a call; disconnect and stop tracks on leave; preserve native call screens.
- Ask first: new backend endpoints, database changes, or packages.
- Never: expose LiveKit credentials or bypass call authorization.

## Success criteria

- Web voice/video routes connect with existing SignalR signaling and ICE configuration.
- Web group-call route joins with the server-issued LiveKit URL and token.
- Users can toggle microphone, camera (video calls), and leave.
- Media tracks and LiveKit rooms are released on unmount.
- Native-only SDKs remain absent from web bundles.
- One-to-one outgoing, incoming, connecting, and active-call states use the
  same backdrop, avatar halo, typography, status hierarchy, and control
  treatment as the native app.
- Desktop Web centers the call experience in a phone-proportioned surface;
  compact Web uses the full viewport.
- Active one-to-one calls show an elapsed timer; video calls retain remote
  full-frame video and a local picture-in-picture preview.

## Verification

- Unit tests cover platform-specific call routes and cleanup contracts.
- `npm test` and `npm run lint` pass.

# Spec: ANKT Web PWA

## Objective

Make the existing Expo Web SPA installable as ANKT on supported desktop and mobile browsers without changing native apps, APIs, authentication, SignalR, WebRTC, or call behavior.

## Tech Stack

- Expo SDK 54 / Expo Router 6, React Native Web
- Browser Web App Manifest, Service Worker, Cache API, install events
- Existing Firebase Messaging compatibility worker for background incoming calls

## Commands

- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web export: `npx expo export --platform web`

## Project Structure

- `public/`: SPA HTML template, manifest, icons, and the single shared Firebase/PWA worker
- `features/pwa/`: pure browser/platform policy
- `services/`: Web-only install and Service Worker lifecycle
- `components/pwa/`: compact install, update, and offline UI
- `docs/`: plan and technical handoff

## Code Style

```ts
export type PwaInstallState =
  | "unavailable"
  | "installable"
  | "installing"
  | "installed";
```

Use typed, additive modules; React Native primitives and existing theme tokens; no new dependency.

## Testing Strategy

- Node tests for platform detection, state policy, manifest, worker safety, and UI integration contracts.
- Existing full suite for regressions.
- Typecheck, lint, production Expo Web export, output-file inspection, and browser runtime smoke.

## Boundaries

- Always: preserve the existing call notification click route and one-worker architecture; cache only public static same-origin responses; clear one-shot install prompts.
- Ask first: dependencies, hosting changes, backend/API/auth/realtime contract changes.
- Never: cache private/API/auth/SignalR/WebRTC traffic; auto-accept calls; force reload during an active call; show install UI in native apps or installed mode.

## Success Criteria

- Manifest names ANKT, uses standalone `/` scope/start URL, current theme colors, and valid 192/512 official-logo icons.
- Chromium install prompt is user-triggered; `appinstalled` and standalone detection hide the action; iOS Safari receives concise manual instructions.
- Existing Firebase background message and single `notificationclick` behavior remain present.
- Static shell/assets work conservatively offline; private and realtime requests are never cached.
- A waiting worker exposes an explicit update action that defers reload while a voice call is active.
- Production export contains linked manifest, icons, and worker; existing tests/build checks pass.

## Open Questions

None. The supplied implementation request defines the behavior and authorizes direct implementation.

# Spec: Chat push and resume synchronization

## Objective

Keep chat notifications, conversation previews, and the global unread badge correct when Android backgrounds or removes Viora from Recent Apps. HTTP APIs remain the source of truth after a disconnected period; SignalR only accelerates live updates.

## Commands

- Typecheck: `npx tsc --noEmit`
- Lint: `npx eslint <changed files>`
- Android runtime: `npx expo run:android`
- Logs: `adb logcat | Select-String "\[Push\]|\[ChatSync\]|FirebaseMessaging|ReactNativeJS"`

## Project Structure and Style

- `services/`: FCM, API, and synchronization orchestration.
- `features/chat/`: screen state and realtime event subscriptions.
- `utils/`: observable unread-count state.
- `app/`: application lifecycle and tab presentation.
- Use typed functions, structured logs, bounded module state, and existing service/store patterns.

## Testing Strategy

The repository has no automated test runner. Guard behavior with pure typed helpers where practical, then run TypeScript, ESLint, Expo config, and an ADB device scenario. Do not add a testing dependency solely for this fix.

## Boundaries

- Always: dedupe concurrent sync, avoid full-token logs, treat HTTP as resume truth.
- Ask first: new dependencies or backend contract changes outside the existing unread-summary work.
- Never: attempt to bypass Android Force stop or show duplicate local/FCM notifications.

## Success Criteria

- Background handler is registered before Expo Router and displays data-only messages once.
- One RN Firebase token source is used and refreshed against the stable device ID.
- Cold start/resume refreshes chat unread summary and requests conversation refresh.
- Conversation list refreshes on focus and replaces stale first-page data.
- Mark-read refreshes the global badge; realtime updates cannot overwrite a total with a per-conversation count.
- Notification taps queue until navigation is ready.

## Dependency

Backend must expose `GET /api/chat/unread-summary` returning `totalUnreadCount` and persist/update conversation unread state independently of SignalR.

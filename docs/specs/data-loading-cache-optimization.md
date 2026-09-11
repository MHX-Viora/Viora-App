# Spec: Data loading and cache optimization

## Objective

Make ANKT/Viora render previously loaded data immediately and revalidate it in the background, prioritizing Chat/Messaging and Sticker. Reduce duplicate HTTP requests without changing backend contracts, navigation, authentication, business rules, or SignalR protocol/connection behavior.

## Assumptions

- Scope is the React Native + Web frontend in `viora`; `viora-BE` is read-only unless an existing endpoint cannot satisfy an acceptance criterion.
- Existing paginated chat APIs (`page`, `pageSize`) remain unchanged.
- The existing module-store pattern is extended; Zustand and new dependencies are not introduced.
- Message history is an in-memory, session-scoped cache. Large message histories are not persisted to AsyncStorage.
- Sticker pack/detail metadata and recent stickers are small enough for bounded AsyncStorage persistence; image binaries remain in the image library cache.
- SignalR remains intact. Existing events update local caches where their payload is sufficient; reconnect/resume may request bounded background revalidation.

## Current diagnosis

- `chat-screen.tsx` owns messages in component state initialized to `[]`; every remount calls page 1 and enables full-screen loading.
- Message page requests have no shared single-flight deduplication. Rapid A -> B -> A navigation can issue concurrent duplicate requests.
- Pagination deduplicates message IDs while merging, but only inside the mounted screen state.
- Text/attachment sends are optimistic and retain failed rows. Sticker sends are optimistic but delete the failed row, so retry is unavailable.
- `sticker-panel.tsx` remounts with empty state, fetches packs again, refetches pack detail on every selection/remount, and uses one blocking `loading` state.
- Sticker panel images use React Native `Image` even though `expo-image` is installed and used elsewhere.
- Conversation list has a session memory cache, but focus always refreshes page 1 and realtime new-message notification only patches unread count, not last-message metadata.
- Reconnect/resume emits a conversation-list sync request by design. This must remain a bounded background refresh, not become a room-history reload.
- No Zustand dependency or store exists in the frontend. Session-scoped module stores are the established local pattern.
- Feed, Profile, Notifications, article detail, friends, and search flows contain mount-driven fetches. Their data volatility and ownership differ, so they require a separate classified audit rather than one global cache policy.

## Tech stack

- Expo 54, React Native 0.81, React 19, Expo Router 6
- TypeScript 5.9
- `@microsoft/signalr` 10
- `@react-native-async-storage/async-storage` 2.2
- `expo-image` 3
- Node built-in test runner with TypeScript stripping

## Commands

- Tests: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint changed files: `npx eslint <changed-files>`
- Web export: `npx expo export --platform web`
- Android build/runtime when an Android SDK/device is available: `npx expo run:android`

## Project structure

- `features/chat/`: conversation/message screens and realtime subscriptions
- `features/stickers/`: sticker panel and recent-sticker behavior
- `services/`: HTTP clients and synchronization orchestration
- `stores/`: bounded cache state and persistent-storage adapters
- `types/`: unchanged API/domain contracts
- `docs/specs/`, `docs/plans/`, `docs/handoffs/`: requirements, tasks, and final evidence

## Code style

Follow current typed module-store conventions and immutable updates:

```ts
setMessageCache(conversationId, (entry) => ({
  ...entry,
  messages: mergeMessages(entry.messages, incoming),
  lastFetchedAt: Date.now(),
}));
```

- Use explicit loading phases (`initialLoading`, `loadingMore`, `backgroundRefreshing`).
- Keep cache keys scoped by resource/query identity.
- Bound persisted collections and validate parsed storage data.
- Avoid new abstractions unless shared by at least the required chat/sticker consumers.

## Cache policy

| Resource | Cache | TTL / refresh policy |
|---|---|---|
| Messages by conversation | Memory, session-scoped | Render immediately; background revalidate page 1 after 30 seconds or explicit resume/reconnect |
| Message page requests | In-flight single-flight map | Deduplicate identical conversation/page/pageSize requests until settlement |
| Conversation list | Existing memory cache | Render immediately; background revalidate page 1 after 30 seconds, manual refresh always allowed |
| Sticker pack list | Memory + AsyncStorage metadata | 60 minutes |
| Sticker pack detail | Memory + AsyncStorage metadata | 60 minutes per pack |
| Recent stickers | Existing bounded AsyncStorage list | Immediate read; update after successful send |
| Sticker/avatar/media binaries | `expo-image` memory/disk cache | URL-keyed library policy; no base64 and no bulk preload |

## Testing strategy

- Add pure unit tests for cache merge/deduplication, TTL decisions, single-flight behavior, and stale-response isolation.
- Add source-contract tests for screen integration where the repository currently uses them.
- Run the full Node suite, TypeScript, targeted ESLint, and a production web export.
- Android manual runtime evidence is required only when the environment has an SDK/device; otherwise report it explicitly as not executable.
- Verify SignalR handlers and API URLs/contracts are unchanged through diff review and existing realtime tests.

## Boundaries

- Always: cache-first render, bounded caches, immutable ID dedupe, race-safe request ownership, session cleanup, web-safe persistence, and background errors that preserve cached UI.
- Ask first: backend/API/schema changes, new dependencies, persistent message database, or changes to session/auth storage.
- Never: rewrite SignalR, change hub/auth/API/message contracts, persist large binary/media payloads, preload all stickers, or remove current chat capabilities.

## Success criteria

- Reopening A or navigating A -> B -> A renders cached messages without a blank/full-screen loader.
- Page 1 revalidation occurs in the background only when stale or explicitly requested, and identical in-flight requests collapse to one HTTP call.
- Pagination prepends/merges older data without duplicate IDs or cross-room overwrite.
- Active-room SignalR message/delivery/delete events update both displayed state and the room cache without full-history refetch.
- Text, attachment, location, and sticker optimistic messages reconcile by server ID; failures remain visible with a retry path.
- Reopening the sticker panel renders cached packs/detail immediately; stale metadata refresh does not cover cached content with a spinner.
- New-message notifications update conversation unread count and last-message metadata locally without fetching the whole conversation list.
- Existing realtime, read receipts, notifications, group chat, DM blocking, pinning, forwarding, stickers, and call signaling continue to pass tests.
- Feed/Profile/Notifications/Friends/Search/Articles/Mini Apps are classified as realtime, semi-static, or static, with findings and scoped follow-up recommendations; only proven, low-risk duplicate-fetch fixes are included in this change.
- Web export succeeds and Android verification status is reported accurately.

## Open questions

- Whether product requires message history after a full app restart. If yes, this needs a separate local-database decision; AsyncStorage is intentionally excluded for large histories.
- Whether a physical/emulated Android device is available for the required manual acceptance run.


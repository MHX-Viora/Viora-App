# Handoff: Chat and sticker local-first persistence

## Delivered

- Native Local DB: Expo SQLite, WAL, schema version 2, parameterized writes, account-scoped keys.
- Web/PWA Local DB: IndexedDB with platform-isolated adapter and compound indexes.
- Memory layer: Zustand-backed, room-scoped caches with independent initial/background/load-more state.
- Chat: memory -> Local DB -> incremental server revalidation; Local DB-first older pagination.
- Realtime/optimistic: ID/client-render reconciliation, idempotent upsert, failure state and retry preserved.
- Conversations and stickers: cached render before stale-while-revalidate; sticker media remains URL-only and uses `expo-image` memory/disk cache.
- Backend: optional `afterMessageId` and `beforeMessageId` on the existing compatible endpoint.

## Storage and eviction

| Data | Native | Web | Bound |
|---|---|---|---|
| Messages | `messages` SQLite table | `messages` IndexedDB store | 5,000 per account/room on disk; 1,000 per active room in memory |
| Conversations | `conversations` table | `conversations` store | 500 per account |
| Sticker list pages | `sticker_pages` table | `stickerPages` store | 24 per account |
| Sticker details | `sticker_details` table | `stickerDetails` store | 96 per account |

No media bytes, base64, access tokens, or refresh tokens are stored in this database. Logout clears the current account's persisted and memory cache. Database errors degrade to the existing server/memory path.

## Synchronization behavior

1. Room entry renders Zustand memory immediately when present.
2. Otherwise it reads the newest persisted page and removes the full-screen loader.
3. Stale rooms request messages after the newest confirmed local message; responses upsert by server ID.
4. Scrolling older reads persisted rows before the current `(createdAt, messageId)` cursor, then calls the server only after local exhaustion.
5. SignalR events patch message and conversation state directly; no full-room reload is introduced.

The backend keeps `page`/`pageSize` behavior for old callers. Cursor requests are scoped to an active conversation member, reject simultaneous before/after cursors, and return bounded pages.

## Verification

- `npm test`: 305/305 passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npx expo export --platform web`: passed after the IndexedDB v2 quota/index migration.
- Web bundle inspection: IndexedDB adapter present; no Expo SQLite import in the browser bundle.
- Repository quota test: passed (message/account isolation, cursors, metadata eviction).
- `git diff --check`: passed in frontend and backend; only line-ending notices.
- `.NET` test/build: not verified. Two attempts produced no output and did not terminate, so their exact spawned processes were stopped and the command was not retried unchanged.

## Remaining runtime checks

- Run `dotnet test viora-BE.sln --disable-build-servers` in a working .NET environment.
- Smoke-test cold start, A -> B -> A, offline older pagination, reconnect, and logout isolation on one Android and one iOS device.
- Confirm the database query plan uses the message owner/conversation/time index on production-like PostgreSQL and SQLite data volumes.

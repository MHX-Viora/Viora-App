# Spec: Chat and sticker local-first persistence

## Objective

Complete the existing cache-first chat work with a real persistent database on
Android/iOS and Web/PWA. Cached room, conversation, and sticker metadata must
render before network revalidation. PostgreSQL remains authoritative.

## Stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript 5.9.
- Native persistence: `expo-sqlite` with WAL and versioned migrations.
- Web persistence: IndexedDB with versioned object stores and compound indexes.
- Memory state: Zustand vanilla store exposed through the existing cache API.
- Media: URLs/metadata only in the database; `expo-image` owns binary caching.

## Commands

- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Web/PWA build: `npx expo export --platform web`
- Backend test: `dotnet test viora-BE.sln`
- Backend build: `dotnet build viora-BE.sln --no-restore`

## Project structure

- `data/chat-local/`: repository contract and platform adapters.
- `stores/`: bounded Zustand memory state and compatibility functions.
- `services/`: REST single-flight and synchronization orchestration.
- `features/chat/`, `features/stickers/`: local-first consumers.
- `docs/`: audit, plan, and final handoff.

## Contract and style

```ts
interface ChatLocalRepository {
  initialize(): Promise<void>;
  getRecentMessages(ownerId: string, conversationId: string, limit: number): Promise<ChatMessage[]>;
  getOlderMessages(ownerId: string, conversationId: string, before: MessageCursor, limit: number): Promise<ChatMessage[]>;
  upsertMessages(ownerId: string, messages: ChatMessage[]): Promise<void>;
}
```

All reads/writes are account-scoped. Writes are idempotent. Storage failures are
logged in development and fall back to memory/server behavior.

## Testing strategy

- Pure contract tests for merge, deduplication, cursors, and request ownership.
- Source-contract tests for platform isolation and local-first screen flow.
- Backend tests for backward-compatible `afterMessageId`/`beforeMessageId` query behavior.
- Full TypeScript, lint, web export, .NET build/test; runtime device checks only when available.

## Boundaries

- Always: stale data remains renderable; server-confirmed state wins; parameterized SQL; bounded reads.
- Ask first: destructive server migrations or auth/call changes.
- Never: message history in AsyncStorage/Zustand persist; media binary/base64 in the DB; native imports in the web adapter.

## Success criteria

- A -> B -> A renders from memory without clearing A.
- Restarted app renders recent room/list/sticker metadata from Local DB before server response.
- Revalidation requests only messages after the latest confirmed local message.
- Older pagination reads Local DB first and reaches server only when local history is exhausted.
- REST, POST response, and SignalR converge by message ID/client correlation without duplicates.
- Android/iOS adapter and Web/PWA adapter compile without cross-platform imports.

## Approved scope

The user-provided task is the authoritative approved specification. Auth, refresh
tokens, and calling remain outside this change.

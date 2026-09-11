# Plan: Data loading and cache optimization

## Architecture decisions

- Extend the current module-store approach instead of adding Zustand.
- Put cache merge, TTL, and in-flight request ownership in testable modules; screens consume these modules but keep UI-only state local.
- Keep message history in memory and persist only bounded sticker metadata/recent items.
- Treat SignalR payloads as incremental cache mutations. Keep resume/reconnect HTTP sync bounded and background-only.

## Phase 1: Message cache foundation

- [x] Task 1: Add message cache state and merge helpers.
  - Acceptance: entries are keyed by conversation ID; IDs dedupe; page metadata and timestamps remain room-local; session clear removes all entries.
  - Verify: focused unit tests fail before implementation and pass after it.
  - Files: `stores/message-cache.ts`, `stores/message-cache.test.mjs`, `stores/session-store.ts`, `scripts/test.mjs`.
  - Dependencies: none.

- [x] Task 2: Add single-flight message-page loading.
  - Acceptance: identical in-flight requests share one promise; different rooms/pages remain independent; settled requests leave the map.
  - Verify: deterministic service tests plus TypeScript.
  - Files: `services/chat.service.ts`, `services/chat-message-request.test.mjs`, `scripts/test.mjs`.
  - Dependencies: Task 1.

### Checkpoint 1

- [x] Focused tests pass.
- [x] TypeScript passes.
- [x] No API URL, query, auth, or response mapper changed.

## Phase 2: Chat screen integration

- [x] Task 3: Hydrate and revalidate room messages cache-first.
  - Acceptance: cached room content is initial state; only uncached rooms show full loading; stale page 1 refresh is background-only; A -> B -> A cannot overwrite another room.
  - Verify: source-contract and cache behavior tests; manual navigation when runtime is available.
  - Files: `features/chat/chat-screen.tsx`, `features/chat/chat-message-load-policy.test.mjs`, `stores/message-cache.ts`.
  - Dependencies: Tasks 1-2.

- [x] Task 4: Route realtime and optimistic mutations through the room cache.
  - Acceptance: ReceiveMessage/delivered/deleted update cache without history refetch; optimistic server reconciliation dedupes; failed sticker remains retryable.
  - Verify: existing realtime/send tests plus new mutation tests.
  - Files: `features/chat/chat-screen.tsx`, `stores/message-cache.ts`, related chat tests.
  - Dependencies: Task 3.

- [x] Task 5: Harden pagination and scroll preservation.
  - Acceptance: repeated end-reached events do not duplicate requests; older pages merge once; existing inverted-list position behavior does not regress.
  - Verify: focused pagination/dedupe tests and runtime spot check.
  - Files: `features/chat/chat-screen.tsx`, `stores/message-cache.ts`, related tests.
  - Dependencies: Task 3.

### Checkpoint 2

- [x] Chat tests, full Node suite, TypeScript, and targeted ESLint pass.
- [x] Diff confirms no SignalR service/protocol rewrite.

## Phase 3: Sticker cache

- [x] Task 6: Add persistent, bounded sticker metadata cache.
  - Acceptance: pack list/details use a 60-minute TTL, validate stored data, dedupe in-flight requests, and degrade safely on storage failure.
  - Verify: RED/GREEN tests for fresh, stale, malformed, and concurrent cases on web-safe storage.
  - Files: `stores/sticker-cache.ts`, `stores/sticker-cache.test.mjs`, `services/sticker.service.ts`, `scripts/test.mjs`.
  - Dependencies: none.

- [x] Task 7: Make the sticker panel cache-first and use image caching.
  - Acceptance: cached packs/detail never show a blocking loader; background refresh preserves content; `expo-image` handles URL-based memory/disk caching; only visible pack thumbnails/items load.
  - Verify: sticker panel tests, TypeScript, ESLint, web export.
  - Files: `features/stickers/sticker-panel.tsx`, sticker panel tests.
  - Dependencies: Task 6.

### Checkpoint 3

- [x] Open-close-open sticker scenario is covered by cache-first integration tests.
- [x] No binary/base64 payload is stored.

## Phase 4: Conversation list and app-wide audit

- [x] Task 8: Make conversation revalidation TTL-aware and patch previews from realtime.
  - Acceptance: cached list renders immediately; focus refresh respects 30-second freshness; explicit resume/reconnect remains background; new-message notification patches last message, timestamp/order, and unread count without list GET.
  - Verify: conversation cache and realtime notification tests.
  - Files: `stores/conversation-list-cache.ts`, `features/chat/conversations-screen.tsx`, related tests.
  - Dependencies: none.

- [x] Task 9: Audit remaining app data flows and apply only proven low-risk fixes.
  - Acceptance: Feed/Profile/Notifications/Friends/Search/Articles/Mini Apps are classified; duplicate requests, reset-before-fetch, race guards, and recommended TTLs are documented; any code fix is isolated and tested.
  - Verify: targeted tests for each changed flow; unchanged flows are reported, not broadly rewritten.
  - Files: maximum five files per isolated follow-up slice plus audit documentation.
  - Dependencies: Chat/Sticker checkpoints.

## Phase 5: Verification and handoff

- [x] Task 10: Run full quality gates and produce the requested report.
  - Acceptance: test/typecheck/lint/web export results are recorded; Android status is explicit; modified files, TTLs, deduped calls, realtime mutations, removed calls, persistence, and deferred work are listed.
  - Verify: self-review across correctness, simplicity, architecture, security, and performance.
  - Files: `docs/handoffs/data-loading-cache-optimization.md`.
  - Dependencies: Tasks 1-9.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stale response overwrites a different room | High | Key cache and request identity by conversation/page; never write through current-screen identity alone |
| Realtime and HTTP produce duplicates | High | Central ID-based upsert/merge tests |
| Cached first page drops locally pending messages | High | Preserve pending/failed items during revalidation and reconcile by server/client render ID |
| AsyncStorage grows without bound | Medium | Persist sticker metadata only, bound recent items, version keys, validate reads |
| Resume sync is accidentally removed | High | Preserve explicit sync request path; make it background and single-flight |
| Web storage/image incompatibility | High | Use current cross-platform dependencies and run production web export |
| Existing source-contract tests are brittle | Medium | Add behavioral unit tests for new cache modules; update contract tests only for intentional integration changes |

## Approval gate

Implementation starts after the assumptions, cache policy, boundaries, and task order in this spec/plan are approved.

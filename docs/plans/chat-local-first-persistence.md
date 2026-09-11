# Plan: Chat and sticker local-first persistence

## Audit root causes

- Message and conversation caches are bounded memory maps, so process restart loses data.
- Sticker metadata is persisted as one AsyncStorage JSON snapshot rather than queryable local records.
- Room freshness skips only short-term reloads; stale rooms fetch page 1 rather than deltas.
- Older-message pagination never checks local persisted history first.
- Backend message listing has offset pages only; no additive incremental cursor.
- Screen-local React state mirrors the cache, so mutation ownership is split rather than Zustand-led.

## Architecture decisions

- Preserve existing public cache functions while moving their backing state to Zustand.
- Add one repository contract with `.native.ts` SQLite and `.web.ts` IndexedDB adapters.
- Store typed JSON payloads plus indexed owner/conversation/message/time columns; never store media bytes.
- Add optional `afterMessageId` and `beforeMessageId` to the existing endpoint and response shape.
- Keep page parameters for old clients. Cursor mode is additive and server-authoritative.

## Tasks

### Phase 1: Persistent foundation

- [x] Add repository contract, schema version, native SQLite adapter, and web IndexedDB adapter.
  - Acceptance: account-scoped upsert/read for messages, conversations, sticker pages/details; indexes and migrations exist.
  - Verify: repository/source-contract tests, TypeScript, web export.
- [x] Move the bounded memory cache to Zustand without breaking existing callers.
  - Acceptance: per-room state, LRU eviction, dedup, retries, and session clear remain behavior-compatible.
  - Verify: existing cache tests plus new state tests.

### Phase 2: Local-first consumers

- [x] Hydrate room messages from Local DB before initial server loading and persist API/realtime/optimistic mutations.
  - Acceptance: cached data suppresses full-screen loading; A/B request ownership remains isolated.
  - Verify: focused room-flow tests and typecheck.
- [x] Read older local messages before server pagination and preserve list identity.
  - Acceptance: cached older rows merge once; server runs only after local exhaustion.
  - Verify: cursor/dedup tests.
- [x] Hydrate/persist conversation list and sticker metadata through the repository.
  - Acceptance: restart data renders first; stale refresh remains background; AsyncStorage no longer stores sticker metadata.
  - Verify: conversation/sticker tests and web build.

### Phase 3: Incremental server synchronization

- [x] Add backward-compatible `afterMessageId`/`beforeMessageId` query parameters and repository filters.
  - Acceptance: old page clients are unchanged; cursors are membership-scoped and bounded.
  - Verify: backend tests and build.
- [x] Use latest confirmed local ID for room background synchronization.
  - Acceptance: stale reopen does not redownload the current page; deltas upsert idempotently.
  - Verify: request-contract and merge tests.

### Phase 4: Verification and handoff

- [x] Run available quality gates and self-review correctness, architecture, security, and performance.
  - Frontend gates pass. Backend test execution hangs in this environment and is recorded in the handoff.
- [x] Update final handoff with exact files, schemas, policies, measurements, test limits, and remaining risks.

## Checkpoints

- Foundation: focused tests + TypeScript + Web/PWA export.
- Local-first integration: all frontend tests/lint + static request-count evidence.
- Cursor backend: .NET tests/build + backward-compatibility review.
- Complete: clean diffs in both repositories and final handoff.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Native module enters web bundle | Platform-specific adapter files; web export gate |
| Data leaks between accounts | `ownerId` in every key/index and read predicate |
| Local DB failure blocks chat | catch/log locally, retain memory/server fallback |
| POST and SignalR duplicate | server ID plus `clientRenderId` reconciliation/upsert |
| Cursor misses equal timestamps | stable timestamp+ID ordering, overlap-safe ID upsert |
| DB grows without bound | metadata-only rows, per-owner retention cleanup, no binary payloads |

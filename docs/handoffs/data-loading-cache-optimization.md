# Data loading and cache optimization handoff

## 1. Summary

Chat messages, conversation previews, and stickers now use cache-first stale-while-revalidate loading. The change keeps the existing REST and SignalR contracts, adds request coalescing, prevents cross-room stale writes, retains failed optimistic messages for retry, and bounds persisted sticker metadata.

## 2. Root causes

- Chat room state started empty on every mount and always blocked on page 1.
- Identical message/list/detail requests had no shared in-flight ownership.
- Message cache mutations existed only inside a mounted screen.
- Sticker pack/detail data was discarded when the panel closed; a single loading flag covered usable cached content.
- Conversation focus always refreshed, and new-message events patched only unread counts.
- Failed sticker sends were removed instead of remaining actionable.

## 3. Implemented changes

- Session memory message cache keyed by conversation, with page metadata, 30-second freshness, ID merge/dedupe, and session cleanup.
- Cache-first room initialization; stale page 1 revalidates without replacing cached UI with a loader.
- Room/request identity guards stop A -> B -> A responses from writing into the wrong screen.
- Shared single-flight requests for message pages, conversation queries, sticker lists, and sticker details.
- HTTP, SignalR, delivered/deleted/edited/updated/reaction payloads, and optimistic updates converge through room-local immutable cache updates when the existing payload mapper recognizes a complete message.
- Text, attachment, location, and sticker failures remain visible and can be tapped to retry; successful responses reconcile optimistic IDs with server IDs.
- Conversation cache uses a 30-second TTL. Focus respects freshness; explicit reconnect/resume still performs bounded background sync.
- New-message notifications patch preview text/time/order and unread count locally.
- Sticker list/detail metadata uses memory plus AsyncStorage, a 60-minute TTL, version/shape validation, and oldest-entry eviction (12 list queries, 48 details).
- Sticker panel/store split initial/detail/background loading and preserve cached content on refresh failure.
- Sticker thumbnails and chat sticker images use `expo-image` with `memory-disk` caching. No binary or base64 data is persisted.

## 4. Loading before and after

| Flow | Before | After |
|---|---|---|
| Reopen room A | Empty state + blocking page-1 GET | Cached room immediately; background GET only when stale |
| A -> B -> A | Repeated GETs; component-local ownership | Per-room cache + single-flight + active-room guard |
| Older messages | Local ID dedupe only | Per-room page merge/dedupe; repeated identical request coalesced |
| Reopen stickers | Packs/details fetched again; shared spinner | Persisted metadata immediately; stale refresh stays non-blocking |
| Conversation focus | GET on every focus | Fresh cache skips GET for 30 seconds |
| Incoming preview | Unread count only | Preview/time/order/unread patched without list GET |
| Failed sticker | Optimistic row removed | Failed row retained with retry |

## 5. Cache inventory and TTL

| Resource | Storage | Policy |
|---|---|---|
| Messages | Session memory | 30s; keyed by conversation; cleared on logout |
| Conversation list | Session memory | 30s; manual/reconnect refresh bypasses focus freshness |
| Sticker list/detail metadata | Memory + AsyncStorage | 60m; max 12 query pages and 48 pack details; cleared on logout |
| Recent stickers | Existing bounded AsyncStorage | Updated after successful send/retry |
| Sticker/media images | `expo-image` memory/disk | URL-keyed library cache |

## 6. Removed or deduplicated calls

- Removed unconditional page-1 room GET on a fresh cached remount.
- Removed unconditional conversation-list GET on each focus inside the freshness window.
- Coalesced concurrent duplicate `conversation/page/pageSize`, conversation query, sticker filter page, and sticker detail requests.
- Removed repeat sticker detail GETs while metadata is fresh.
- Incoming message preview updates no longer require a conversation-list refetch.

## 7. Realtime cache mutations

- `ReceiveMessage`, recognized `MessageEdited`/`MessageUpdated`, and recognized reaction payloads upsert by server message ID.
- `MessageDelivered` patches delivery state locally.
- `MessageDeleted` removes/patches the affected local row through the existing event contract.
- New-message notifications reorder and update conversation previews.
- Resume/reconnect behavior and SignalR connection/protocol/authentication are unchanged.
- Typing and presence events remain unchanged because the repository has no typed UI/cache contract for them.

## 8. Persistence and invalidation

- Large message histories are intentionally not persisted. A local database decision is required if restart persistence becomes a product requirement.
- Sticker metadata is versioned, validated on read, bounded, and discarded on logout. Image bytes remain outside AsyncStorage.
- Optimistic retry payloads are memory-only and cleared after reconciliation or logout.
- Chat/conversation data invalidates through current mutations and bounded revalidation; no global cache reset was added.

## 9. App-wide audit

| Module | Class | Finding and recommendation | Change now |
|---|---|---|---|
| Chat / conversations | Realtime | Highest duplicate-fetch/blank-state cost | Implemented |
| Stickers | Semi-static | Safe persistent metadata; image URLs cacheable | Implemented |
| Feed / reels | Realtime | Already has request-ID race protection and pagination; mutation-aware keyed caching needs its own invalidation design | Deferred: memory cache per category/sort, 30-60s |
| Notifications | Realtime | Page-1 mount fetch plus realtime updates; read/unread consistency is the main invalidation boundary | Deferred: session memory cache, ~30s |
| Profile / user profile | Semi-static aggregate | Multiple parallel mount calls; posts/reels/statistics have separate mutation owners | Deferred: per-user summary 2-5m with explicit post/profile invalidation |
| Friends / following | Frequently changing | Tab/query changes reset before fetch; request ownership should be hardened | Deferred: keyed 60s cache + request-ID/single-flight |
| Search | Ephemeral | Feed search already debounces and guards request order; persistence would be wasteful | Keep ephemeral; optional in-flight dedupe only |
| Articles | Semi-static | Reader/editor refetch by ID; reading analytics must remain independent | Deferred: article-by-ID memory cache, ~5m |
| Mini Apps / weather | Semi-static external | Weather/location refetches on mount; abort handling exists | Deferred: location-keyed 5-10m SWR cache |

These deferred modules were not broadly rewritten because each needs mutation-aware invalidation and separate acceptance tests; a global cache would risk stale social state.

## 10. Verification

- `npm test`: 282/282 passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npx expo export --platform web`: passed; production output generated.
- Production Web smoke test: `/login` rendered, all local JS/font/image/manifest requests returned 200, and no JavaScript console errors were present. Authenticated Chat scenarios could not be exercised in the clean browser session.
- Android: debug APK built, installed as ANKT 1.0.12 (versionCode 13), and launched on physical V2058; `MainActivity` remained foreground with no recent AndroidRuntime/ReactNative fatal errors.
- Automated tests cover cache merge/dedupe, TTLs, eviction, request single-flight contracts, cache-first integration, retry, realtime routing, and conversation preview mutation.

## 11. Deferred work and risks

- Manually verify authenticated A -> B -> A, open-close-open Sticker, failed-send retry, and deep pagination on Web and Android with test accounts/data.
- Add a typed typing/presence state only if product UI requires it; do not infer payload shapes.
- Profile/feed/notification/friend/article/weather caches should be separate slices with mutation-specific invalidation.
- The login shell currently starts an unauthenticated feed request; investigate independently because it is outside the authenticated Chat/Sticker cache path.

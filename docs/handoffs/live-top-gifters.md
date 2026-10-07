# Live Top Gifters Handoff

## Delivered

- `LiveTopGifters` now shows every sender with `totalGiftCount > 0` in the desktop supporters tab. On phone and portrait tablet, the small trigger opens a bottom sheet with the complete list immediately.
- Each row shows crown/silver/bronze or numeric rank, the existing avatar fallback, truncated name, gift count, and Xu spent. The existing `VerifiedBadge` renders when `isVerified` is true.
- `sortLiveTopGifters` ranks by `totalCoin`, while `formatGiftCoinTotal` formats K/M Xu. Mock data lives in `live-view-mock-data.ts` and can be replaced as a single prop.

## Integration boundary

- No Live Gift transaction API, ranking endpoint, or SignalR `GiftReceived` event exists in this client/backend. The component reorders when its `gifters` prop changes, but cannot receive live backend updates until those contracts exist. It never fabricates a gift transaction or reloads the media.

## Verification

- Earlier focused sort/format tests passed. The latest change passed `npx tsc --noEmit`; a fresh browser review has not been run.

# Live Gift Event overlay redesign

## Objective
Show backend-confirmed Live gifts as compact, translucent banners on video, separate from comments. Both host and viewer use the same overlay on Web and React Native.

## Acceptance
- Show at most two banners at once; later events wait in FIFO order and appear when a slot closes. Ignore duplicate transaction IDs.
- Gifts from the same sender and gift type within 2.5 seconds update one visible or queued combo, add quantities, retrigger the count pop and extend its visible lifetime. Other gifts remain separate.
- Use the sender avatar/name, real gift image/name and confirmed quantity. Tier color derives from confirmed per-unit coin value: under 20 blue, 20–99 pink, 100+ warm gold. No optimistic success event or comment insertion.
- Banners enter from the right with opacity/scale, gift and count pop on quantity change, then exit after 3.8 seconds (4.8 seconds for high-value gifts). Respect reduced-motion settings where supported.
- Desktop/tablet: right half of the stage, away from top information and chat. Narrow/mobile: compact banner above comments, below top information. No interaction interception.
- Live comment bubbles, chat panel separators and comment composers use borderless translucent surfaces; non-Live comment UI is unchanged.

## Tech and structure
- Existing Expo Router / React Native Web, `Animated`, `expo-image`, `expo-linear-gradient` only if already installed; otherwise use existing SVG gradient utilities. No backend or database change.
- `features/live/live-gift-overlay-model.ts`: deterministic queue/combo state transitions.
- `features/live/live-gift-overlay.tsx`: queue manager hook, memoized overlay and banner.
- Host/viewer room retain their existing `LiveGift` SignalR subscription.

## Commands and tests
- Focused: `node --experimental-strip-types features/live/live-gift-overlay-model.test.mjs`
- Full: `npm test`; types: `npx tsc --noEmit`; lint: `npx expo lint`.
- Browser/device: inspect 320, 768, 1024 and 1440-pixel layouts, gift burst, console, and overlap when authenticated Live is available.

## Boundaries
- Always: preserve existing Gift API, transaction confirmation, comments and Live controls.
- Ask first: new dependencies, backend contract changes or persistence.
- Never: synthesize gift success before backend confirmation or store overlay events persistently.

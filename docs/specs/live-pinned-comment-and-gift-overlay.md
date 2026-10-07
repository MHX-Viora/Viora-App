# Live pinned comment and gift overlay

## Objective
Show five rolling comments plus at most one host-pinned comment above them on mobile Live. A pinned comment stays visible as newer comments arrive; it is not counted among the five. The host can replace or unpin it, and all viewers (including reconnecting viewers) see the same pin. Gift notifications sit clear of the comment stack and resemble the supplied compact left-side pill with sender avatar, real gift image, quantity, and entrance/exit motion.

## Commands and structure
- Frontend: `npm test`, `npx tsc --noEmit`, targeted `npx eslint`; `features/live/` and `services/live-realtime.service.ts`.
- Backend: `dotnet test`; `Viora.Application/Live/`, `Viora.Infrastructure/Live/`, `Viora.Infrastructure/Realtime/`.
- Tests are colocated `.test.mjs` on frontend and `Viora.Application.Tests/Live/` on backend.

## Style and boundaries
Use existing React Native `StyleSheet` and SignalR patterns. Keep pin state transient like current Live comments; do not add a database migration or dependency. Only the Live host may set or clear a pin. Deleting a pinned comment clears the pin. Avoid changing unrelated chat or gift-payment behavior.

## Verification
- Five newest unpinned comments plus pinned sixth render on host and viewer mobile overlays.
- Pin, replace, unpin, delete, and reconnect synchronize correctly; only host may pin.
- Gift overlay has real avatar and gift artwork, animates, and stays above comments.
- Unit tests, typecheck, lint, and backend tests pass; browser spot-check when an authenticated Live is available.

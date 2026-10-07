# Live Stream Discovery

## Goal

Add a theme-aware discovery page for currently live creators, reachable from the home category row immediately after Báo.

## Scope

- Add a dedicated Live route and a category button on the home header.
- Show a colorful, responsive discovery page with a hero, category filters, live counts, creator details, and stream cards.
- Keep all temporary stream records in one mock-data file with no API/service dependency so the data can later be deleted or replaced.
- Apply existing theme tokens in Light and Dark modes.

## Out of scope

Playback, joining streams, creator APIs, persistence, and changes to bottom navigation.

## Acceptance

- Home category order ends Báo → Live and Live opens its own page.
- The page renders a useful empty/filtered state and filters mock streams locally.
- Layout adapts to narrow and wide viewports and uses the active app theme.
- Stream data is isolated in one removable file.

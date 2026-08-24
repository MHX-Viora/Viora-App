# Handoff: Profile desktop workspace

## Delivered

- Reduced personal and viewed-user profile content to 760px on desktop.
- Added a large-desktop personal-profile shell with a 240px friends rail, 760px content column, and 320px settings rail.
- Expanded that shell to a 1920px ceiling with an 8px gutter so both desktop rails sit close to the viewport edges.
- Left rail loads up to eight accepted friends through the existing friends API and includes Friends/QR actions, loading, empty, error, and retry states.
- Settings sheet supports inline presentation while retaining the existing mobile modal presentation.
- Profile video thumbnails now use a container-relative three-column grid instead of sizing from the full browser window.
- Mobile/native and desktop widths below 1440px keep the prior single-column behavior.

## Verification

- `npm test`: 77/77 passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npx expo export --platform web`: passed.
- Runtime screenshot verification unavailable because no browser session was connected.

## Notes

- No API, route, dependency, or friend business-rule changes.
- The working tree already contained unrelated/untracked Web work; no commit was created.

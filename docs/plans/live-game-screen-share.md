# Live game reliability

Continue the existing screen-sharing spec; retain one published video and mic.

- [x] Reproduce Android camera toggles, stale publication acknowledgements, rotation
   failures and late capture callbacks using the existing native SDK fixture.
- [x] Fix capture/publication state and propagate composition failures. Each failure
   must release screen/service resources and preserve the host camera preference.
- [x] Run native/layout regressions, TypeScript and focused lint; review the diff and
   update the handoff with results and remaining device validation.

No dependencies, backend changes, credentials or iOS extension work in this slice.

## Movable inset

- [x] Add normalized position/clamping and a shared drag overlay mapped through
  video letterboxing, with an accessible corner cycling action.
- [x] Connect web canvas and Android transcoder positions; preserve placement
  across camera toggles and rotation without republishing the video track.
- [x] Verify layout/native regressions, real browser mouse/touch and pixel output,
  keyboard corner changes, host-stage hit testing, TypeScript and focused lint.

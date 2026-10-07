# Live host toolbar — Effect / Beauty removed

Date: 2026-10-06.

## Scope and dependency review

- Effect and Beauty entry points existed only in `features/live/live-host-room.tsx`; the separate `LiveHostSetup` form had neither button.
- Both implementations were local boolean state plus translucent `View` overlays. No camera filter, Agora SDK call, service or shared implementation depended on them.
- Removed the two buttons, their state/rendered overlays/styles, and the mobile `Khác` toggle/state that only expanded these controls. Removed its expanded comment offset.
- Retained controls: preflight has microphone, camera, camera switch; live adds management and end. Countdown retains its previous overlay/cancel behavior.
- Equal flex widths fill the row at every supported viewport; small mobile controls remain 44px high. No placeholders or disabled buttons remain.
- No new service was disabled. Camera/Agora adapters, media tracks, permission logic, publish/join/leave/renew/reconnect flow, backend and shared gift code were not modified.
- Gift cinematic playback remains disabled as requested in the preceding task; static right-side sender/gift/×quantity banners remain enabled.

## Files

- `features/live/live-host-room.tsx`: remove local UI implementation and unused expansion state; adjust toolbar and comment layout.
- `features/live/live-host-ui.tsx`: equal flex widths for `HostIconButton` (dependency scan found its callers only in the host room).
- `features/live/live-host-toolbar.test.mjs`: render regression across seven desktop/tablet/mobile sizes and check/countdown/live phases; callback wiring, preview props, readiness, comment submission and gift queue.
- `scripts/test.mjs`: register toolbar regression and existing camera-frame tests, which were previously absent from this runner.
- `scripts/host-toolbar-preview.tsx`: isolated presentation harness with actual host setup/room components; explicitly demo data, no real media publishing or financial operations.
- This handoff.

## Verification

- TypeScript: `npx tsc --noEmit` passed.
- Full frontend suite: 542 passed, no failures/skips.
- Full Expo lint completed; Live/service ESLint: zero errors, six pre-existing warnings in other Live files. Changed-file ESLint: zero errors/warnings.
- Production web export: passed using `npx expo export --platform web --max-workers 1 --output-dir .codex-tmp/host-toolbar-web`.
- Backend Live/Wallet regression: 145 passed, five PostgreSQL integration tests skipped because `LIVE_GIFT_TEST_POSTGRES_ADMIN` is not configured; no backend changes.
- Browser UI: emulated 320×568, 360×800, 390×844, 768×1024, 844×390 and 1440×900. Actual CSS viewport differs due browser zoom. Setup/preflight/live inspected; retained controls have equal widths and no horizontal overflow. No Effect/Beauty/Khác buttons and no console errors after the final change.

| Requested regression | Evidence | Limit |
| --- | --- | --- |
| Prepare Live | Actual setup/preflight UI and setup validation tests | Demo presentation; no authenticated preparation |
| Start Live | Readiness and callback tests; backend lifecycle regression | No real publish/channel join |
| Camera preview | Camera frame tests and unchanged adapter prop wiring | No physical camera/video frame observed |
| Camera on/off | UI labels and callbacks checked in browser/tests | No SDK track mute observed on hardware |
| Camera front/back | UI callback/state checked | No physical device switch observed |
| Microphone on/off | UI labels/callbacks checked | No actual audio heard or muted |
| Viewer join/leave | Existing audience/realtime lifecycle tests | No second authenticated client |
| Comment | Existing buffer/realtime tests and host submit callback test | No cross-account delivery observed |
| Gift sending | Existing payment, deduplication and wallet regression | No actual payment executed |
| Gift animation | Intentionally remains disabled; browser banner ×2, zero canvas/active animation | Previous user requirement preserved |
| Viewer count | Existing realtime tests; count UI retained | No actual join/leave count transition observed |
| End Live | Existing terminal-status/realtime tests; end callback in UI checked | No real session ended |
| Agora reconnect | Existing audience reconnect/republish/token lifecycle tests passed | No actual network interruption tested |

## HOST → VIEWER limitation

The user signed in using Edge. The connected DevTools browser is separate: both isolated HOST/VIEWER test tabs still showed `/login`. The agent cannot access those Edge sessions through the available connector. Therefore authenticated HOST → VIEWER, real video/audio and real Agora reconnect have **not been verified**; presentation harness and SDK mocks are not substitutes for that test. Native device testing is also pending.

# Implementation Plan: ANKT Web

## Progress (2026-08-24)

- Checkpoints A-C and desktop Chat master-detail are implemented and verified locally.
- Backend CORS is environment-driven and tested; production origin configuration is pending.
- Google Web auth, secret rotation, authenticated browser regression, and mobile release regression remain gated by owner/platform input.

## Architecture decisions

- Extend the existing Expo Router application; do not create a second Web app.
- Put platform behavior behind `.native`/`.web` modules with stable shared exports.
- Add one responsive hook and layout token set; screens consume semantic values rather than repeated width checks.
- Preserve current route names and API/SignalR contracts.
- Add desktop wrappers around existing feature components; keep domain components shared.
- Treat Web import/static-render safety as the first implementation risk.
- Export Web as a single-page app and retain the Vercel direct-route rewrite; per-route SSG conflicts with client-only icon fonts and the auth redirect lifecycle.

## Phase 1: Web-safe platform foundation

### Task 1: Add Web-safety tests for root platform services

- Acceptance: tests demonstrate that notification, pending-call, and session adapters can be imported in Web mode without initializing native SDKs.
- Verify: targeted test fails before implementation, then passes.
- Likely files: new adapter tests and existing service entry points (maximum five per increment).
- Dependencies: none.

### Task 2: Split notifications and incoming-call integration by platform

- Acceptance: native implementations retain current behavior; Web exports safe equivalents; root layout does not transitively initialize Firebase/Notifee during static rendering.
- Verify: targeted tests, `npm test`, `npx tsc --noEmit`, first successful root Web render attempt.
- Dependencies: Task 1.

### Task 3: Add persistent cross-platform session storage

- Acceptance: native still uses SecureStore; Web uses a browser-safe persistent implementation accessed only in Web code; malformed sessions remain rejected.
- Verify: adapter tests cover save/read/delete/malformed data and SSR-safe import.
- Dependencies: Task 1.

### Checkpoint A

- Unit tests and typecheck pass.
- Web export progresses past root static rendering.
- Android-native notification/call exports remain unchanged.

## Phase 2: Responsive shell and navigation

### Task 4: Add breakpoint and layout tokens

- Acceptance: one tested classifier exposes mobile `<768`, tablet `768-1023`, desktop `>=1024`, and large desktop `>=1440`; shared max widths/header dimensions are themed constants.
- Verify: breakpoint boundary tests and typecheck.
- Dependencies: Checkpoint A.

### Task 5: Add reusable responsive content layout

- Acceptance: common wrapper centers bounded content on Web and leaves native/mobile layout behavior unchanged; safe-area and tab padding are platform-aware.
- Verify: layout calculation tests and browser inspection at four target widths.
- Dependencies: Task 4.

### Task 6: Implement desktop header for the five visible tabs

- Acceptance: sticky header shows ANKT identity, existing search affordance where applicable, five mapped routes, unread badges, active indicator, hover/focus/tooltips; bottom tab is hidden only on desktop Web.
- Verify: route mapping tests, keyboard navigation, direct click navigation, browser back/forward.
- Dependencies: Tasks 4-5.

### Checkpoint B

- Existing mobile tab snapshots/logic tests pass.
- Desktop shell works at 1024 and 1440px; compact Web works at 320 and 768px.
- No sixth tab or invented sidebar appears.

## Phase 3: Existing feature layouts

### Task 7: Adapt Feed without changing feed behavior

- Acceptance: existing composer, `PostCard`, pagination, media, reactions, comments, share, save, menus, and search remain wired; desktop feed is centered and bounded.
- Verify: existing feed tests plus browser scroll/action checks.
- Dependencies: Checkpoint B.

### Task 8: Adapt Reels viewport

- Acceptance: one active reel plays; vertical video remains centered/uncropped at a bounded 9:16 size; existing filters/search/actions/upload remain wired.
- Verify: reel dimension/active-index tests and browser playback inspection.
- Dependencies: Checkpoint B.

### Task 9: Adapt Notifications and Profile

- Acceptance: both screens use bounded desktop layouts while preserving loading/error/empty states, pagination, read/unread logic, profile stats/tabs/settings/QR, and shared cards.
- Verify: existing tests plus direct route and responsive browser checks.
- Dependencies: Checkpoint B.

### Task 9a: Bound Create Group and viewed-user Profile pages

- Acceptance: Create Group uses a focused form width and viewed-user Profile matches the existing profile width on desktop Web; compact Web and native remain full width.
- Verify: a focused source/layout test fails before implementation, then passes; run typecheck, lint, and Web export.
- Dependencies: Tasks 4-5.

### Checkpoint C

- Feed, Reels, Notifications, and Profile pass focused tests and browser checks.
- No API request, DTO, or action set changed.

## Phase 4: Chat master-detail and realtime

### Task 10: Extract route-independent conversation selection

- Acceptance: conversation selection remains URL-driven and can render the existing `ChatScreen` beside the existing list on desktop without duplicating chat logic.
- Verify: route/selection tests fail first, then pass; mobile still navigates list to detail.
- Dependencies: Checkpoint B.

### Task 11: Add desktop chat layout and independent scrolling

- Acceptance: left list/search/actions and right existing chat/empty state fill the viewport below the desktop header; list and messages scroll independently.
- Verify: browser direct URL, refresh, history, scroll, and keyboard checks.
- Dependencies: Task 10.

### Task 12: Verify SignalR lifecycle on Web

- Acceptance: one connection is reused, existing groups/events work, reconnect does not loop, and listeners clean up.
- Verify: focused lifecycle tests plus browser network/console inspection against the configured API.
- Dependencies: Tasks 2-3 and 11.

### Checkpoint D

- Chat list/detail, messages, unread counts, and realtime pass focused checks on Web.
- Mobile chat navigation and existing realtime tests remain green.

## Phase 5: Remaining Web platform behavior

### Task 13: Media, permissions, share, and QR compatibility

- Acceptance: browser-supported pick/upload/play flows use existing upload services; unsupported camera/audio/call actions fail safely without crashing; native flows remain intact.
- Verify: adapter tests and manual browser upload/media checks.
- Dependencies: Checkpoint C.

### Task 14: Browser-compatible Google auth and password recovery

- Acceptance: same backend account/login endpoints and user records are used; native Firebase/Google flows remain unchanged; Web implementation uses approved Firebase Web configuration.
- Verify: platform tests plus login/logout/refresh integration.
- Dependencies: user approval/configuration and Task 3.

### Task 15: Browser URL/deep-link verification

- Acceptance: current routes support direct navigation, refresh, back/forward, and existing mobile deep links remain unchanged.
- Verify: browser route matrix and Expo export output.
- Dependencies: Tasks 6, 10-14.

## Phase 6: Backend configuration and production

### Task 16: Make CORS origin configuration environment-driven

- Acceptance: development and production allowlists are configurable, credentialed requests and SignalR work, and `AllowAnyOrigin` is never combined with credentials.
- Verify: focused backend CORS/config test and Web network inspection.
- Dependencies: confirmed Web origins.

### Task 17: Remove production secrets from tracked configuration

- Acceptance: sensitive settings come from environment/secret storage; tracked examples contain names/placeholders only; exposed values are rotated by the owner/platform.
- Verify: staged diff secret scan and backend configuration startup check.
- Dependencies: explicit approval and external rotation coordination.

### Task 18: Production export and deployment configuration

- Acceptance: Vercel or approved host serves Expo output with SPA/direct-route fallback and environment variables; API URL is not localhost.
- Verify: `npm test`, typecheck, lint, Web export, deployment preview smoke test.
- Dependencies: Tasks 15-17.

### Task 19: Mobile/backend regression and handoff

- Acceptance: Android checks pass; iOS status is recorded; backend tests run with bounded parallelism; handoff documents changed files, configuration, verification, and known limitations.
- Verify: final command matrix and code review.
- Dependencies: all prior tasks.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Native packages execute during Web import/static rendering | High | Risk-first platform adapters and import tests before UI work. |
| Refresh cookie rejected cross-origin | High | Credentialed fetch already exists; add exact CORS origins and verify `SameSite=None; Secure`. |
| Google login lacks Firebase Web configuration | High | Gate Task 14 on approved Web config; preserve native implementation. |
| Chat screen tightly reads route params | Medium | Keep URL as source of truth and wrap existing screen rather than cloning behavior. |
| Mobile fixed bars regress | High | Platform-aware layout values and mobile regression tests at each checkpoint. |
| Static export and dynamic routes disagree | Medium | Use the approved SPA output with the existing rewrite and verify direct URLs early. |
| Existing tracked secrets block safe production | Critical | Rotate externally, remove tracked values, and use deployment secrets before launch. |
| Backend tests spawn excessive workers in this environment | Medium | Run with `--maxcpucount:1` and a bounded timeout; avoid repeating the failed strategy. |

## Approval gate

Implementation begins only after the assumptions, open questions, and this task order are approved. Each task follows RED → GREEN → REFACTOR and leaves tests/typecheck/build in a known state before the next task.

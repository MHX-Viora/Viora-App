# Implementation Plan: ANKT Web PWA

## Architecture Decisions

- Extend `public/firebase-messaging-sw.js`; do not register a second worker.
- Keep Expo SPA output and add `public/index.html`, as Expo's `single` output uses this template.
- Place the install control in the existing profile settings sheet; show only compact global connectivity/update status.
- Use network-first navigation and cache-first immutable/static assets. Never intercept cross-origin, non-GET, API, auth, hub, or call/realtime requests.

## Task List

### Phase 1: Installability foundation

- [x] Add failing policy/manifest/worker contract tests.
  - Acceptance: tests cover install states, iOS fallback, manifest identity/icons, and one safe worker.
  - Verify: `npm test` fails only for missing PWA implementation.
  - Files: `features/pwa/pwa-installation.test.mjs`, `scripts/test.mjs`
- [x] Add manifest, HTML metadata, and official-logo icons.
  - Acceptance: valid install metadata and exact 192/512 icon files.
  - Verify: tests plus image dimension check.
  - Files: `public/index.html`, `public/manifest.webmanifest`, `public/pwa-icon-*.png`

### Phase 2: Runtime behavior

- [x] Implement install/standalone/iOS state and shared worker registration.
  - Acceptance: one-shot prompt lifecycle and one shared worker registration.
  - Verify: policy and contract tests, typecheck.
  - Files: `features/pwa/install-policy.ts`, `services/pwa.service.ts`, `services/pwa.service.web.ts`, `services/push-notification.service.web.ts`
- [x] Add profile install action and compact offline/update host.
  - Acceptance: Web-only accessible UI; no automatic prompt; active-call-safe update.
  - Verify: UI contract tests and responsive browser smoke.
  - Files: `components/pwa/pwa-install-action.tsx`, `components/pwa/pwa-status-host.tsx`, `components/profile/profile-settings-sheet.tsx`, `app/_layout.tsx`

### Phase 3: Worker and verification

- [x] Extend the Firebase worker with conservative caching and update messaging.
  - Acceptance: incoming-call handlers survive; response clones are correct; old ANKT caches are removed.
  - Verify: worker contract tests and production browser smoke.
  - Files: `public/firebase-messaging-sw.js`
- [x] Document and run full verification.
  - Acceptance: handoff covers deploy/HTTPS/SPA fallback and test evidence.
  - Verify: test, typecheck, lint, export, output inspection, browser smoke.
  - Files: `docs/handoffs/web-pwa.md`

## Checkpoints

- Foundation: targeted tests green; manifest/icons parse and dimensions match.
- Runtime: tests, typecheck, and lint pass.
- Complete: production output and browser runtime verified; Call/realtime source architecture unchanged.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Cached stale SPA shell | Navigation network-first; versioned caches; explicit waiting-worker update |
| Private data cached | Strict same-origin GET allowlist by destination/path; deny sensitive paths first |
| Firebase worker conflict | Central registration and one worker URL/scope |
| Call interrupted by update | Refuse `SKIP_WAITING`/reload while active call exists |
| iOS lacks prompt event | Manual Share → Add to Home Screen instructions only on iOS Safari |

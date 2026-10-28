# ANKT Developer Console redesign

## Result
Blue/white Console shell matches the supplied image: existing ANKT logo and
public header links retained; ~72px header, name/email/avatar menu, no bell.
260px desktop sidebar has Overview/Create/My Apps/Review notifications only.
Native dialog mobile drawer supports close/Escape/focus return. Header still
links docs; settings/security remains accessible via avatar, with logout intact.

Existing routes /console and /console/apps now present overview/list distinctly.
Overview total comes from the existing paged API total, not fabricated metrics.
My Apps has breadcrumb/page heading/create CTA, illustrated empty state and
API-backed grid cards with logo/name/ID/status/created date. Loading/error/retry
and pagination remain. Existing create/upload/idempotency/detail tabs and account
flows retained; all primary actions still invoke existing handlers.

Scoped console tokens/CSS style forms, tabs, dialogs, notifications and settings.
Public marketing footer is omitted inside Console; public pages keep it. Existing
portal is explicitly light-themed; no unsupported dark-mode toggle introduced.
No backend/schema/API/OAuth/Gmail/SSO/secret/dependency changes.

## Files
- `features/developer/developer-screen.web.tsx`: scoped shell/routes/metadata.
- `features/developer/components/console-layout.tsx`: sidebar/native drawer.
- `features/developer/components/console-ui.tsx`: shared breadcrumb/page heading,
  create CTA, native SVG empty illustration and benefits with no invented numbers.
- `features/developer/components/console.css`: scoped design system/responsive
  styles; account identity/dropdown styles apply to its shared class.
- `features/developer/components/mini-apps.tsx`: overview/list presentation;
  underlying API fetch, create/upload and pagination handlers unchanged.
- `features/developer/components/account-menu.tsx`: identity, supported settings
  link and dropdown close on outside/Escape/navigation; logout handler unchanged.
- `features/developer/components/account-settings.tsx`: shared page heading.
- `features/developer/components/mini-app-detail.tsx`: breadcrumb/back list link
  and status data attribute. Preserve all earlier unrelated in-progress edits.
- `features/developer/components/review-notifications.tsx`: shared page heading.
  This file was already untracked before this task; retain existing functionality.
- `features/developer/components/landing-icon.tsx`: consistent Home/Plus Circle/
  Clipboard Check/Chevron paths added to existing icon set.
- `features/developer/lib/console-navigation.ts`: active route classification.
- `features/developer/tests/console-navigation.test.ts`: three route tests.
- `features/developer/tests/console-ui.fixture.jsx` and `serve-console-ui.cjs`:
  synthetic-only browser harness, never imported by app or connected to backend.
- Spec/plan: `docs/specs/developer-console-redesign.md`,
  `docs/plans/developer-console-redesign.md`, plus this handoff.

## Actual validation
- Developer test suite: **70 passed, 0 failed** after final source edits.
- `tsc --noEmit`: passed. Targeted ESLint: passed. Full `expo lint`: passed.
- Expo web export: passed (1988 modules), artifact
  `.codex-tmp/console-redesign-web-export`. Checked exported JS does not contain
  `__consoleFixture` or `synthetic-secret-only` fixture markers.
- Chromium fixture uses real UI components plus isolated fake fetch/navigation;
  no production account created, modified, logged out or inspected for secrets.
- Desktop 1440: header ~72.8px including border, sidebar exactly 260px, active
  My Apps, empty art/CTA, three populated cards/status/date fields, no overflow.
- Tablet 768: drawer toggle, two card columns, no overflow. Mobile 375 and 320:
  sidebar hidden, one card column, visible account avatar, no horizontal overflow.
- Drawer opens modal; Escape closes and returns focus to trigger. Create dialog
  opens; valid name/category submission redirects to existing detail route.
  Initial automation used option value instead of visible text; selecting the
  visible label corrected the test, with no product change required.
- Detail retained all nine tabs. Browser exercised credential tab read-only
  fields/actions (without reading their values), Callback form, and activity.
- Avatar menu opened; account settings route displayed profile/security/session/
  linked-account sections. Review notifications loaded its empty state with no
  error. Overview displayed fixture API total 3. API error state showed retry,
  and did not incorrectly present first-time empty state. Screenshots inspected.
- No live authenticated backend end-to-end mutation, domain verification,
  secret rotation, SSO handshake or review decision was performed. Existing
  transport/policy tests passed; do not treat fixture evidence as real API proof.

## Reproduce
`node --import tsx --test --experimental-test-isolation=none server/developer/*.test.cjs features/developer/tests/*.test.ts`

`node node_modules/typescript/bin/tsc --noEmit --pretty false`

`node node_modules/expo/bin/cli lint`

`node node_modules/expo/bin/cli export --platform web --output-dir .codex-tmp/console-redesign-web-export`

Synthetic preview: `node features/developer/tests/serve-console-ui.cjs`, default
5494; ANKT_CONSOLE_PREVIEW_PORT=5495 used for final browser checks. Routes accept
fixture-only scenario=empty/populated/error/loading. Sandbox blocked esbuild
child processes, so Node tests/preview/export used approved escalated execution.
No approval rejection, commit, push or deployment performed. Persistent user
preference excludes docs/Markdown/logs/tests from any later commit unless changed.

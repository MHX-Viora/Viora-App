# Developer Portal Stage 7 handoff

2026-10-22. Tasks 37–41 implemented; cross-repository Tasks 1–53 are complete
within local acceptance scope. Real Public/Confidential A–D browser workflows
passed, with exit 0 and cleanup for each runner. The authoritative
[plan](../../../viora-BE/docs/plans/developer-platform-stage-7.md) and
[handoff](../../../viora-BE/docs/handoffs/developer-platform-stage-7.md) retain the
backend history; the [acceptance record](../../../viora-BE/docs/handoffs/developer-platform-stage-7-acceptance.md)
contains final evidence and limits. Preserve existing unrelated working edits.

- Strict clients: `mini-app-review.ts`, `mini-app-publishing.ts`,
  `review-notifications.ts`. Bounded exact shapes/IDs, safe links, explicit revision
  payloads and request replay; no arbitrary actor/status/evidence writes.
- Review tab: draft/submitted/live separated; immutable snapshots, server checks,
  explicit submit confirmation, history/reasons/changes and new drafts.
- Production: draft editor only, explicit private Confidential credential prep,
  approved exact-target publish/unpublish with original-payload retry. Old SSO
  Production editor is read-only; Sandbox save remains on its established path.
- Inbox: `/developers/console/notifications`, unread/read status and owned app/
  review/version deep links. Query links retain document/unsaved navigation guards.
- Secrets are not stored/logged; private view clears when hidden or unmounted.
  Stale request generations and double clicks cannot apply duplicate UI state.
  App status is reread after publication changes so the header matches the server.

Initial UI checkpoint: 62/62 Developer/BFF tests; TypeScript/lint clean; Expo Web export
passed. Isolated Chrome fixture passed submit, lost-reply retry using one request
ID, inbox/read/deep-link, publish/unpublish, changes/new draft, Production intent
and private credential flow including clearing on tab visibility loss. Zero
console errors/warnings; no horizontal overflow at 320/768/1024/1440. Screenshots
at 320/1440 were inspected. Fixture data/transport are simulated, not real business
E2E, Admin-password-login or Production OIDC acceptance.

Artifacts: `.codex-tmp/stage7-developer-final-{tests,types,lint,export}.log`,
`.codex-tmp/stage7-review-browser-final.log`,
`.codex-tmp/stage7-review-{320,1440}.png`.

UI reproduction, separate terminals:

```powershell
node features/developer/tests/serve-review-ui.cjs
node features/developer/tests/review-ui.browser.cjs
```

Only localhost:5489 fixture data is used. Browser harness creates its own temporary
profile, discovers that profile's ephemeral debug port and closes/removes only
its own profile. Optional `STAGE7_CHROME` selects the local Chrome executable.

Default backend feature flag remains off. No backend/schema changes in this
continuation. Final unchanged application baseline: Developer/BFF 63 passed,
backend 695 passed / 1 pre-existing MoneyAudit skip; types/lint/export clean.
Real-host acceptance on 2026-10-22 covers Developer BFF login, Admin password/live
session, five fresh 18-check Sandbox runs per Public/Confidential variant,
submit/changes/rejection, inbox, publication and actual Production OIDC,
suspension/restore, immutable draft isolation and stale domain/client denial.
The backend harness now waits for server 18/18 completion before reading readiness.
Logs: `../viora-BE/.codex-tmp/stage7-resume-e2e-{public,confidential}.log`.
No live DB, real email, deployment, commit or Stage 8 changes. Rollout still needs
separate approval and deployed domain/TLS/header/SMTP checks.

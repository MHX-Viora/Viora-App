# Stage 6 Sandbox — local acceptance complete, 2026-10-20

Canonical [BE spec](../../../viora-BE/docs/specs/developer-platform-stage-6.md),
[plan](../../../viora-BE/docs/plans/developer-platform-stage-6.md) and
[handoff](../../../viora-BE/docs/handoffs/developer-platform-stage-6.md).
Tasks 1–32 are complete in the approved local web/controlled-fixture scope. See
the final [acceptance report](../../../viora-BE/docs/handoffs/developer-platform-stage-6-acceptance.md)
for 18 delivery categories, 25 security cases and the 20-step reconciliation.
It supersedes historical pending statements below. Public deployment, effective
provider headers, public DNS/TLS, application DB rollout and native runtime remain
separate; no commit, publication or Stage 7 was performed.

## Final Tasks 25–32 frontend handoff

`SandboxResults` adds selected checks, run creation/cancellation/newest history,
bounded diagnostics filtering/paging, readiness/provenance/remediation, safe JSON
export and retry states. Polling and stale responses are guarded across cancellation,
session changes and unmount. Only owned management operations pass through BFF;
executor/runtime authority remains backend-only.

The UI displays the run correlation ID; SDK `loginPopup({sandboxRunId: runId})`
adds only a non-authorizing hint. A completed/stale run cannot acquire new proof.
Ordinary SSO works without it. SDK v1/default top-level navigation stay compatible.
Keyboard launch/diagnostics/reload/device switching/stop, cancel/SDK-close focus,
expiry and 320/375/768/1440 layouts passed in the real Portal/BFF fixture.

Final: FE/BFF 42 tests, SDK 37, TypeScript/focused lint/Expo Web export pass.
Backend 487 passed / 1 existing skip; host/executor 23. Both real client types
complete 18 checks and fresh review readiness. SameSite=Lax reports embedded
session unavailable; cross-origin/CSP/late SDK cannot become Passed. Effective
Vercel routing and every COOP/storage policy remain separate deployment/browser
acceptance; the local header adapter proves only its source policy.

## Implemented path

Protected `/developers/console/apps/{appId}/sandbox` uses existing ConsoleGuard,
account client and Developer BFF. Server-only allowlist exposes config and owner
session create/get/revoke/launch-grants; no Admin/runtime/executor passthrough.
Transport checks exact current iframe WindowProxy, host origin, version, session,
nonce, grant shape/expiry; one grant issuance per mounted transport and pending
grants dropped on disposal. Grants never enter URLs.

Host loads the registry URL; cooperative bridge state is labelled a browser
observation. Stop removes execution immediately and retains session metadata if
revoke fails, allowing retry. Server absolute expiry remains the fallback for
failed unmount cleanup. Production/ANKT/partner sessions are not revoked by stop.
SDK v2 opt-in preserves default v1; successful close now disposes pending work.

## CSP deployment

`vercel.cjs` exports configuration using `sandbox-policy.cjs` and the relocated
unchanged `server/developer/vercel-base.json`. Use a Vercel version supporting
[programmatic configuration](https://vercel.com/docs/project-configuration/vercel-ts).
Only one root Vercel config is present. No dependency or deployment was added.

Build environment:

- `ANKT_SANDBOX_HOST_ORIGIN`: exact HTTPS origin matching BE `MiniAppSandbox__HostOrigin`.
- `DEVELOPER_SITE_ORIGIN`: exact HTTPS Portal origin.
- `EXPO_PUBLIC_OPEN_API_ISSUER`: exact HTTPS issuer origin.

Blank host preserves frame-src none everywhere. Enabled policy requires a host
hostname distinct from Portal/issuer and rejects credentials/path/query/fragment.
Two mutually exclusive CSP rules permit only the host on the exact Sandbox route;
other pages keep frame-src none. Common security headers/rewrites are preserved.
Entering or leaving Sandbox forces document navigation to replace effective CSP.
Metro development does not apply the deployment CSP; it is not header evidence.

## Executed checks

From FE root:

```powershell
node --import tsx --test --experimental-test-isolation=none server/developer/*.test.cjs features/developer/tests/*.test.ts
npx tsc --noEmit
npx eslint features/developer/navigation.web.tsx features/developer/lib/navigation-policy.ts features/developer/components/mini-app-sandbox.tsx features/developer/lib/mini-app-sandbox.ts features/developer/lib/sandbox-transport.ts features/developer/tests/navigation-policy.test.ts features/developer/tests/sandbox-transport.test.ts server/developer/sandbox-policy.cjs server/developer/sandbox-policy.test.cjs vercel.cjs
npm run build:web
```

33 FE/BFF tests pass; TypeScript, focused ESLint and Expo Web export pass.
SDK `npm test`: 28 pass/build. BE host unit command
`node --test --experimental-test-isolation=none tools/SandboxHostTests/*.test.mjs`:
12 pass. Host VM tests verify logic with doubles, not browser policies. BE full
suite: 357 pass / 1 existing skip. Logs under each repo's `.codex-tmp/stage6-*`.

## Outstanding acceptance

Chrome DevTools could not acquire its browser profile; Browser runtime discovery
returned no browsers. No browser/profile was killed or modified. Validate actual
Vercel route parsing/effective CSP headers, real iframe lifecycle, authenticated
Developer login, cookie/COOP restrictions, expired/revoked sessions, responsive
viewports and keyboard/focus behavior when a browser is available. Browser task
acceptance remains pending; no end-to-end readiness/publication claim is made.

No trusted executor/readiness, supported external-link host action or production
SDK popup adapter yet. Persistence/diagnostic progress follows below. Next approved
work follows the canonical plan. Unrelated existing working-tree edits
were preserved; no commit, deployment, migration of an application DB or Stage 7.

## Latest continuation — persistence/diagnostic foundation

Backend Tasks 15–18 now store runs/results/fixed-code diagnostics/protocol evidence,
enforce source/snapshot constraints and perform bounded retention. Read the latest
canonical BE handoff and [operations guide](../../../viora-BE/docs/operations/developer-platform-stage-6.md).

`sandboxClient.diagnostics(appId, sessionId, {category?, cursor?, limit?})` is typed;
BFF permits GET only on `mini-apps/{appId}/sandbox/diagnostics`. Exact bounded
session/category/cursor/limit fields survive both direct and Vercel rewritten
routes. Unknown/duplicate query fields fail before fetch. Runtime/runner/Admin or
result submissions remain blocked. No diagnostic UI panel is claimed (Task 29).

Host v2 now advertises `diagnostics.report` and forwards only the fixed SDK catalog
to host-only ingestion. Server stamps SdkReported; host handshake sends HostReported
separately. BRIDGE_BUSY reflects ingestion quota/conflict without disabling platform
controls. Neither source is independent runtime proof. External links remain unsupported.

Latest executed checks: FE/BFF 35 pass; TypeScript, focused ESLint and Web export
pass; backend full 393 pass / 1 existing skip; host Node 15 pass. EF snapshot has
no drift. Disposable PG migration/rollback/races/pagination/retention pass. Logs:
`.codex-tmp/stage6-foundation-portal-tests.log`, `stage6-foundation-web-build.log`,
and BE `.codex-tmp/stage6-foundation-final-full-tests.log`.

Browser is still unavailable (busy DevTools profile, empty Browser runtime list).
Next backend work is Task 19 coordinator. Browser/Portal/CSP acceptance and the
20-step full E2E remain open. No application DB migration, deploy or publication.

## Previous continuation — Task 19

Backend owns a bounded persisted run queue, version-bound sequential worker,
deadline/cancellation and restart reconciliation. BFF now allows only
POST/GET `mini-apps/{appId}/sandbox/test-runs` and GET/DELETE `.../{runId}`.
List accepts only sessionId/cursor/limit with the existing exact validation;
direct/Vercel rewrites preserve filters. Writes retain CSRF/cookie separation and
1 KiB body bounds. Result/status/trusted-executor submissions remain disallowed.

Typed client: createRun(appId, sessionId, checks?), runs(appId, sessionId, options?),
run(appId, runId), cancelRun(appId, runId). Summaries expose server-selected Sandbox,
snapshot, status/deadline; detail has catalog keys/status/source/time. No token,
worker authority or raw server error. UI run controls are still Task 29.

Important semantics: Completed means processing finished. Default checker records
NotImplemented/MissingEvidence until Task 20 implements real configuration checks;
never display Completed as readiness or publication approval.

Latest checks: backend 413 pass / 1 existing skip; focused unit/HTTP/retention/PG run suite
36 pass; FE/BFF 37 pass; TypeScript, focused ESLint and Web export pass. Logs:
BE `.codex-tmp/stage6-run-full-tests.log`, `stage6-run-final-focused-tests.log`;
FE `.codex-tmp/stage6-run-portal-tests.log`, `stage6-run-web-build.log`.
Next: Task 20; browser/Portal/header and final E2E remain open. No schema/migration,
deploy, publication or unrelated working-tree changes in this continuation.

## Latest continuation — Task 20

BFF now allowlists only GET `mini-apps/{appId}/sandbox/readiness`; query fields,
environment selection and result/evidence writes are rejected through direct and
Vercel routes. Existing Developer cookie/CSRF/credential isolation is retained.
Typed `sandboxClient.readiness(appId)` returns SandboxReadiness with all 18 checks,
applicability, fixed status/code/provenance/time, fingerprint, flags and blocker keys.
No session is required to inspect readiness. Existing legacy readiness is unchanged.

Backend now checks actual website/legal pages and domain/client/SSO configuration,
including real discovery/JWKS and registry projection/credentials. Persisted SSO-off
alone makes its checks inapplicable. Config success never proves runtime or login:
readyForReview remains false pending independent runtime/bridge/protocol evidence.
Runtime/bridge stay required and MissingEvidence. Results/panels still await Task 29.
Readiness evaluation/BFF/client timeouts are 30/35/40 seconds; other requests retain
their existing timeouts. Snapshot/source/proof/SSO eligibility are rechecked after I/O.

Verification: backend 444 pass / 1 existing MoneyAudit skip; FE/BFF 39 pass;
solution build, TypeScript, focused ESLint and Web export pass. Logs: BE
`.codex-tmp/stage6-config-full-tests.log`, FE `.codex-tmp/stage6-config-portal-tests.log`,
`stage6-config-types.log`, `stage6-config-lint.log`, `stage6-config-web-build.log`.
Next Task 21. Browser/Portal/CSP/final E2E acceptance remains open. No schema,
migration, application DB access, deploy, commit, publication or Stage 7.

## Tasks 21–24 checkpoint — 2026-10-20

Actual host v2 external links now require current backend session/origin/public
DNS/callback policy plus a bounded host confirmation; tabs have no opener/referrer.
SDK external-link timeout is 30 seconds. `auth.loginPopup` and
`completePopupRedirect` provide opt-in partner-only Public callback transport;
Confidential example relays completion only and revalidates embedded server
UserInfo. Default top-level login/v1 stay compatible. Consent environment now
comes from the registered server client and cannot be chosen by query.

Browser verified Public SDK code/token/JWKS/UserInfo and forced-consent denial,
Confidential iframe success with SameSite=None, explicit unavailable state with
SameSite=Lax, host/Portal cookie isolation, modal confirmation/cancel/focus and
noopener/noreferrer. Controlled fixtures are not authenticated Developer Portal
or deployed-header evidence. New-adapter browser COOP/storage-policy acceptance
and full E2E remain pending.

Backend full 459 pass / 1 existing skip; SDK 36 pass/build; host Node 18 pass;
Portal/BFF 39 pass; TypeScript and focused SDK lint pass; HTTPS protocol E2E 1 pass.
Canonical [backend handoff](../../../viora-BE/docs/handoffs/developer-platform-stage-6.md)
has executable evidence/contracts. **Stage 6 remains incomplete; next Task 25,
then Tasks 26–32.** No trusted runtime readiness, deployment, publication or Stage 7.

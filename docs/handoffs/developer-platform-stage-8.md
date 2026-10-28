# Developer Platform Stage 8 — Web continuation

Native continuation (2026-10-23): Android debug assembly passes; native platform
errors and final close/error notification now use guarded terminal cleanup.
An Android 15 emulator is available; device security/SSO and iOS acceptance remain
outstanding. See [native checkpoint](../../../viora-BE/docs/handoffs/developer-platform-stage-8-native.md).

2026-10-23. Implementation continues under the approved
[backend plan](../../../viora-BE/docs/plans/developer-platform-stage-8.md).
This is a Web checkpoint, not full Stage 8 acceptance. Native remains disabled;
P0/native SSO/device execution and iOS build/E2E are outstanding.

- Real host screen now focuses its close control on Web mount. Chrome reproduced
  lost focus before the fix, then passed keyboard opening/focus after the fix.
- Reusable `features/mini-apps/tests/serve-web-ui.cjs` + backend
  `tools/MiniAppProductionE2E/web-ui.e2e.mjs` exercise actual section/grid/screen/
  controllers with explicitly simulated catalog/host and a Wallet sentinel.
  Exact measured widths 320/375/768/1440, 44px controls, no horizontal overflow,
  escaped names, paging, error/retry/empty/reconnect, status ordering and
  close/reopen/revoke disposal pass. Zero console issues/external requests.
  Sentinel visibility is not actual Utilities/Wallet business acceptance.
- Deployment export now clears Metro cache. A real fixture caught old inlined
  API/host origins surviving an environment change while generated CSP changed.
  Rebuilt bundle contains the intended fixture origins; real host pipeline uses
  the actual exported Expo screen, client, transport and iframe adapter.
- Real Public and Confidential publication variants both pass the host pipeline
  with actual approval/publish, anonymous catalog/deep link, launch/redeem, SDK v1
  context/close and fresh reopen. Final Confidential also proves invalid-bearer
  rejection, page-close server cleanup and actual screenshots at 320/1440.
  Both runners exited 0; fixed fixture service ports are closed afterward.
  These are SSO-enabled publications opened anonymously; embedded SSO and non-SSO
  business Flow A remain pending. The runner's standalone OIDC check is separate.
- Related feature/Wallet tests: 34 passed. Developer/BFF: 63 passed. Root tsc and
  focused lint passed. Latest export passed with explicit isolated HTTPS origins
  and `EXPO_NO_DOTENV=1`; no deployment or application database access.
- Backend final continuation regression: 832 passed / one pre-existing MoneyAudit
  skip / zero failures. Release fixture build has zero warnings/errors. New owned
  browser cleanup regressions: two passed; final Confidential cleanup exits 0.

UI-only reproduction (separate terminals, frontend root then backend root):

```powershell
node features/mini-apps/tests/serve-web-ui.cjs
node tools/MiniAppProductionE2E/web-ui.e2e.mjs
```

The runner creates/closes only its own temporary Chrome profile. The server is
loopback-only with a ten-minute bound. `STAGE8_CHROME` can select Chrome.
UI artifacts are in backend `.codex-tmp/stage8-ui-{catalog,host}-{320,1440}.png`
and `stage8-resume-web-ui.log`; screenshots inspected. Business evidence and
remaining gaps live in the authoritative
[backend handoff](../../../viora-BE/docs/handoffs/developer-platform-stage-8.md).

## 2026-10-23 — Web milestone completed

User chose Web first; Android/iOS **NOT VERIFIED**. Actual exported Web now proves
non-SSO anonymous deep link plus Social login -> Utilities/real WalletService ->
host -> close/return/focus refresh; no Production OAuth client is created for that
publication. Unrelated authenticated background APIs are outside isolated fixture
DI, so this is not whole-app zero-error evidence.

Public and Confidential embedded Production SSO both prove real consent denial/
retry/repeat/new scope, code/token/ID token/UserInfo, reload and fresh-host reopen.
Public loses memory credentials on reload and explicitly logs in again;
Confidential revalidates its backend HttpOnly session. Actual active suspension/
restore-unpublished/explicit-republish and hostile bridge/Web media denial pass
for both variants. Social state survives Mini App close and moderation.

Latest checks: 41 combined Mini App/Wallet/root SSO tests, 63 Developer/BFF tests,
37 SDK tests; root types, fixture types and focused lint pass. Existing RN Web
`props.pointerEvents` deprecation warning appears during static rendering; Node
test exit code is zero. Existing isolated-origin Expo export is the actual tested
artifact; no product frontend change in this completion slice required rebuilding.

See [Web acceptance matrix](../../../viora-BE/docs/handoffs/developer-platform-stage-8-acceptance.md)
and [measured observations](../../../viora-BE/docs/testing/developer-platform-stage-8-performance.md).
Native stays disabled pending P0 and actual Android/iOS device evidence. No
deployment, package publication, live migration, commit or Stage 9.

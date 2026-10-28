# Stage 9 — public Developer documentation

2026-10-23. **Implemented and locally verified**, not deployed. User approved the
spec/plan with “ok hãy bắt đầu làm”. No Stage 10, Social auth/SSO protocol change,
application DB migration, public SDK publication or automatic commit.

- Public `/developers/docs` and 19 slug pages use structured content, independent
  of DeveloperSession. Account header is an optional same-origin BFF island.
- Docs-only React server render + matching hydration produce full crawlable HTML
  without changing Expo's global single output. Full-document links bridge static
  docs and Expo Console; existing public/guarded root routes are unchanged.
- Shared pure identity/footer, scoped light/dark tokens, desktop/mobile navigation,
  TOC/anchors/active tracking, safe highlighted/copyable code, local Vietnamese
  search/dialog/keyboard focus and per-step/related/previous-next links are present.
- Reference covers 54 account/owner/Sandbox/catalog operations and seven OIDC
  metadata/protocol entries. Generated DTO schemas come from backend reflection;
  private/Admin/executor/host transport and actual credentials are excluded.
- SDK remains private. Public guide includes both the local SDK example and a
  standalone openid-client 6.8.8 example. The .NET8 Confidential sample builds;
  direct runtime issuer E2E of that new sample is not claimed.

Validation: 14 docs tests, 63 Developer/BFF tests, 37 SDK tests, 50 root SSO/Mini
App/Wallet tests; root types and focused lint pass. Backend selected contract/API/
boundary checks: eight pass. Anonymous exported-site E2E and real local SMTP/
registration/verification/browser-login/Console/docs E2E pass. Existing real
Confidential issuer/partner/security regression also passes. Screenshots and
actual contrast/AX/keyboard/clipboard-denial/200% OS text-scale evidence recorded.

From frontend root:

```powershell
node scripts/docs-examples.cjs
npm run docs:check
npm run test:docs
npm run docs:build
# For Console navigation, compose with the normal local Expo export first:
node scripts/build-developer-docs.cjs --base-export .codex-tmp/stage9-expo-export
npm run test:docs:e2e
```

The current Expo export uses loopback API/disabled runtime flags for fixtures;
do not deploy it unchanged. Actual hosting/issuer/browser-matrix checks and
existing dependency advisories remain rollout considerations. Native Stage 8
acceptance and SDK distribution are unchanged. No production traffic/email.

Authoritative [19-topic report](../../../viora-BE/docs/handoffs/developer-platform-stage-9.md),
[build/routing/rollback runbook](../../../viora-BE/docs/operations/developer-platform-stage-9.md),
and [security/evidence review](../../../viora-BE/docs/testing/developer-platform-stage-9-security.md).

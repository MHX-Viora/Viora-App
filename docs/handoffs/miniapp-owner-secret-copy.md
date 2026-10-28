# Owner-only Client Secret copy — 2026-10-27

## Delivered

Integration tab now places a masked Client Secret field immediately after Client ID,
with Production/Sandbox selector, explicit Reveal/Hide and Copy. No automatic secret
request, local/session storage, code embedding or shared literal. Value clears after
60 seconds, pagehide, unmount and app/environment changes; late responses are ignored.
Credential state itself is bound to the exact app/environment, not only a parent key.

BFF allowlists only POST auth-bridge/credentials/reveal, applies same-origin/CSRF
checks and no-store. Backend checks active/unlocked/unexpired Developer session and
app ownership, uses the existing sensitive rate limit, verifies the provided raw
secret against the already-registered hash, then audits only app/actor/environment.
DTO ToString and options serialization redact/exclude raw values.

## Operator setup required

In ANKT backend secret manager, set the optional original registered secret under
the SAME existing partner label and App ID:

- MiniAppAuth__Partners__YourLabel__SandboxSecret
- MiniAppAuth__Partners__YourLabel__ProductionSecret

Corresponding SandboxSecretHash/ProductionSecretHash remain authoritative. Hash-only
registrations still authenticate normally, but cannot be revealed. Incorrect/missing
raw values produce PARTNER_SECRET_UNAVAILABLE; a hash cannot recover a secret.
No real secret from chat was written into code or examples. Do not reuse one secret
across apps. No self-service generation/rotation, DB schema or auth-protocol change.

Deploy backend and frontend/BFF, then configure/restart the backend secret-manager
values. Detailed server instructions: viora-BE/docs/operations/miniapp-owner-secret-copy.md.
Public SDK README, Vietnamese integration guide and Portal docs describe the UI.

## Verification

- 23 backend tests: credential access/isolation/session/expiry/config redaction and
  existing partner-login flows; no PostgreSQL test was needed for this config-only feature.
- BFF tests: allowed POST, denied GET, denied foreign origin, no-store.
- Chrome synthetic-secret UI test: explicit fetch, show/hide/copy, stale response,
  environment/app changes, 60-second expiry and denied response. Existing production
  integration-copy UI regression passed.
- TypeScript, targeted ESLint, docs validation and 17 docs tests passed.

No live credentials accessed, no production config/database mutation or deployment.

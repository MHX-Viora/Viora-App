# Direct Mini App test when managed Sandbox is disabled

## Objective
An authenticated Mini App owner can open their registered website and inspect
Sandbox OAuth readiness without deploying the managed Sandbox host. Preserve
the existing managed Sandbox flow when enabled. The Developer session must never
be treated as an ANKT social identity or sent to the partner.

## Behavior
- Load the owned app separately from host configuration. Only a 503 with the
  structured code SANDBOX_DISABLED selects direct testing; other failures remain
  errors. An owner/app failure never exposes a launch action.
- Open only a registered HTTPS website without embedded credentials, in a new
  tab with noopener/noreferrer. Do not add identity or tokens to its URL.
- Read existing owner-scoped SSO configuration and display actual server/client
  readiness. Configuration readiness is not a successful login or SDK check.
- Explain that the partner initiates OAuth, uses the user's ANKT session, and
  requests consent as needed. Developer login does not supply that session.
- Keep management grants, runtime cookies, permissions and evidence unchanged.

## Implementation plan
1. Retain structured error codes in AccountApiError; test disabled vs other errors.
2. Add a page loader preserving owner data on disabled Sandbox, and URL validation.
3. Render direct test actions and independent SSO diagnostics; retain managed UI.
4. Verify regression tests, compile changed components and inspect browser fixture.

## Conventions and verification
Use existing React/TypeScript components, accountRequest and SSO DTO parser.
No dependencies, schema changes or remote configuration changes.
Tests: node --import tsx --test --experimental-test-isolation=none features/developer/tests/sandbox-direct-test.test.ts
Focused regression: existing Sandbox/SSO/transport tests. Browser fixture data is
UI evidence only; live Render SSO requires the deployed partner and user session.

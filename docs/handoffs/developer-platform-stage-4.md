# Developer Platform Stage 4

The integrated `/developers` portal now has Mini App integration configuration, app-bound domain file download/verification/regeneration and truthful readiness checks. Existing BFF authentication, CSRF, no-store and credential lifecycle are retained.

Canonical architecture, schema/API, changed files, environment, local commands, tests, SSRF controls, limits and Stage 5 gate: [backend handoff](../../../viora-BE/docs/handoffs/developer-platform-stage-4.md).

Frontend validation: 25 developer tests, TypeScript, focused ESLint and production export passed. Controlled HTTPS BFF/API/database E2E passed; browser verified status/error/checklist, dirty confirmation and 320px layout. Real public-domain E2E remains unverified because no domain is available. No Stage 5 runtime, production migration, deployment or Stage 4 commit was performed.

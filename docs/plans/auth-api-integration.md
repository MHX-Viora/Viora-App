# Plan: Auth API integration

1. Define environment template, typed API contract, normalized errors, and focused tests.
2. Add secure session persistence and connect registration/login forms with validation, loading, alerts, and routing.
3. Lift image-picker state and connect profile creation; save returned user.
4. Run lint, typecheck, web export, security audit, and focused code review.
5. Add one-time `401` refresh/retry for protected services and persist the replacement access token.
6. Simplify service helpers without weakening response validation, then replace system alerts with a reusable auth modal matching the app theme.

## Checkpoints
- Foundation: contract tests pass and configuration fails clearly.
- Auth: registration/login compile and duplicate submits are blocked.
- Complete: profile payload/session routing compile; all verification commands pass.

## Risks
- Backend image fields may require uploaded public URLs; current documented contract only exposes strings.
- Exact register field name is inferred as `identifier`, matching login and the email-or-phone requirement.

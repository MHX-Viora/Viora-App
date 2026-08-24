# Implementation plan: Google login on Web

## Phase 1: Contract and isolation

- [x] Add regression tests for the Web adapter contract and native isolation.
- [x] Add Firebase as an explicit direct dependency.

## Phase 2: Web authentication

- [x] Implement lazy Firebase Web initialization from validated public environment values.
- [x] Implement Google popup login, Firebase ID-token retrieval, cancellation handling, and Web sign-out.
- [x] Document the required environment variables without committing real values.

## Phase 3: Verification

- [x] Run focused and full tests, TypeScript, lint, Web export, and dependency audit.
- [x] Review authentication, token handling, platform isolation, and setup requirements.

# Developer email verification page

## Delivered
- `features/developer/pages/verify.tsx` now renders isolated `EmailVerification`.
- `components/email-verification.tsx` and `.css`: white/blue #0866ff card matching
  homepage, native SVG envelope, progress, success, invalid/used/expired link,
  missing link, retryable failure, resend with 60s cooldown, security notice.
- `lib/email-verification.ts`: strict base64url-43 fragment parsing, per-instance
  promise dedup for StrictMode; only explicit retries issue another request.
- Fragment removed using history.replaceState; token kept only in component
  memory. Hash-only new email links in the same tab are also consumed/verified.
  Existing accountRequest/BFF, endpoints and backend token behavior reused.
- Existing dirty auth-form and unrelated frontend/backend work left intact.

## Validation
- `features/developer/tests/email-verification.test.ts`: 4 new tests.
- Complete developer unit/BFF suite: **67 passed, 0 failed**.
- TypeScript noEmit and targeted ESLint: passed after final code changes.
- Expo web export: passed, 1984 modules; final artifact under
  `.codex-tmp/verify-email-web-export`. No credentials edited or included manually.
- Synthetic StrictMode browser fixture:
  `features/developer/tests/email-verification.fixture.jsx` and
  `serve-email-verification.cjs`. Loopback only, overrides fetch in fixture,
  no real backend/account/email. Default port 5492, optional
  `ANKT_VERIFICATION_PREVIEW_PORT`. Final browser checks used port 5493.
- Browser observed: loading + once-only request; success + login link; HTTP400
  error + resend; HTTP503 then explicit retry succeeded (2 calls); resend
  neutral response + disabled cooldown. Fragment cleared; same-tab hash-only
  navigation from missing to success verified with one request. Success at
  mobile 375px had document width 375px, no horizontal overflow.
- Real Metro app at `http://localhost:8081/developers/verify-email` loaded the
  new card/missing-link state; no real account/token consumed there.
- Desktop loading/mobile missing screenshots visually inspected. A later browser
  screenshot stalled; stopped that tool call after DOM verification succeeded.
- Tests initially hit sandbox `spawn EPERM`; authorized escalated Node/esbuild
  execution completed. No approval rejection occurred.

## Remaining
Owner should open a fresh real verification email on localhost (PortalUrl must
target localhost:8081) and on deployed frontend. Real account activation was not
performed: owner chose to test received mail later. Page refresh after token
removal intentionally shows missing-link/resend instructions. Existing global
site header/footer retained. No commits or pushes performed; prior docs/log
commit exclusion remains in force.

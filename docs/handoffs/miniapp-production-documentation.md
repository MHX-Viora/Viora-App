# Production Mini App documentation — 2026-10-27

## Outcome

External developers follow production ANKT Portal/Host at https://mxh.ankt.vn and
the implemented hosted SDK API at https://viora-back-end-xmco.onrender.com. They
register their own HTTPS website and backend, download the SDK, and need neither
ANKT source nor a local Host. No required partner Sandbox subdomain is invented.

The 16 public docs now explain registration/domain proof, SDK 0.4.0, Bridge versus
partner login, getLoginCode, server credentials/registration, backend code exchange,
account mapping, own session and auth-store/router integration, grant validation,
Sandbox on the production Portal, review/publishing and deployment diagnostics.
Credential issuance remains an operator task; no nonexistent Portal secret UI is
documented. No legal policy or authentication runtime was changed.

## Consistency and scope

- `features/developer/lib/mini-app-production-guide.ts` is the production bootstrap
  source used by public docs and Portal copy. It always uses the production Host,
  including when the Portal is opened locally. Malformed client IDs/versions are
  rejected; examples use placeholders and carry no server secret.
- SDK reference covers every shipped runtime method, notably getLoginCode, and the
  API reference adds code/partner-exchange/partner-session verified against backend
  route registrations. Example partner route `/api/auth/ankt/exchange` is explicitly
  owned/implemented by each developer, not an automatically provided ANKT endpoint.
- SDK README, Vietnamese integration guide, fallback docs/getting-started pages,
  landing FAQ and contact guidance agree. Demo is explicitly profile-only and does
  not claim partner login.
- Local ANKT setup lives in `docs/operations/miniapp-local-development.md` for platform
  engineers only. Historical handoffs remain historical. Public docs do not instruct
  external developers to install ANKT from a local workspace.
- The SDK runtime was already 0.4.0. Rebuilding retained its versioned bytes and
  manifest SHA-256 `363c60854a1141a8ee9f985760cfc928b537d01d729d786c049b234804f8d0f1`.

## Verification

Docs schema/links passed (16 pages, 50 management API operations plus 6 Bridge/partner
protocol operations). SDK suite passed 34 tests. Docs suite passed; targeted tests
execute the copied production script for success/failure and assert runtime/reference
coverage, matching SDK/manifest versions and backend routes. TypeScript and targeted
ESLint passed.

Chrome exported-docs E2E passed navigation/search, production quick start/code copy,
desktop/mobile layout, reduced motion, 200% text scaling, accessibility, SEO/404 and
sitemap. A separate controlled Portal fixture validates the real SDK artifact hash,
production-only copy from a loopback Portal, and clipboard output. These are controlled
UI/contract tests, not evidence of a live developer login or deployed production rollout.

## Artifacts and deployment

`npm run docs:build` produced `.codex-tmp/stage9-docs-export`. SDK artifacts remain
under `public/sdk/`. Publish via the existing application/docs hosting workflow;
this task made no commit/push or deployment. Include all edited/new content/reference
and helper/test files when preparing a focused change, because much of the docs tree
was already untracked in the current working tree.

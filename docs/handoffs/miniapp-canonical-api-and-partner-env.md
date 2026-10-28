# Canonical Mini App API and partner env setup — 2026-10-27

## User-confirmed production API

The canonical API is **https://api.mxh.ankt.vn**. SDK 0.4.1 changes its default to
this domain. `packages/miniapp-sdk/src/production.ts` is the shared source for SDK
defaults and Portal production examples, preventing different defaults between
the runtime and copied code. Host remains https://mxh.ankt.vn.

Public docs, wire Host examples, SDK README, Vietnamese guide, internal local-guide
API examples, generated snippets and current demo/SDK distributions no longer
contain the provider hostname. Historical reports and immutable old SDK artifacts
remain unchanged. The old SDK 0.4.0 hash is still
363c60854a1141a8ee9f985760cfc928b537d01d729d786c049b234804f8d0f1.

## New release

- SDK: 0.4.1, `/sdk/ankt-miniapp.v0.4.1.min.js`, 7185 bytes.
- SHA-256: b8845ee8a36d41b2d973bd3fed4ea058312c6874972e0a6b567996636d827305.
- Manifest, alias, package/version metadata, compiled declarations/browser script
  and demo were rebuilt. Existing versioned artifacts were not overwritten.
- Developers must replace their self-hosted SDK and change the script version
  query; an explicit old apiOrigin in their app/env must also be updated.

## Partner setup

New public page `/developers/docs/environment-setup`, linked from Quick Start,
SDK and the integration Console. Includes frontend Expo env/read example, generic
backend env/read example, .NET AnktMiniApp binding names, website/backend/ANKT
origin distinctions, secret registration, Sandbox versus Production and required
restart/rebuild/deploy sequence. The SDK does not automatically load .env files.
README and Vietnamese walkthrough carry the same recipes. No real secrets or
partner-specific domain requirements are introduced.

## Verification

35 SDK tests, 17 docs tests, 3 production-bootstrap tests, TypeScript and targeted
ESLint pass. Docs export has 17 pages and passed real-Chrome navigation, copy,
mobile/accessibility checks. Controlled integration UI confirms the SDK artifact
hash and production-only clipboard code when the Portal runs on loopback.
These checks do not establish live API availability or a real user login.

## Live rollout prerequisite

Read-only probes during this task found GET /api/miniapp/auth/me on the canonical
domain returned **404**, and GET /api/mini-apps returned **500**. The source/backend
has the auth routes, but the public domain is not yet confirmed to serve the
current deployment. Before rolling out SDK 0.4.1, deploy/route the current backend
under the canonical domain and verify all /api/miniapp/auth/* operations, CORS,
credential registration and session validation. Without a token /me should reach
auth rejection, not a route 404. An external HTTP redirect to another origin is
not a substitute: SDK requests intentionally use redirect:error.

No live DNS/proxy/backend/frontend settings were changed and no deployment,
database mutation, commit or push was performed. Artifacts are prepared locally;
use the existing hosting workflow after the canonical API route is ready.

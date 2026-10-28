# Production Mini App integration documentation

## Scope and acceptance

Public documentation and Portal copy examples describe external developers using production ANKT at https://mxh.ankt.vn. The user-confirmed canonical public API is https://api.mxh.ankt.vn. Partner domains remain developer-owned HTTPS domains, not a required new Sandbox hostname. Sandbox is a verified identity/environment, not a URL parameter. Internal localhost setup is separate and never automatically copied into production snippets.

Document SDK 0.4.1 and current backend contracts, without changing auth protocol or republishing immutable SDK 0.4.0 bytes. Version 0.4.1 changes the API default to the canonical domain. Add partner frontend/backend environment setup with actual read/bind examples and build/deploy order. Distinguish Bridge profile access from partner login and explain backend-only credentials, grant validation and session ownership. Do not claim the Portal issues secrets when current code requires operator registration.

## Ordered work

1. Contract and regression: compare host-auth.ts, SDK manifest and backend API/service; add checks that public quick start, SDK reference, protocols and copied examples agree and contain no localhost/workspace-install workflow.
2. Shared production example and Portal copy: one reusable safe JavaScript example, production Host regardless of where Portal is running; link optional internal local instructions instead of injecting local config.
3. Public quick start, integration, SDK, lifecycle, troubleshooting and changelog; README and Vietnamese guide; label profile demo accurately. Keep historical handoffs intact.
4. Verify docs schema/links, SDK examples and SDK build/tests; prerender docs and review real-browser output and copy code. Record deployment limitations separately from developer instructions.

Commands: npm run docs:check; npm run test:docs; npm --prefix packages/miniapp-sdk test; targeted ESLint; npm run docs:build. Browser tests use controlled fixture accounts only and do not prove a production user login.

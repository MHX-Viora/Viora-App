# Native Mini App catalog request failure

2026-10-31: Android Utilities displayed the catalog retry error while other content loaded.

## Root cause

- services/mini-app.service.ts used cache: 'no-store' for GET requests.
- React Native fetch uses the installed whatwg-fetch 3.6.20 polyfill, whose Request appends an `_=` timestamp for GET/HEAD with no-store/no-cache.
- MiniAppPublicApi.Query accepts only page/pageSize for lists, and no query parameters for details. Reproduced against production: plain list returned 200 with two items; native Request URL with `_=` returned 400 INVALID_CATALOG_QUERY. This was a request construction issue, not missing publication data.

## Fix

- Removed the fetch cache option from catalog GETs and sent Cache-Control: no-store as an HTTP request header instead. Backend already sends Cache-Control: no-store in catalog responses; existing CORS allows request headers.
- Kept anonymous credentials, abort propagation, redirect policy, response bounds and strict response validation. No backend changes or validation relaxation.
- Added a regression using the actual installed whatwg-fetch Request for both list and detail, checking exact URLs without cache-busting parameters. Test failed before the fix and passed afterward.

## Verification

- 59 Mini App/policy tests passed; changed-file ESLint and TypeScript passed.
- Fixed client using NativeRequest against configured production API returned 200 for list and detail; two catalog items parsed successfully.
- adb reports no connected devices. Real device network/launch verification remains pending; no claim that partner SDK login or launch was tested here.
- Existing AAB 1.0.15 (16) predates this fix. No new build, release, commit or push performed by this task.

# Mini App Android and web recheck — 2026-10-31

## Scope

Reproduce and fix Android launch failures while preserving web. This follow-up
supersedes the unresolved launch observations in `android-device-miniapp-check.md`.
Application changes are confined to the native AuthHost and native transport,
with regression tests. No web adapter, SDK, environment or backend changes.

## Verified

- Connected Android device runs com.ankt.app 1.0.16 (17).
- Utilities displays both published Mini Apps on the device.
- Initial diagnostics: both apps returned API `429 SESSION_LIMIT`. Later, Cổng luật
  reached SDK Connected then emitted a same-URL history notification with
  `loading=true`, which the old handler mistook for document replacement.
- React Native installs `abort-controller`, whose AbortSignal lacks `timeout()`.
  Old native revocation therefore threw before fetch; errors were swallowed by
  host disposal and sessions accumulated toward the server's limit of 10.
- Revocation now uses an independent AbortController and a five-second timer,
  cleared in finally. On-device diagnostics verified revoke HTTP 204 after closing
  Nghệ Thuật Số. Old leaked sessions expire after 15 minutes; no database cleanup.
- Bootstrap now announces a per-document UUID with the top-frame nonce before
  accepting auth traffic. Real replacement closes/revokes; Android history events
  alone do not. Replies also check the document UUID before delivering a code.
- Clean release APK built and installed with `adb install -r`, preserving login.
  Nghệ Thuật Số rendered its main page with account Kai. Cổng luật Việt Nam rendered
  its authenticated home interface and loaded real feed posts and images instead
  of the stopped-display error; verified again after leaving and reopening it.
- All 64 Mini App tests and 35 SDK tests pass; TypeScript and changed-file lint pass.
  New tests failed before each fix, including the actual RN abort polyfill,
  same-document history after SDK connection and replacement-document rejection.
- Expo web export succeeds at `.codex-tmp/miniapp-web-regression-20261031`.
- Production catalog GET returns 200 with two apps. OPTIONS from
  `http://localhost:8081` returns 204 and permits GET with `cache-control`.
  This checks the CORS prerequisite for the shared catalog header change.
- Native changes received independent correctness/security review. Temporary
  diagnostic logging and WebView debugging are absent from the final source/APK.

## Limits and next verification

- Final web export uses the completed source. Chrome at `http://localhost:8081`
  still redirects Utilities to `/login`; authenticated web launch remains untested.
- Login page has existing React Native Web deprecation/animation warnings and
  unauthenticated 401 requests. Do not report a clean authenticated browser run.
- Android rejects ADB input injection (`INJECT_EVENTS`); navigation used public
  deep links. Full partner interactions were not tested.
- Final screenshots/UI dumps are in the OS temporary directory (`ankt-law-verified`,
  `ankt-art-final`). APK: `android/app/build/outputs/apk/release/app-release.apk`.
  Version remains 1.0.16 (17) for local testing. No AAB, Play upload, commit or push.
- An interrupted launch whose response never reaches the host can still leave a
  server session until expiry; that preexisting fallback remains unchanged.

# Mini App native tab navigation — 2026-11-02

## Failure and fix

- Android opened Cổng luật Việt Nam, but switching a partner tab produced
  `host.error` / “Không thể xác minh phiên Mini App. Vui lòng mở lại.”
  Reproduced on the connected 2602EPTC0G with the previous release APK.
- Native transport required every navigation URL and auth reply target to equal
  the initial launch URL. SPA routes change path/query/hash within the same
  document, so normal tabs triggered the host's invalid-navigation shutdown.
- Transport now permits URLs within the configured HTTPS origin, rejecting
  foreign origins, ports, insecure schemes and embedded URL credentials.
  Bootstrap and replies check that origin, the top frame, nonce and document UUID.
  Replacement documents still close the channel and revoke existing sessions.
- Web adapter, SDK, backend and existing native lifecycle rules are unchanged.
  Working tree already contained other Mini App fixes and unrelated changes;
  this task builds on them without reverting them.

## Verification

- Added failing-then-passing native host and transport regressions for SPA tab
  navigation, continued auth messages/replies, rejected foreign navigation,
  and replacement-document grant isolation on a different allowed route.
- Mini App suite: 67 passed before two additional security cases; final focused
  host/transport suite: 22 passed. TypeScript, changed-file ESLint and diff check pass.
- Independent review found no actionable correctness/security issues.
- Device rejects ADB input injection (`INJECT_EVENTS`); user performs tab presses.
  APK installation and opening existing public deep links work through ADB.

## Device recheck

- Release build succeeded (`assembleRelease`, 3m 41s), including release lint.
  APK: `android/app/build/outputs/apk/release/app-release.apk`.
- `adb install -r` succeeded; device reports com.ankt.app 1.0.17 (18), retaining
  the user's login. Deep link reopened Cổng luật and its ANKT auto-login page.
- Cổng luật authenticated and rendered its real feed after the update. User
  repeated the previously failing tab interaction and reported “đã hết lỗi”.
  Subsequent UI inspection also showed Nghệ Thuật Số's WebView without the host
  verification error; its complete partner flow was not separately verified.
- No AAB, store upload, commit or push performed.

## Google Play installation recheck

- Connected device reports com.ankt.app 1.0.17 (18), installed by
  `com.android.vending`. Its embedded JS SHA-256 matches the local 1.0.17 AAB
  exactly and differs from the 1.0.18 AAB containing the tab navigation fix.
- Publish `releases/ANKT-1.0.18-versionCode19.aab` and update through Google Play
  before repeating the partner tab interaction. This recheck did not install or
  upload a build.
- Before committing, all 69 Mini App tests passed against the current source.

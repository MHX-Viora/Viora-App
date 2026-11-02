# Android AAB 1.0.18 (19) — 2026-11-02

- Version synchronized in app.json, android/app/build.gradle, package.json and
  both root package-lock.json entries. Dependencies unchanged.
- Includes the native Mini App SPA tab navigation fix. Previous APK 1.0.17 (18)
  contained the same fix; user confirmed the error was gone on the connected
  phone. See `miniapp-native-tab-navigation.md` for tests and device evidence.
- `bundleRelease --console=plain --max-workers=2`: successful in 1m 6s,
  including release lint. Existing Gradle deprecation warning remains.
- Artifact: `releases/ANKT-1.0.18-versionCode19.aab`, 233.40 MiB.
- SHA-256: `ec6529b904f0b26e6b594d4ec6372723ef6c432333efef693f097499e8e848b1`.
  Checksum and short Vietnamese release notes are alongside the AAB.
- jarsigner verifies the signature, with the existing certificate trust warning.
  Merged release manifest reports com.ankt.app, 1.0.18 (19), no debuggable flag.
  AAB structure and embedded JS bundle match the completed release build.
- Production audit: 47 findings (0 critical, 15 high, 31 moderate, 1 low),
  including Firebase/grpc, expo-router and transitive dependencies. Not fixed
  by this version-only build; dependency remediation needs separate validation.
- No new application logic after the preceding passing tests, TypeScript, lint
  and device check. New AAB was not installed or uploaded to Google Play.
- No commit or push performed.

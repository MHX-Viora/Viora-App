# Native Mini App catalog visibility

## Change, 2026-10-31

- Utilities previously mounted MiniAppSection only on web, hiding it on Android/iOS even when the native host was enabled.
- Utilities now uses the same platform/flag condition as MiniAppHostScreen: global runtime or Auth Bridge flag enabled, plus EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED=true for Android/iOS. Unsupported platforms remain hidden.
- Local ignored .env now enables native runtime; existing Auth Bridge flag was already true. No backend or app identity changes.
- Regression integration test renders actual UtilitiesScreen for Android/iOS, checks catalog navigation and Explore, and verifies disabled flags retain Wallet without mounting the catalog.

## Verification

- All 51 Mini App tests passed, including native AuthHost/WebView harnesses.
- TypeScript and ESLint for the changed source/test passed.
- Configured public catalog API returned total=2, items=2 without authentication.
- No adb device/emulator connected. Actual native login/launch not verified; no APK/AAB built or published.

## Run / deploy

- Native build environment requires EXPO_PUBLIC_MINI_APP_AUTH_BRIDGE_ENABLED=true and EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED=true, plus the existing correct EXPO_PUBLIC_API_URL.
- Restart Metro with cleared cache for a development build. Installed release builds need an updated bundle through the existing supported delivery process or a new native build; local .env does not update installed releases.
- Auth Bridge uses the existing react-native-webview adapter. Backend Auth Bridge must stay enabled, catalog apps published/available, and each partner app's production URL/SDK configuration valid. Validate native launch/login/logout on a device before release.
- This task did not commit, push, change server settings or publish a build.

## Superseding change: always available, 2026-10-31

- User requested Mini Apps enabled everywhere without frontend enable flags. The earlier flag requirements above are historical.
- Catalog and host screen now support web/Android/iOS regardless of old flags. Public Mini App routing is enabled by default.
- Both adapters default to Auth Bridge without environment flags. Existing legacy runtime remains selectable only via explicit EXPO_PUBLIC_MINI_APP_RUNTIME_ENABLED=true with Auth Bridge flag not true; this is compatibility selection, not an enable gate. Native legacy host still validates platform and installed module.
- Web Mini App CSP is emitted by default and continues requiring a valid HTTPS API origin. Only the exact Mini App route gets the existing Auth Bridge frame policy; other routes and authentication remain unchanged.
- EXPO_PUBLIC_MINI_APP_NATIVE_RUNTIME_ENABLED is no longer used by application code. Local redundant native flag removed; Auth Bridge flag retained for existing Developer/Sandbox compatibility policy.
- 58 Mini App/policy tests passed, including missing/stale-false flags, native/Web Auth Bridge selection and existing lifecycle/authentication regressions. Device execution remains unverified; no connected device available.
- Existing releases still need updated delivery/build. Backend Auth Bridge, published apps, HTTPS partner pages and their SDK configuration remain required. No backend flag, API authorization, session boundary, redirect validation or partner permission checks were removed.

# Android device verification, 2026-10-31

## Installation and environment

- Connected Android 16 device, model 2602EPTC0G, display 1280x2772.
- Original installed 1.0.16 (17) used a Google Play signer different from local upload signer. Updating in place was rejected. User explicitly authorized uninstalling it and installing the local signed release APK, then logged in manually.
- First fresh install was rejected by device confirmation; user requested retry, which succeeded. Later builds installed with -r using the same local signer and retained the new login.
- Remote input injection is disabled on this device. Screens opened through supported viora:// links; user manually pressed Retry when requested. No password/token was read or supplied to automation.
- Screenshots/UI dumps remain in OS temporary directory, outside repository source.

## Header and catalog results

- Actual home category buttons: y=167..297 physical pixels. Actual profile action buttons: y=168..298. Both below the status bar, same vertical placement within one pixel.
- Utilities showed Cổng luật Việt Nam and Nghệ Thuật Số on the actual device without catalog retry error.
- Home/profile buttons exposed their expected clickable accessibility nodes; remote tap execution was not available because Android rejected INJECT_EVENTS.

## Native WebView issue reproduced

- Both Mini App screens initially closed with host.close_unconfirmed, including after user manually pressed Retry.
- Temporary diagnostics recorded two same-URL load-start callbacks 290 ms apart, with no background event or screen-close event. The old handler treated any second start as a reload and immediately destroyed the view.
- Native AuthHost now accepts duplicate first-load starts only for the exact configured URL, before successful load completion and before any trusted bridge message. A later reload, bridge traffic followed by another start, URL change, background or logout still closes/revokes.
- Added tests for duplicate Android first-load callbacks and reload following pre-load bridge authentication. All 61 Mini App/policy tests passed; ESLint and TypeScript passed.
- Temporary diagnostic logs removed. Updated release APK built for on-device recheck; existing public AAB was not rebuilt by this task.

## Actual recheck results and remaining failures

- Merely tolerating pre-completion duplicate starts was insufficient. The installed react-native-webview Android RNCWebViewClient dispatches TopLoadingStartEvent from doUpdateVisitedHistory, not just document loads. Its native loading=false event for the exact bound URL is now treated as a same-document history notification; navigation checks still run first. Real loading=true events after completion/bridge traffic still close the channel.
- Added a failing-then-passing history-update regression. All 62 Mini App/policy tests, changed-file lint and TypeScript passed. Final code contains no temporary logging or WebView debugging enablement.
- Latest local signed release APK (still 1.0.16/17 for device testing) installed successfully with -r and retained the user's login. Source comment refinement afterward is nonfunctional only.
- Nghệ Thuật Số now kept its WebView visible and rendered its own ANKT connection page. After waiting, the partner UI showed 'Kết nối đang gián đoạn' / 'Chưa thể mở Nghệ Thuật Số'. Successful SDK login and usable partner content were NOT confirmed.
- Cổng luật Việt Nam still transitioned to host.close_unconfirmed during loading/reload. Successful website execution was NOT confirmed. Public HTML fetch found no obvious SDK integration; that observation alone is not proof of the native failure cause.
- Consequently only app launch, matching home/profile header positions and catalog loading are verified on-device. End-to-end Mini App operation remains failing and needs investigation of partner reload behavior and native SDK/auth exchange. Do not label either Mini App fully functional.
- No new AAB, Play upload, commit or push performed. Screenshots/UI dumps are kept in the OS temp folder ankt-device-check. Remote input remains denied; route navigation used the app's existing public deep links.

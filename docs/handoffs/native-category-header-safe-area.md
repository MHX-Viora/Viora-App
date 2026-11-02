# Native category header safe area

2026-10-31: User reported Cộng đồng / Video / Báo / Live tabs overlapping the phone status bar and requested a little more top space.

- FixedTopBar used top=-safeTopInset, canceling its own safe-area padding while Feed/Reels/Live render in ordinary Views without top safe-area padding.
- Native header now starts at top=0 with safeTopInset+8 padding. Shared layout height includes that space for all native header modes.
- Feed, Reels and Live pass the current top inset into the same layout helper, reserving matching list/skeleton space. Native Reels sort/actions header also sits below category tabs.
- Desktop and compact-web geometry remain unchanged. Invalid insets clamp to zero before the extra 8 px gap.
- Regression tests cover zero, 24, 44 and 59 px insets, invalid values, header modes, matching content space and unchanged web geometry. Seven focused layout/Reels tests passed; TypeScript passed.
- No native device/emulator available; physical touch verification remains pending. No build, commit, push or release performed.
- Broader Reels theme suite has an existing search palette assertion failure (borderBottomColor/borderBottomWidth); reproduced using the test from HEAD without this patch. Not changed here. ESLint has no errors on changed files; Feed/Reels screen warnings predate this fix.

## Follow-up: apply inset only to tabs

- User found the previous header too low and requested the background stay at the top while only category controls move down.
- FixedTopBar now has an absolute, pointerEvents=none background extending upward by the native safe inset. Its content container stays at top=0 with no top padding.
- FeedCategoryHeader alone receives the native safe inset. The extra gap was reduced from 8 to 4 px, preserving its existing 5 px internal tab padding and 50 px control row. Shared height reserves the matching space; composer/search controls receive no additional outer padding.
- Web header and sidebar geometry remain unchanged. Existing Feed/Reels/Live callers still share the same inset-aware height.
- Three focused regression tests pass, including actual component structure and all four tab callbacks at 0/24/44/59 px insets. No device verification or new AAB built for this follow-up; the existing 1.0.15 artifact contains the earlier header implementation.

## Profile header follow-up

- ProfileHeader previously used a fixed 18 px native top padding, ignoring the actual status-bar/notch inset. Replaced it with safe top inset + 4 px on native; web remains at the original 8 px padding.
- Only the profile action header is changed. Friends, QR and Settings keep their callbacks, accessibility labels and 40 px button size; header background stays in place.
- Eleven focused header/profile regression tests passed, including Android/iOS 0/24/44/59 px inset cases and unchanged web spacing. No device test, build or release performed.

## Compact category tabs

- User requested reducing the visible space above category icons by more than half.
- Native category row now reserves 44 px instead of 55 px, removes its extra 5 px outer padding, and keeps only safeInset+4 px above the row. Native buttons no longer inherit the web-only 12 px top padding or 5 px downward icon translation.
- Buttons retain a 44 px minimum touch height. Shared Feed/Articles/Reels/Live header heights shrink by the same 11 px so following content remains aligned. Web and profile spacing remain unchanged.
- Three geometry/component regression tests passed; actual tab callbacks, no icon translation and zero button top padding are covered. No new AAB or physical-device verification in this follow-up. Existing 1.0.16 (17) artifact predates this change.

## Match profile header height

- User selected the profile header proportions as the final reference, superseding the 44 px compact row above.
- Native category header now totals safeInset + 54 px, matching ProfileHeader: safeInset+4 px top space, 40 px controls and 8 px bottom space within the header envelope. Native icon translation and button top padding remain removed.
- Shared header/list geometry updated by the same amount for Feed/Articles/Reels/Live. Composer/search sections remain separate. Web and ProfileHeader are unchanged.
- Five focused layout/component/profile tests passed, including comparing actual ProfileHeader dimensions against the category header across 0/24/44/59 px safe insets. No new AAB built or physical-device validation performed.

## Reels sort row spacing

- After matching header proportions, the category header's extra native top gap was reduced from 4 to 2 px at user request; its envelope is now safeInset+52 px. ProfileHeader remains unchanged.
- User requested the Reels Bạn bè/Theo dõi/Đề xuất row start 7 px below the shared category header. Native ReelsHeader now aligns its row to the top with 7 px padding, overriding previous bottom/center alignment in both empty and video overlay modes. The create button's old negative margin is removed on native.
- Android/iOS component test verifies the 7 px gap and all sorting/create/search callbacks. Four focused header/layout tests passed. Web styles remain unchanged. No APK/AAB rebuilt for these spacing changes.

## Reels integrated offset correction

- On-device screenshot showed category buttons y=160..290 but sort controls y=665: isolated component spacing was correct while the full screen applied the category height twice.
- ReelsHeader is inside the content View below ResponsiveContent's paddingTop=categoryTopBarLayout.height. Removed its additional native top=categoryTopBarLayout.height; top is now 0 relative to that already-offset parent, with the existing 7 px native row padding retained.
- Actual ReelsScreen regression now uses a nonzero 80 px category height in native mode and asserts sort header top=0, while retaining advertising navigation checks. Test failed before the fix. Five focused screen/header/layout tests passed; TypeScript passed. Screen lint has two pre-existing warnings, no errors.
- Updated signed APK is built/installed for device verification; no new AAB or Play release in this follow-up.
- Device recheck confirmed sort top moved from y=665 to y=344 physical px while category button bounds stayed y=160..290. Screenshot visually verified the large blank gap was removed. Phone left on Reels with the updated APK.

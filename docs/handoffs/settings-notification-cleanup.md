# Settings and notification cleanup — 2026-10-15

- Removed the gift-effects switch from profile settings. Existing gift animation
  and accessibility behavior is unchanged.
- Removed Modern Dark from theme choices. Saved `modern` values normalize to the
  default Light theme; Light and Ocean remain selectable. Retained the legacy
  modern palette used by older components through colors.ts. Updated the media
  preview's dark-mode toggle to Ocean.
- Root cause of mark-all-read on web: installed react-native-web implements
  `Alert.alert` as an empty function, so its confirmation callback never ran.
  Reused the existing AuthAlert modal for confirmation and API errors on all platforms.
- Added a synchronous pending guard, disabled/busy header feedback and list revision
  invalidation so duplicate clicks cannot submit twice and an older GET cannot undo
  successful read status. Refresh from the server reconciles concurrent arrivals.
- API failures retain unread items/count and show an error. Existing authenticated
  PUT /api/notifications/read-all and user-scoped backend update require no changes.

Validation: six new regression cases failed before implementation; all 25 focused
notification/theme/profile/audio tests now pass. TypeScript, full Expo lint and
production web export pass. Browser tests used actual screen/header/modal/settings/theme components and
local fake API/decorative fixtures, without production account access. Verified cancel,
request lock, failure preservation/retry, successful read-all and theme switching.
Settings/theme UI fits 375px and 1280px viewports; exercised browser console has no errors.
No live API mutation, native-device test, commit or deployment performed.

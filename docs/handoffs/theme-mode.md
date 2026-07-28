# Theme Mode Handoff

## Delivered

- Added typed, extensible `modern | classic` themes and semantic color/effect tokens.
- Classic follows the Version 1 Facebook/Zalo-style palette: `#F0F2F5`
  application background, white cards, `#E4E6EB` secondary surfaces,
  `#1877F2` primary, `#050505` main text, and `#65676B` secondary text.
- Added `ThemeProvider`, `useTheme()`, `theme_mode` AsyncStorage persistence, and a
  240 ms fade transition without app reload.
- Added “Giao diện” to the existing profile Settings sheet with Modern/Classic
  options, radio accessibility state, current value, and selected check.
- Themed React Navigation, StatusBar, bottom tabs, shared overlays, toast, auth,
  feed, reels/video chrome, chat, calls, notifications, profile, friends,
  settings, comments, search, and utilities.
- Migrated color-bearing `StyleSheet`s to memoized theme factories. Removed the
  three old static feature palettes.
- Classic uses a dedicated flat dark media palette for Reels, reel previews,
  and group video calls so white playback controls remain visible.
- Fixed context-sensitive Classic overlays/actions that previously became
  white-on-white. Incoming-call labels use semantic text colors, and unread
  notifications use a light-blue surface.

## Scope Safety

- No API/service, route list, auth, realtime, push notification, or business
  behavior was changed.
- Existing layout, spacing, typography, icons, and feature animations were kept.
- Only `@react-native-async-storage/async-storage` was added.

## Verification

- Theme preference and contrast tests: pass (6/6).
- `npx tsc --noEmit`: pass.
- ESLint: pass with zero errors; 19 pre-existing warnings remain.
- `npx expo export --platform android`: pass (2,327 modules).
- Component color audit: zero hex/rgb literals under `app/`, `components/`, and
  `features/`; values live in theme definitions.
- Static palette audit: no component imports a static palette.

## Manual QA

1. Open Hồ sơ → Settings → Giao diện.
2. Select Classic and visit every tab plus auth/chat/call/modal flows.
3. Force-close and reopen; confirm Classic is restored.
4. Select Modern and compare against the existing dark/cyan UI.
5. Verify StatusBar and tab bar update immediately in both modes.

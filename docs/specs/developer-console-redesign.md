# Developer Console redesign

User attachment is the design brief. Preserve Expo Router, API/BFF/session/SSO,
real account/app data, all detail tabs and create/upload/rotation/domain/review
flows. No backend/schema/dependency/secret changes. Palette blue #0866D9,
white, #F7FAFF, text #10233F; existing ANKT logo retained.

Shell: 72px existing public header, avatar identity + account dropdown, no bell;
260px sidebar with Overview/Create/My Apps/Review notifications. Existing
/console and /console/apps distinguish overview/list; detail nested routes select
My Apps. Settings remains accessible via avatar only. Native dialog drawer for
mobile with focus containment/Escape/close/restore. No docs/settings sidebar.

UI: shared page heading/breadcrumb, SVG empty illustration + existing create
dialog, grid API-backed app cards (logo/name/ID/status/created date), overview
API total only. Style existing detail/settings/review forms/tabs/cards with scoped
console design tokens; never replace data with demo data. Retain loading/error,
pagination, all existing callbacks and sensitive-data lifecycle.

Verify: node developer suite, tsc, targeted ESLint, Expo export, real browser
fixture testing desktop/tablet/mobile, empty/populated/error/create/drawer/account
dropdown and actual localhost public shell. Fixture-only synthetic data clearly
isolated from application. Real backend mutations require an approved real test.

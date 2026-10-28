# Compact Mini App toolbar — 2026-10-27

- Actual host screen now has a fixed 40px single-row header (previously ~68px),
  22px contain-mode logo, 14px one-line title, 36px icon controls with hit slop.
- Back arrow closes the current controller and navigates back to ANKT; direct
  deep links fall back to /(tabs)/utilities. Existing initial focus is preserved.
- Headset icon opens the existing /support route. Removed header reopen action;
  error/closed states retain their separate retry action. Status strip is smaller.
- Native and web use the same screen. No session, API, host-origin or runtime
  policy changes. Updated browser fixtures and old E2E control selectors.

Validation: two actual-screen Node tests passed for dimensions/back/support and
fallback routing. Chrome UI fixture passed at 320/375/768/1440px: compact height,
no overflow, keyboard focus, back/support, retry and SDK disposal; no console or
external-request issues. Separate DevTools check at 390px confirmed 40px height
and accessible icon labels. Frontend types and changed-screen ESLint passed.
No real API/device acceptance or production deployment. Full legacy real-host
E2E runners were updated for the new controls but not executed in this task.

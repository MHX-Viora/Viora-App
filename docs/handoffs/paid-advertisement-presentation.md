# Paid advertisement presentation

- Root cause: feed/reel owner injections used `isPreview: true` even though they
  select only active, funded advertisements within their delivery dates.
- Owner injections now use `isPreview: false, isOwnerView: true`. Draft previews
  remain previews. Impression and click tracking skip owner views independently
  of the preview flag. Reel fallback mapping also marks the owner item `isMine`.
- Reel ads share the normal right-hand avatar/follow rail above the like action;
  the separate avatar beside the caption was removed. Sponsorship and CTA remain.
- CTA now sits inside the left caption column in `ReelCard` and
  `ReelAdvertisementPreview`, freeing the right rail to reach the bottom beside
  the CTA. Profile reel details share `ReelCard`. Chrome geometry checks confirm
  CTA/rail separation, bottom alignment and unchanged organic rail position at
  320/375/768/1440px; `.codex-tmp/cta-inset-*.png` contains fixture screenshots.
- Backend inspection: submit activates immediately when start time has arrived;
  future schedules remain Approved. Delivery excludes the advertiser, and event
  recording rejects self interactions. No backend/payment changes were required.
- Validation: paid-presentation regression tests, existing draft/post and form
  tests, reel advertising entry test, TypeScript pass. ESLint: zero errors, five
  existing warnings. Isolated Chrome layout checks passed at 320/375/768/1440px;
  screenshots are in `.codex-tmp/paid-reel-*.png` (mocked content/player).
- No live wallet transaction or production delivery was executed.

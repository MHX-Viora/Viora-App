# Advertisement duration slider

- Shared post/reel form uses `AdvertisementDurationSlider`: 1–30 whole days,
  default 3, live budget/end-date updates. Web uses native range input; native
  uses a themed PanResponder track with accessibility increment/decrement.
- Audience UI and custom-age state removed. Submission explicitly sends
  `AdvertisementTargetingMode.Automatic` without age constraints.
- Schedule rejects durations above 30; normalization clamps slider values.
- Verification: schedule boundary tests, web/native slider interaction tests,
  shared-form submission tests for post types 0 and 1, targeted ESLint/type check.
- Chrome DevTools session unavailable because its profile is already in use;
  browser and real-device visual verification remain manual.

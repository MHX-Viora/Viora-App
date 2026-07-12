# Spec: Utilities screen

Replace the utilities placeholder with a responsive screen matching the supplied reference: a weather feature card and a four-column category grid. Use existing theme tokens and Ionicons, accessible press targets, and no new dependencies. Verify with TypeScript and lint.

Weather uses Open-Meteo current conditions over HTTPS, validates the response, supports refresh, and degrades gracefully offline. Category styling uses a low-contrast neutral surface and consistent icon treatment.

Weather requests foreground location only, rounds coordinates before calling Open-Meteo, resolves a local place label, and falls back to Hanoi when permission or positioning is unavailable.

“Xem chi tiết” opens a full-screen forecast view with current conditions, five daily forecasts, twelve upcoming hourly points, and UV/humidity/apparent temperature/wind/sunset/pressure metrics from the same rounded coordinates.

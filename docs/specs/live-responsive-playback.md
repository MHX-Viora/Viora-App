# Responsive screen live playback

- Fit the entire video horizontally on phones, preserving aspect ratio. Keep
  larger stages centered over a blurred cover backdrop.
- Screen and face camera must lay out independently: when a portrait viewer has
  spare space, place the camera in the upper/lower band matching the host's camera
  half. On larger stages retain the host's inset position.
- Continue publishing one Agora video, packing a clean screen plus camera strip;
  render each source region separately. Host preview retains its draggable inset.
  Relay validated presentation metadata through the existing authenticated live
  hub, host only, with a late-join snapshot and reconnect refresh. No DB migration.
  Old/metadata-free streams use aspect-fit playback.
- Gift notification banners retain their original right-aligned position. Only
  the animation scene is centered on screen, independently of the banner.
  Mobile effects span stage width; desktop effects have a bounded centered width.
  Spare stage space uses the existing blurred cover. No visible drag icon/text.

SVGA web must render inside a plain block container: RN Web's flex layout changes
the intrinsic canvas dimensions before SVGA applies its scale transform, causing
a second shrink and an off-center result. Test with the shipped SVGA renderer.

Plan: fit playback/gift placement; bounded layout and packed-video tests; host
packing/preview; authenticated metadata relay; web/native audience crops and
responsive camera; browser pixels/layout and native/contract tests; TS/lint,
backend build/tests and Android export; update handoff with deployment limits.

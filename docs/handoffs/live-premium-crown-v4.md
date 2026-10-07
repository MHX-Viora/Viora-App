# Royal Crown V4 handoff

## Result
Dedicated 4.8s Crown scene: subtle 7–10% dimming, curved gold gathering, progressive silhouette/metal formation, localized royal illumination, floating sculpted gold crown, masked diagonal sweep, eight staggered gemstone/edge glints, finale pulse and row-wise surface dissolution. Five beveled points, elliptical band/depth, engraved filigree, raised faceted stones. Pure SVG geometry; no crown bitmap/emoji or new dependencies.

## Code boundaries
- `premium-gift-crown-model.ts`: deterministic geometry, responsive layout, timeline, dust/glint/dissolve plans and conservative node estimate.
- `premium-gift-crown-art.tsx`, `-renderer.tsx`: metallic gradients/facets, native clipping/countertranslation, ten crossfaded static SVG sweep masks.
- `premium-gift-crown-environment.tsx`, `-particles.tsx`, `-scene.tsx`: localized illumination, three dust depths, batched flecks and compact sender label.
- Shared model/layer/camera: Crown V4 descriptor, 4800ms presentation normalization and linear clock; Crown respects user/system reduced motion, skips generic double lighting and stops visual/haptic feedback in background. Background cancellation does not restart the current showcase; queue deadlines continue.
- Combo updates quantity without restarting progress or extending expiry. Five Firework module SHA256 hashes match the pre-task snapshot. Existing Firework timing/rendering and purchase/realtime/video integration preserved.

## Verification
- 446 tests pass, including six new Crown model tests and Crown→Firework→Crown duration/combo regression. RED failures observed before model/duration implementation.
- `npx tsc --noEmit` passes; focused Crown/preview ESLint clean. Shared layer retains three existing exhaustive-deps warnings: depending on the whole active object would restart combos.
- Offline Expo web export passes after final changes.
- `scripts/crown-preview.tsx` is a standalone development entry, never imported by application routes. Uses ThemeProvider, real manager/layer, phase seek, reduced toggle, mixed queue, combo and cancel.
- Browser visually inspected formation (900ms), metal/showcase (2400ms), top-to-bottom dissolution (4100ms), full playback and responsive phone/landscape/tablet/desktop. Nominal emulation: 375×812, 812×375, 768×1024, 1440×900, 1920×1080. Browser zoom was 80%; final corrected emulation 300×650 yielded actual CSS viewport 375×813 without horizontal overflow.
- Real mixed queue transitioned Minh Anh(Crown)→Linh(Firework)→Huy(Crown)→idle. Combo showed ×3/waiting0, a single dust group; comment control incremented during overlay. Cancel left zero SVG and only the background image. Reduced mode: one image/four static SVG, no dust/sweep/glints.
- Preview rAF sample: 682 frames over 4.85s, p95 gap 8.5ms, no gap >34ms. Longer mixed sample: 1576 frames, p95 19ms, two >34ms gaps. These are browser preview observations over a still background, not native Agora benchmarks.
- No console errors. Expected React Native Web warning: native animation module unavailable on web, falling back to JS. Native code keeps supported opacity/transform properties on `useNativeDriver`.

## Remaining device validation
Android/iOS with active Agora video: verify frame rate/thermal impact and AppState background/haptic cancellation. Native device execution was unavailable here; no claim of measured Agora performance or native mask parity. Quality budgets are bounded (low54–ultra94 animated wrapper estimate); hundreds of dissolve flecks use only 4–16 SVG clusters.

## Preview commands
From repo: `EXPO_OFFLINE=1 npx expo start --port 8081 --max-workers 0`. Serve `.diagnostics/crown-preview.html` from the workspace diagnostics server on 8082; it loads `scripts/crown-preview.bundle?platform=web&dev=false&hot=false&lazy=false` from Metro. Runtime logs/build output stay outside the app under workspace `.diagnostics`.

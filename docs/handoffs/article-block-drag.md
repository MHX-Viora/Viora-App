# Article block drag controls

- Drag grip moved into the block header beside up/down/delete; the separate
  “Giữ để kéo thả” row was removed. Controls retain accessible labels.
- Reproduced mouse drag failing to reorder in the web DraggableFlatList runtime.
  Web now uses a FlatList adapter and pointer-based grip with midpoint reorder,
  edge autoscroll, pointer-up/cancel/blur cleanup and keyboard arrow movement.
  Native retains DraggableFlatList and a 200ms long press on the grip.
- Editor blocks have stable `clientKey` values, including unsaved blocks.
  Editing/reordering retains these keys; serialization removes keys/timestamps
  and normalizes `orderIndex`, preserving persisted IDs and content.
- Verification: identity/serialization tests, TypeScript, targeted ESLint passed.
  Chrome exercised mouse drag in both directions, emulated touch and keyboard
  reorder at 320/375/768/1000px, header alignment/no horizontal overflow and
  the serialized publish payload. APIs and icons were mocked in this fixture;
  no real article was published. Native hardware was not exercised.
- Browser fixture: `.codex-tmp/editor-drag-regression.browser.mjs`; build fixture:
  `.codex-tmp/editor-drag-build.mjs`. Both need process-spawn permission locally.
- Editor close now dismisses the keyboard and uses history when available. Direct
  opens fall back to the articles feed for new articles or `/article/manage` for
  editing. The close button has a 44px hit area and button role. Regression tests
  and real Chrome clicks cover all three routes; TypeScript/ESLint pass.
- Drag motion: web lifts an inert/hidden-to-accessibility card copy following the
  pointer, dims the source, animates neighboring cards with FLIP and settles the
  copy on release. Cancel/blur/unmount clean up; reduced motion skips transitions.
  Native active scale is 1.02.
- `ArticleBlockTextInput` grows/shrinks Text/Heading and other multiline blocks.
  Web measures an offscreen textarea at the actual width, avoiding scrollbar
  width changes during measurement; ResizeObserver handles viewport reflow.
  Native uses content-size events. Compact minimums: Text 56px, Heading 40px.
- Upload alert is centered with a 360px cap and mobile gutters for image/video.
- `.codex-tmp/editor-layout.browser.mjs` passed motion/cleanup, reduced motion,
  18-line Text and 9-line Heading growth/shrink, desktop-to-mobile wrapping and
  image/video upload checks at 320/375/768/1440px. Existing reorder tests,
  serialization/access tests, TypeScript and targeted ESLint pass. Native device
  testing remains outside this browser fixture.

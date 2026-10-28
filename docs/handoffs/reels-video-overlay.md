# Reels video overlays

- ReelsHeader starts below the category bar and overlays loaded reels with a transparent
  background and contrasting controls. Mobile uses a 56px row with no top padding;
  controls are vertically centered without the old negative create-button margin.
  Loading/empty states retain the theme palette.
- The main video keeps its contained aspect ratio. Author/caption/actions overlay the
  video region and remain above the bottom navigation via `safeBottomInset`.
- Foreground video is vertically centered within the usable region above the footer;
  containment subtracts the footer inset so video pixels cannot be hidden underneath it.
- Header is positioned at local top zero inside ResponsiveContent's already-offset
  container; do not add the category bar height again.
- Web reels draw the playing video into a small canvas behind the contained foreground,
  blurred with CSS to fill letterboxed space even without a thumbnail. This reuses the
  existing decoder and audio; no second player or media request. Active reels paint at
  most 10 fps; inactive reels paint on load only. Animation/listeners stop on cleanup.
- Native keeps the existing blurred thumbnail backdrop.
- Verification: five theme/header tests, TypeScript and affected-file ESLint (existing
  BOM/unused createReel warnings). Chrome fixture renders real ReelCard/ReelsHeader with
  a video-player adapter and actual landscape/portrait media at 375/430/1024px; checks header
  position/transparency, painted canvas pixels, blur, aspect ratio and author clearance.
- Browser screenshots: `.codex-tmp/reels-overlay-{landscape,portrait}-{375,430,1024}.png`.

# Reel upload preview

- Web selection preview uses a native HTML video element with explicit 100% width/height,
  `object-fit: contain`, inline looping playback and a black media canvas.
- Playback starts after mounting. `playVideoPreview` tries audible playback, falls back
  to muted playback only on `NotAllowedError`, and exposes other failures to the caller.
- Sound control reflects actual media mute state; clicking it also resumes playback.
  A play button remains available when autoplay is blocked; media failures show an error.
- Loaded duration updates the selection badge in milliseconds; changing source remounts
  the preview, and closing pauses/unmounts it. Native retains Expo Video playback.
- Verification: four playback policy unit tests, affected-file ESLint, TypeScript.
  Real Chrome fixture uses generated landscape/portrait clips with audio at 375/1024px;
  verifies contain bounds, autoplay, mute/unmute, source replacement and close.
- Browser fixture mocks camera/native player only; web video playback is real.
  Existing RN Web shadow deprecation is excluded from fixture error checks.
- Unit command: `node --import tsx --test --experimental-test-isolation=none utils/video-preview-playback.test.mjs`.
- Browser artifacts: `.codex-tmp/video-preview-{landscape,portrait}-{375,1024}.png`.

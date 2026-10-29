# Portrait live host camera backdrop

When the host camera is portrait inside a wider stage, show the selected live
cover as a blurred, dimmed background in the unused area. Keep the full camera
frame centered, preserve controls and publishing, and handle resizing/orientation
changes. Use the existing default-cover fallback if the cover is missing/broken.
Camera-off/not-ready states retain the existing full cover presentation.

Plan: verify contained-frame geometry and blur-only cover/fallback tests; add
blur-only cover rendering and a correctly sized web Agora player; verify portrait,
landscape, cover changes, resize and controls in Chrome with a mocked SDK;
run TypeScript, lint and existing host checks. No publishing/encoding changes.

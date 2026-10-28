# Red Live discovery banner

- `features/live/live-discovery-banner.tsx` replaces the previous purple discovery
  banner in `live-stream-screen.tsx`. Burgundy background, glossy 3D camera on the
  right, ANKT LIVE eyebrow, “Xem live – Gặp gỡ – Kết nối” heading and community copy.
  No discovery button, fake audience count, avatar stack or duplicate LIVE badge.
- Asset: `assets/images/ankt-live-banner-red.png`. Generated using the built-in
  imagegen tool from the supplied reference and copied into the repository. Existing
  live-cover assets remain unchanged. Full-width banner, 4.1 aspect ratio with minimum
  height, compact copy below measured width 520px. Native text remains separate.
- Verified browser at 320/375/768/1440px: image loads, no CTA, no horizontal overflow.
  Desktop/mobile screenshots: `.codex-tmp/live-banner-{375,1440}.png`.
- TypeScript and affected-file ESLint passed. No live fetching/playback changes.

## Image prompt (built-in tool)
Use case: precise-object-edit. Turn the latest attached ANKT LIVE banner reference
into a production website background asset. Keep its ultra-wide horizontal composition,
deep burgundy red background, soft red glow and glossy red 3D video camera with a pale
play triangle on the RIGHT, small floating chat bubbles, tiny sparkles, and the glowing
red elliptical platform. REMOVE ALL TEXT on the left, including ANKT LIVE, heading and
description, and REMOVE the white discovery button entirely. Keep the LEFT 55% as clean
deep burgundy negative space, gently blending into the illustration on the right. Keep
the small LIVE plaque beneath the camera if possible. Full bleed rectangular background
without white outside margins or rounded corners; the app supplies corners. Aim for
1600x400 composition, polished 3D marketing illustration faithful to the reference.
Do not add any buttons, interface controls, or text on the left. Save output as a
project-ready image.

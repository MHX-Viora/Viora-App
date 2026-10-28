# Compact Mini App toolbar

Replace the text close/reopen buttons with a left back arrow and right support
icon; keep logo and one-line app name between them. Target 40px toolbar height
(previously 68px), 22px logo and 14px name. Reuse theme colors and Ionicons.
Back closes the controller and returns to ANKT; a direct deep link falls back to
the Utilities tab. Support opens the existing /support route. Keep failure retry.
Accessible icon labels, focus-on-back, hit slop and SDK cleanup remain required.

Verify actual screen rendering/back/support callbacks and dimensions with Node
tests, then Chrome fixture at desktop/mobile widths, typecheck and changed-file
lint. No API/auth/production-host policy changes, deployment or automatic commit.

# Host mobile browser support and emoji

- Detect the actual Screen Capture API and secure context before screen capture.
  Unsupported mobile browsers receive a clear Android-app/desktop alternative;
  do not report camera capture as screen capture. Keep ordinary camera live usable.
  The capability decision is feature-based, not a blanket mobile user-agent ban.
- Explain unavailable screen sharing at device check and reject direct capture
  calls before invoking Agora or allocating capture resources.
- Host comments get the same basic emoji set as viewer comments on desktop and
  mobile. Toggle/close the picker, append multiple emojis, send normally, preserve
  draft after failure, and disable emoji/send while comments are disabled.

Plan: API support tests and browser-capture guard; shared emoji catalog and host
composer; desktop/mobile browser interaction tests; TS/lint and capture regression
checks. No new permissions, backend changes or unsupported browser workarounds.

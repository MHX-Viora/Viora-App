# Article editor motion and sizing

- Web drag lifts a noninteractive card copy following the pointer; neighboring
  cards animate into their new positions and the lifted card settles on release.
  Preserve stable block keys, pointer/touch/keyboard reorder and edge autoscroll.
  Respect reduced-motion preferences. Native retains the animated drag library.
- Multiline block inputs grow with content and wrapped lines, shrink after
  deletion and remeasure when width changes. No internal textarea scrollbars.
  Text and heading start compact; preserve content and publish payloads.
- Upload status is centered and capped at 360px, fitting mobile side gutters.

Plan: auto-growing input, drag/neighbor animation, compact upload status; verify
  actual typing/pasting/resizing, mouse/touch reorder, reduced motion and upload
  layout in browser fixtures. Run existing block tests, TypeScript and lint.

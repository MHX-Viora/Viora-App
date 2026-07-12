# Implementation plan: Reel viewer controls

1. Add active-transition replay and video time/speed/audio state; verify with type-check.
2. Add long-press settings with seeking and utility controls; verify interaction handlers and lint.
3. Update action rail and expandable caption/hashtags; run final type-check and lint.
4. Guard reel gestures from overlay interception, suppress transient loading copy, and present details in an animated bottom sheet.

Risk: custom seeking depends on measured bar width; ignore gestures until width and duration are valid and clamp all seek values.

# Live host UI

## Objective
Add a responsive creator flow beside the existing Live discovery and viewer screens. The flow covers setup, device check, countdown, host controls, in-place management, end confirmation, and summary. The viewer screen remains unchanged.

## Current boundary
The Live API supports creation, Agora broadcasting, realtime comments and viewer counts, and ending a session. Setup fields are persisted when the Live is created. In-session moderation and information editing remain local interface previews because matching write APIs are unavailable. Replay and detailed analytics are unavailable.

## Acceptance criteria
- The Live list opens `/live/host` from a prominent `Bắt đầu live` button.
- Setup validates a title of at most 100 characters and a category, accepts cover, privacy, comment and gift settings.
- Device check previews a permitted camera, reports camera/microphone permissions, and blocks the countdown while required permissions are missing.
- Countdown can be cancelled; completion opens the host interface without unmounting its camera when local panels change.
- On phones, countdown and Live share the same fullscreen camera surface; countdown uses a dim overlay, animated progress ring, safe-area badge/cancel action, and a short fade into Live.
- Host UI adapts to wide desktop, laptop/tablet landscape, tablet portrait, and phone widths. Video remains visually primary.
- Controls, chat, viewers, comments, management, edit settings, end confirmation, and summary work as local preview interactions. Unsupported backend actions are labelled as preview only.
- Ending requires confirmation. Summary numbers are clearly sample values, with no fake replay or download action.

## Implementation and verification
Expo Router + React Native components; local state; existing `expo-camera` and `expo-image-picker`. Run focused model tests, TypeScript, lint, and browser checks at representative widths. No backend or viewer changes.

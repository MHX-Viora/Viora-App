# New notification sound

User scope: all new notification types, including messages. Preserve dedicated
incoming-call ringtone and silent call lifecycle events. Reuse existing Expo,
Notifee, Firebase push and web notification services; add a bundled, original
short two-tone WAV without new packages.

Android: versioned general/messages channels because existing channel sound is
immutable. All local notifications select the general channel. FCM general pushes
use the same channel/resource. iOS uses the bundled WAV for general/chat pushes.
Web foreground uses the same clip, deduplicates across realtime/FCM, respects
read/muted/active-chat policies and handles blocked autoplay without errors.
Browser background notification audio remains controlled by the browser/OS.

Validation: focused payload/channel/player tests, WAV size/duration/PCM checks,
typecheck and lint. Native playback requires a rebuilt app, notification permission
and device sound settings. Do not claim real-device playback until tested.

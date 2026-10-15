# ANKT notification sound

Scope: all new general/chat alerts. Original two-note 0.9s mono PCM WAV is bundled
at assets/audio/ankt_notification.wav; scripts/generate-notification-sound.py
reproduces it without dependencies. Calls retain dedicated ring/lifecycle rules.

Android general channel: ankt_notifications_v2; chat: ankt_messages_v2. New IDs
are required because existing channel audio is immutable. Expo config packages
the WAV and sets defaultChannel. Local scheduled notifications ensure/select the
general channel; Notifee selects chat channel and resource ankt_notification.
BE Firebase general payload uses matching channel/resource; APNs general/chat
uses ankt_notification.wav. Android chat remains data-only to prevent duplicates;
call lifecycle remains silent; incoming calls retain existing handling.

Web foreground uses the same audio via Asset/HTMLAudioElement. Realtime and FCM
share event IDs for a bounded 30s dedupe window. Read events, muted chat and active
chat policies remain respected. Autoplay refusal is caught; visible alerts keep
working. Web background sound is controlled by browser/OS, not custom audio.

Validation: 6 focused Node tests passed using in-process isolation, 2 BE payload
tests passed; host TypeScript passed; targeted ESLint had zero errors and one
pre-existing unused import warning in push-notification.service.ts. WAV header,
sample rate, channels and size checked. Browser media check could not run because
Chrome MCP reported its profile already in use. Real Android/iOS playback and
background delivery have not been tested.

Rollout: build a new native app to bundle the WAV/create channels and deploy BE
payload changes. An OTA JS update alone cannot bundle native notification sounds.
No native build, deployment or commit performed. User/OS mute/permission/channel
settings continue to control whether alerts are audible.

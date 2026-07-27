# Plan: Rich chat notifications

1. Extend the chat push data contract with sender, conversation identity/type,
   message type, preview, and event time.
   Verify with backend contract tests.
2. Send Android chat pushes as high-priority data messages while retaining the
   standard notification payload for iOS and non-chat pushes.
3. Map private/group payloads into a tested Notifee MessagingStyle model with
   attachment-aware previews and display it from foreground/background handlers.
4. Run client and backend verification, then test a background message on a
   physical Android development build.

Risk: Android background execution can be delayed by battery restrictions.
Mitigation: keep the handler local and lightweight; do not fetch profile data.

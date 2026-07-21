# Plan: Chat push and resume synchronization

1. Add unread-summary API mapping and a single-flight chat synchronization service.
2. Invoke synchronization after session restore, app resume, realtime reconnect, and mark-read.
3. Refresh the conversation list on focus and keep the badge global.
4. Consolidate token acquisition on React Native Firebase and handle data-only background notifications.
5. Verify static checks and capture ADB evidence; document the backend dependency.

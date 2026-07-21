# Chat Screens Handoff

## Scope
- Added conversation list tab and chat room route.
- Conversation list calls `GET /api/chat/conversations?page=1&pageSize=20`, supports pull refresh, infinite load, 300ms keyword debounce, unread badges, pinned/muted icons, private/group display rules.
- Chat room calls `GET /api/chat/conversations/{conversationId}/messages?page=1&pageSize=30`, supports older-message pagination with inverted list, realtime append, new-message button, reply composer, attachment previews, media viewer, and send loading/error state.
- SignalR connects to `/hubs/realtime` with JWT access token from session store and automatic reconnect.
- Realtime chat handles `ReceiveMessage`, `ConversationUpdated`, `ConversationCreated`, `NewMessageNotification`, `ConversationRead`, `MessagesRead`, and `MessageDelivered`; other standardized events are registered as safe no-op listeners until their UI/API exists.
- On reconnect, chat screens receive a sync request: conversation list reloads page 1, active room reloads page 1.
- New message notifications outside the active room can schedule a foreground/local notification when `isMuted` is false.

## Files
- `features/chat/*`: screens, mappers, realtime event bridge, time formatter.
- `services/chat.service.ts`: chat API calls.
- `types/chat.ts`: frontend chat contracts.
- `app/(tabs)/chat.tsx`: conversation list tab.
- `app/chat/[conversationId].tsx`: chat room route.
- `services/realtime.service.ts`: emits chat message/conversation/read/notification/delivered events from SignalR.
- `services/chat-foreground-notification.service.ts`: local foreground notification for chat messages.

## Push and resume synchronization

- `index.js` registers the Firebase background handler before Expo Router.
- `services/firebase-background-messaging.ts` logs background delivery and creates a local notification only for data-only payloads; Android renders notification payloads itself.
- `services/chat-sync.service.ts` single-flights `GET /api/chat/unread-summary` and hydrates the global chat badge.
- Root lifecycle stops SignalR outside the active state, then reconnects and refreshes HTTP state on cold start/resume.
- The conversation list refreshes on focus; mark-read refreshes the global badge.
- Android Force stop remains an OS delivery boundary and is intentionally not worked around.
- `utils/chat-unread-count.ts`: tab badge unread count bridge.

## Assumptions
- Mark read endpoint is `POST /api/chat/conversations/{conversationId}/read`.
- Send message uses JSON body for `POST /api/chat/messages` with `conversationId`, `content`, `replyMessageId`, `messageType`, and attachment metadata.
- Backend page responses may use `items`, `data`, or `results`; mapper accepts these defensively.
- Attachments map from `fileUrl`, `fileName`, `mimeType`, `thumbnailUrl`, `duration`, and `fileSize`; media-only messages render from `attachments` + `messageType`.
- File picking uses `expo-document-picker`; audio recording/playback uses `expo-audio`.

## Verification
- `npm run lint`
- `npx tsc --noEmit`

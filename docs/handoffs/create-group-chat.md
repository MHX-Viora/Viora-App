# Create group chat handoff

## Delivered
- Shared route: `/chat/create-group` renders `CreateGroupScreen`.
- Entry points:
  - Private chat settings `Tạo nhóm` opens create group with the current private participant preselected and locked.
  - Conversation list header `Tạo phòng chat` opens create group with no preselected member.
- Friend picker calls `GET /api/friends/selectable?page=&pageSize=&keyword=`.
- Group creation calls `POST /api/chat/groups` as multipart form data with `name`, optional `avatar`, and repeated `memberIds[]`.
- Created conversation is emitted through `emitRealtimeConversation` and the app navigates directly to `/chat/[conversationId]`.

## Files
- `features/chat/create-group-screen.tsx`
- `app/chat/create-group.tsx`
- `services/friend.service.ts`
- `services/chat.service.ts`
- `types/chat-group.ts`
- Entry point edits in `features/chat/conversation-settings-screen.tsx` and `features/chat/conversations-screen.tsx`.

## Verify
- `npx tsc --noEmit`
- `npm run lint`

## Notes
- Current user id is filtered out before submitting `memberIds[]`; backend adds Owner.
- Locked default member cannot be removed from selected members.

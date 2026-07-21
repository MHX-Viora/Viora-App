# Spec: Group Preview

## Objective
Add a group preview screen opened from shared group links or QR codes so a signed-in user can review group identity, member count, and up to five preview members before joining or opening the chat.

## Tech Stack
Expo Router, React Native, TypeScript, existing `authenticatedFetch`, chat service/mapper/types, and theme tokens.

## Commands
- Type check: `npx tsc --noEmit`
- Lint: `npm run lint`
- Dev: `npm start`

## Project Structure
- `app/chat/group/[groupId].tsx`: deep link route for `viora://chat/group/{groupId}`.
- `app/chat/group-preview.tsx`: query route accepting `groupId` or `inviteCode`.
- `features/chat/group-preview-screen.tsx`: screen orchestration and UI.
- `services/chat.service.ts`: preview and join API functions.
- `features/chat/chat.mapper.ts`, `types/chat.ts`: API response contracts.

## Code Style
Use existing chat screen patterns: thin routes, feature-owned screen state, service-owned fetch/parse logic, StyleSheet with `colors` and `spacing`.

## Testing Strategy
Type checking verifies route params, service contracts, and UI state. Manual verification should cover loading skeleton, 404, retry, refresh, join success, approval-pending, and already-joined states.

## Boundaries
- Always: Use API data only, handle loading/refresh/error/empty, preserve existing chat navigation.
- Ask first: Add dependencies or change backend endpoint names.
- Never: Hardcode preview data in the component.

## Success Criteria
- Preview fetches `GET /api/chat/groups/preview/{groupIdOrInviteCode}` on mount and refresh.
- 404 shows `Nhóm không tồn tại hoặc đã bị giải tán.`
- Join calls the chat service, shows the correct toast, and navigates or disables the button.
- QR and shared deep links open preview first.

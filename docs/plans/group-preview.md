# Implementation Plan: Group Preview

## Overview
Build a vertical chat feature slice: route/link entry, typed service contract, feature screen UI, and QR navigation update.

## Tasks
- [x] Contract: add preview/member/join types and mapper.
  - Verify: TypeScript compiles.
  - Files: `types/chat.ts`, `features/chat/chat.mapper.ts`.
- [x] Service: add preview and join API calls.
  - Verify: errors preserve HTTP status for 404 handling.
  - Files: `services/chat.service.ts`.
- [x] UI: create `GroupPreviewScreen` with skeleton, refresh, error, empty, and bottom action.
  - Verify: state transitions are represented without fake data.
  - Files: `features/chat/group-preview-screen.tsx`.
- [x] Routing: add Expo routes and direct QR scans to preview.
  - Verify: routes accept path and query params.
  - Files: `app/chat/group/[groupId].tsx`, `app/chat/group-preview.tsx`, `app/_layout.tsx`, `features/chat/conversations-screen.tsx`.

## Risks
- Backend join response shape is not specified. Mapper accepts common variants: `conversationId`, `isPending`, `requiresApproval`, `status`, and HTTP `202`.

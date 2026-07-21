# Implementation Plan: Share Link System

## Tasks
- [x] Add frontend share-link DTO and API client.
- [x] Replace hardcoded post and reel share URLs with share-link service calls.
- [x] Replace group share deep link with backend share URL.
- [x] Update profile QR to use canonical user share URL from backend when available.
- [x] Update group preview API to support `inviteCode` query.
- [x] Verify with `npx tsc --noEmit` and `npm run lint`.

## Backend Follow-up
Implement the requested Clean Architecture backend feature in the backend repository: domain `InviteCode`, application share queries, infrastructure uniqueness/persistence, API endpoints, and validation.

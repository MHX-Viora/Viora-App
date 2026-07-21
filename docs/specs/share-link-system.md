# Spec: Share Link System

## Objective
Use backend-generated canonical share URLs for Viora content so links shared through chat apps, QR codes, email, or social networks can be routed by content type.

## Frontend Scope In This Repo
This workspace is the Expo frontend only. It contains no backend `.sln`, `.csproj`, migrations, domain/application/infrastructure/API projects, or database model files. Frontend work in this repo:
- Define typed share-link responses.
- Fetch share URLs from backend share APIs.
- Replace frontend hardcoded share URL construction.
- Accept canonical URL routes for user/post/reel/group where current screens exist.
- Keep current API behavior intact.

## Backend Contract
- `GET /api/users/{userId}/share`
- `GET /api/posts/{postId}/share`
- `GET /api/reels/{reelId}/share`
- `GET /api/chat/groups/{groupId}/share`
- `GET /api/chat/groups/preview?inviteCode={inviteCode}`

Backend owns:
- `https://viora.app/...` URL generation.
- Group `InviteCode` creation and uniqueness.
- Access validation and standard error responses.
- Clean Architecture layering and persistence.

## Frontend Boundaries
- Always: use returned `shareUrl`; do not build `https://viora.app` in screens.
- Always: preserve existing share UI/flow and error handling.
- Never: change the existing `POST /api/posts/{postId}/share` behavior.

## Success Criteria
- Post/reel/group/user QR sharing use backend-provided share URLs.
- Group preview supports invite-code query form.
- Typecheck and lint pass.

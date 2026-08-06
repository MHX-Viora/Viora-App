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
- Android verifies `api.mxh.ankt.vn` for every signing certificate used by an installed production/development build.
- Opening `/post/{id}` or `/reel/{id}` from another app routes directly to the matching Expo Router screen.
- Browsers that keep the URL inside a WebView receive an HTML fallback that can open `viora://post/{id}` or `viora://reel/{id}` instead of a 404 response.
- Tracking query parameters appended by Zalo do not alter the content identifier.
- Typecheck and lint pass.

## Android App-Link Incident
- Reproduction URL: `https://api.mxh.ankt.vn/post/cf6100f8-0b8a-472e-81f1-c793bcbe952e`.
- Device package: `com.ankt.app`.
- Installed certificate SHA-256: `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C`.
- Root cause: the deployed Digital Asset Links statement omitted this certificate, so Android domain verification failed; the backend then returned 404 for the browser fallback route.

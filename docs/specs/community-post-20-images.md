# Community posts: 20 images

## Scope and acceptance
- Reuse composer, PostCard, Cloudinary multipart upload and current colors/layout. Keep 50,000-character limit.
- Select/add/remove up to 20 images. Preview all with 8px gaps: odd count starts with a full-width image, remaining tiles form two columns; even counts form two columns. Header/footer stay fixed while body scrolls.
- Feed renders at most four previews. Three images use a full-width first tile. More than four uses a 2x2 grid and overlay `+(total - 3)` on tile four.
- Clicking any preview opens the full ordered gallery at that index; full images use contain on dark background. Counter, close, Web arrows/keyboard, mobile paging/pinch/pan, loading/error states.
- Preserve full URLs for viewer; use existing or Cloudinary-derived thumbnails in feed. Virtualize mobile viewer; mount Web active image only.
- Backend accepts 20/rejects 21 before upload. Failed image upload must not persist a partial post. Preserve order on create, feed/detail/profile reload; no schema migration if existing timestamps suffice.
- Raise only POST /api/feed request body cap to 100,000,000 bytes so twenty photos are not constrained by Kestrel's default ~30 MB cap. Report HTTP 413 clearly; hosted proxy limits remain a deployment check.

## Implementation plan
1. Add boundary/upload-order/failure tests and UI model tests before implementation.
2. Backend: raise validator/request limits and preserve distinct media timestamps during save. Frontend uses existing thumbnail URLs or Cloudinary-derived preview URLs. Test command below.
3. Frontend: shared image-selection/layout rules, composer/picker limit, four-tile gallery and reused viewer. Keep existing APIs; inspect existing update paths (none currently for community posts).
4. Verify: focused tests, ESLint, TypeScript, web build, real browser at desktop/mobile widths; record native/device and real Cloudinary limitations.

## Commands and conventions
- Backend: `dotnet test Viora.Application.Tests/Viora.Application.Tests.csproj --no-restore --filter "FullyQualifiedName~CreatePost" -m:1 -nr:false`.
- Frontend: `node --import tsx --test features/feed/post-images.test.ts`; `npx tsc --noEmit`; targeted `npx eslint`; `npm run build:web`.
- Use existing TypeScript/React Native styles and FluentValidation conventions; no new dependency, deployment or unrelated refactor.
- Tests live beside feed rules and in Viora.Application.Tests. Browser fixture uses real components without publishing posts.
- Sources: https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/gesture-composition/ and https://cloudinary.com/documentation/image_transformations.

# Community posts: twenty images

## Delivered
- App picker, composer and submission guard: maximum 20 images; all selected previews remain removable. Odd counts start full width, even counts use two columns, with 8px gaps. Body scrolls independently of header/footer.
- PostCard uses four previews maximum, including three-image first-wide layout. Tile four displays `+(total - 3)` only above four images. Viewer retains all original URLs and starts at the selected index.
- Web viewer: dark contain image, counter, bounded arrows, ArrowLeft/ArrowRight/Escape. Native: virtualized paged list, pinch 1–4x and bounded pan; pinch blocks the pager and zoom suspends paging. Loading/error handling reuses AdaptiveMediaImage.
- Preview delivery prefers API thumbnails; standard unsigned Cloudinary images use `c_limit,w_1000,h_1000,q_auto,f_auto`. Signed/local/other-host originals are preserved. Viewer loads originals; no thumbnail mutation of saved URLs.
- Backend validates 20 before upload. Failure reports the image position and creates no partial post. PostMedia.CreatedAt increments in PostgreSQL-sized microseconds; timestamp stamping preserves these values. Existing feed/detail/profile queries already order by CreatedAt. No migration.
- POST /api/feed now allows 100,000,000 bytes; client explains HTTP 413. Existing 50,000-character change remains. No community-post update endpoint exists in current source, so none was introduced.

## Files
Paths relative to `viora/`:
- `features/feed/post-images.ts`, `post-images.test.ts`, `feed-screen.tsx`: limits, selection, tile rules, preview URL and tests.
- `components/feed/create-post-modal.tsx`, `post-card.tsx`, `post-image-gallery.tsx`: previews and feed integration.
- `components/common/image-gallery-viewer.tsx`, `gallery-image.tsx`, `gallery-image.native.tsx`, `adaptive-media-image.tsx`: viewing, gestures, loading backgrounds.
- `services/feed.service.ts`, `types/feed.ts`: thumbnail mapping, selection/413 guard.
- `scripts/community-post-images-preview.tsx`, `preview-community-post-images.cjs`: real-component acceptance fixture; run `node scripts/preview-community-post-images.cjs` at `http://127.0.0.1:4178`. No API posting. `.gitignore` excludes its generated artifacts.
- `docs/specs/community-post-20-images.md`: scope, plan and commands.

Paths relative to `viora-BE/`:
- `Viora.Application/Posts/CreatePostValidator.cs`, `CreatePostCommandHandler.cs`: limit, upload failure, ordered media timestamps.
- `Viora.Infrastructure/Persistence/AppDbContext.cs`: preserve explicitly ordered media timestamps only for PostMedia.
- `viora-BE/Controllers/FeedController.cs`: scoped request body cap.
- `Viora.Application.Tests/CreatePostImagesTests.cs`: boundary, upload failure and persisted selection order cases.

## Verification
- Backend: 13 focused CreatePost tests, including the previous content boundary tests.
- Frontend: four model tests cover 1/2/3/4/5/6/10/16/19/20, >20 selection, deletion, overlays and Cloudinary/local/signed URLs. TypeScript passes. Targeted ESLint has zero errors, with three pre-existing warnings in feed-screen.tsx (BOM and hook dependencies).
- Browser: real PostCard/CreatePostModal at desktop and 390x844/320x640. Feed counts 1/2/3/4/5/10/16/20 produce expected tile geometry/overlays. Open fourth starts 4/20, arrows and keyboard reach 20/20, next disables at end, Escape restores feed. Composer renders 20, disables add, scrolls while controls stay visible; deleting image ten yields 19 with first-wide layout and preserves remaining order; adding fills back to twenty. No horizontal overflow at 320px.
- Expo export covers Web/Android/iOS JavaScript/Hermes bundles. This is not an installed device build.
- Browser network inspection on a fresh twenty-image feed fixture requested only images 1–4; the Web viewer mounted one full-size image at a time. Opening image one reported 1/20 with previous disabled.

## Practical limits / release follow-up

Single-image display correction: browser reproduced an outer tile stuck at 180px while its natural-sized image child was taller, clipping the foreground. The single tile now has an explicit shared frame: 460px desktop, min(460px, 60% viewport height) mobile, 340px for promoted single photos. Foreground uses contain inside that frame; existing blurred background fills the gaps. Overlay font is 24px. Browser verified all four borders on landscape, portrait and square fixtures, matching frame/image heights on desktop and 390px mobile, and unchanged 180px multi-image tiles with four-preview limit. TypeScript, targeted lint and web export pass. Native hardware verification remains pending.

- Actual Android/iOS swipe/pinch, native library picker, keyboard/safe-area behavior and memory on low-end devices still require hardware/emulator QA.
- No real Cloudinary upload, production API posting, PostgreSQL-backed HTTP round trip or deployment was performed. Persistence tests use SQLite; the PostgreSQL detail projection uses APPLY and cannot run under SQLite. Real-provider ordering remains release verification.
- Check hosted proxy/IIS body limits and timeouts for 100 MB and sequential uploads. Cloudinary plan limits/transform restrictions may be lower; existing upload errors remain explicit. Earlier successfully uploaded assets may remain in Cloudinary after a later upload fails; no partial post is saved.
- Legacy media with identical timestamps retain their existing ordering behavior; only newly created galleries receive distinct ordered timestamps.

## References
- Cloudinary transform syntax/preview delivery: https://cloudinary.com/documentation/image_transformations
- Native gesture coordination: https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/gesture-composition/
- Scoped ASP.NET request limits: https://learn.microsoft.com/aspnet/core/mvc/models/file-uploads

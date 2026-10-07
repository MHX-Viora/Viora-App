# In-session Live management removal

- Removed the host room's management toolbar button and `onOpenManagement` callback.
- Deleted `live-host-management.tsx`, including its information, comments, viewers, gifts, moderator, blocking, keywords, comment toggle, sharing, pinning, title and settings panels.
- Removed management state, keyword state and demo viewer data used exclusively by that panel.
- Updated host presentation preview callers for the reduced room interface.
- Camera, microphone, camera flip, session ending, comments and gifts retain their existing independent paths.
- Verification passed: `npx tsc --noEmit`, ESLint for the five changed TS/TSX files, and remaining-reference scan (no management component/callback/demo viewer references).
- Browser preview passed on desktop and at 390x844: no management button; mic/camera toggles and camera flip callbacks still work; no console errors. This uses the real host presentation component in demo mode, not a broadcast or physical-device media test.

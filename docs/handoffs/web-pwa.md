# Handoff: ANKT Web PWA

## 1. Previous state

Expo Web was an SPA with a favicon and a Firebase Messaging worker created by the incoming-call work. It had no Web App Manifest, install UI/state, standalone metadata, shell cache, offline indicator, or controlled update UX. Worker registration occurred only during Web Push registration after notification permission.

## 2. Files

Created:

- `public/index.html`, `public/manifest.webmanifest`, `public/pwa-icon-192.png`, `public/pwa-icon-512.png`
- `features/pwa/install-policy.ts`, `features/pwa/pwa-installation.test.mjs`
- `services/pwa.service.ts`, `services/pwa.service.web.ts`
- `components/pwa/pwa-install-action.tsx`, `components/pwa/pwa-status-host.tsx`
- `docs/specs/web-pwa.md`, `docs/plans/web-pwa.md`, `docs/handoffs/web-pwa.md`

Updated for PWA:

- `public/firebase-messaging-sw.js`
- `services/push-notification.service.web.ts`
- `services/web-platform-safety.test.mjs`
- `components/profile/profile-settings-sheet.tsx`
- `app/_layout.tsx`
- `scripts/test.mjs`, `scripts/web-deployment-config.test.mjs`
- `vercel.json`

No dependency or backend change was required.

## 3. Manifest

- Identity: `ANKT` / `ANKT`
- `id`, `start_url`, `scope`: `/`
- `display`: `standalone`; `orientation`: `any`
- Theme: `#24DDE4`; splash/background: `#000000`
- Official `assets/images/viora_logo.png` resized without redesign to exact 192x192 and 512x512 PNG files.
- No `maskable` declaration: the official artwork occupies the canvas too closely to guarantee the maskable safe zone without altering it.

## 4. Service Worker

There remains exactly one worker: `firebase-messaging-sw.js`. It now owns versioned shell/static caches and update messages in addition to the existing Firebase background incoming-call behavior. The existing single `notificationclick` listener, lifecycle cleanup, `IncomingCall` notification, route, and no-auto-accept behavior remain.

Firebase initialization is optional so installability/offline shell registration does not depend on notification permission or Firebase configuration. Push registration reuses the same registration and scope.

## 5. Install action

`Cài đặt ANKT` appears as a compact row in the existing `Cài đặt và hoạt động` profile sheet on Web only. It is hidden when unavailable, installed, or running standalone; no automatic install popup is shown.

## 6. `beforeinstallprompt`

The handler prevents the browser's automatic banner, retains the one-shot event, exposes the custom action, calls `prompt()` only on user press, awaits `userChoice`, and always clears the retained event. Installing state blocks repeated presses; dismissal hides the action until the browser emits a fresh event.

## 7. Installed/standalone detection

The runtime uses `(display-mode: standalone)` plus the legacy iOS `navigator.standalone` flag. `appinstalled` clears the prompt and switches local UI state to installed.

## 8. Platform behavior

- Chrome/Edge desktop and Android Chromium: custom action follows `beforeinstallprompt` when the browser declares the site installable.
- Installed launches use manifest standalone mode.
- iOS Safari: the action shows `Chia sẻ → Thêm vào Màn hình chính`; alternative iOS browsers and desktop Chrome do not receive this fallback.
- Physical Edge, Android, and iOS installation still require release-device manual QA; they were not available in this workspace.

## 9. PWA + Incoming Call

- Open PWA: unchanged SignalR event → existing incoming UI → existing accept/WebRTC path.
- Background/closed and Web Push available: the same Firebase worker shows the incoming-call notification.
- Click: close notification, navigate/focus an existing ANKT client when available, otherwise open `/incoming-call/{callId}`. It never auto-accepts.
- Worker fetch handling bypasses API/hub/realtime traffic, so it does not create a second Call path.

## 10. Realtime scope discipline

The PWA work did not edit CallHub/ChatHub, SignalR, WebRTC, ICE, SDP, reconnect, mapping, backend, API, or database logic. Existing dirty Call changes, including `services/realtime.service.ts` and call screens/services, were preserved rather than reset or rewritten.

## 11. Cache strategy

- Navigation: network first; cached `/` shell only as an offline fallback.
- Static: cache first only for same-origin `/_expo/static/`, `/assets/`, manifest, icons, favicon, and shell files.
- Never intercepted: non-GET, cross-origin, `/api/`, `/auth/`, login/refresh, hub/SignalR paths. Opaque and `no-store` responses are not cached.
- Every stored response is cloned before `cache.put`, preventing consumed-body errors.
- Offline UI says `Không có kết nối Internet`; network features are not faked.

## 12. Update strategy

Caches are versioned and obsolete `ankt-*` cache versions are removed on activation. A waiting worker shows `Có phiên bản ANKT mới`; user action sends `SKIP_WAITING`, then reloads after `controllerchange`. Voice, group-call, and incoming-call routes defer the reload. A race in which a call begins during activation keeps the update action available for a later user-triggered reload.

Vercel explicitly serves the worker with `no-cache, no-store, must-revalidate`; the manifest revalidates. SPA rewrite excludes manifest, worker, icons, favicon, Expo bundles, and assets.

## 13. Verification

- PWA policy/worker/manifest tests: 9 passed, including executable offline-shell and API-bypass simulation.
- Full suite: 236 passed after final changes.
- Typecheck: passed.
- Expo lint: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- Expo Web production export: passed; output contains linked manifest, worker, favicon, exact 192/512 icons, and hashed bundle paths.
- Chrome DevTools: root/JS/manifest/favicon/icon returned 200; manifest/theme metadata present; worker controlled the page; `beforeinstallprompt` was captured. Desktop production rendering was visually checked.
- DevTools offline reload timed out while the page waited on an external API request. The worker's offline navigation fallback was therefore verified deterministically in the executable worker test, not claimed as a successful DevTools reload.
- Local Chrome showed the existing production API rejecting localhost via CORS. This is an environment/origin result and was not addressed by changing production CORS.

## 14. Production deployment

1. Deploy the final Expo Web export and `vercel.json` on HTTPS.
2. Confirm the production domain serves `/manifest.webmanifest` and `/firebase-messaging-sw.js` directly with the configured cache headers and correct content types.
3. For non-Vercel hosting, configure SPA fallback (Nginx: `try_files $uri $uri/ /index.html;`) while exempting real static files.
4. Re-run install/uninstall on Chrome and Edge; Add to Home Screen on Android Chrome and iOS Safari.
5. On physical release devices, execute App→PWA, PWA→App, PWA→Web, Web→PWA and closed-PWA notification-click call matrices. No automated test can prove OS installation surfaces or background-delivery policy across those platforms.

References: Expo Router Web publishing/template documentation and MDN's PWA install prompt guidance were used for the SPA template and one-shot prompt lifecycle.

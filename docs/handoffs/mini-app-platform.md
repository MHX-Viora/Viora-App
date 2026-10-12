# ANKT Mini App FE handoff

MiniAppCatalog renders directly after Wallet in `features/utilities/utilities-screen.tsx`; no standalone discovery route/tab. Search/category and seven rails use bounded BE pages. Favorite order/history persist; detail, linked-app revocation and runtime are themed overlays.

Native uses react-native-webview incognito, disabled shared/third-party cookies/file/mixed-content and verified navigation. Web uses a sandbox iframe with exact source/origin/nonce checks and external website fallback. Runtime secret stays in authenticated host API requests. ANKT session invalidation closes runtime/bridge. Device cookie isolation and staging HTTPS SSO still require verification.

Developer Console uses `app/developers/*` and existing ANKT auth. Public docs retain 13 prerendered routes. `console/authorize` preserves bounded public OAuth metadata through login; BE verifies callbacks/scopes before consent/redirect. Secret is never stored in browser storage or bridge.

`EXPO_PUBLIC_API_URL` is internal API; `EXPO_PUBLIC_OPEN_API_ISSUER` is separate issuer hostname. They can share a backend/DB. Native rebuild required for expo-crypto/react-native-webview.

Verification: TypeScript, full Expo lint and scoped lint, 22 developer/OAuth tests and 2 bridge tests, web export/13 HTML pages; local browser with real BE/PostgreSQL for login, Console, Wallet/catalog, banner, paging, favorite order/detail. At mobile 320px: four 64px tiles, no document overflow. No production/native device execution. Multi-repo setup: `viora-BE/docs/mini-app-partner/PLATFORM-SETUP.md`.

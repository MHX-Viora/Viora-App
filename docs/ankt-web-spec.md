# Spec: ANKT Web from the existing Expo application

## Assumptions requiring approval

1. The existing Expo app in this repository is `viora`; the visible product name remains ANKT.
2. Existing Expo Router paths remain canonical: `/`, `/reels`, `/chat`, `/chat/:conversationId`, `/notification`, and `/profile`. We will not rename them only to match illustrative paths in the brief.
3. Native Android/iOS keeps the current bottom tab bar. Web below 1024px keeps the compact/mobile navigation; Web at 1024px and above uses the desktop header.
4. The hidden `utilities` tab remains hidden (`href: null`) and is not added to desktop navigation.
5. Browser push notifications and native call surfaces are not new scope. On Web, native-only registration/UI must fail safely; the existing notification feed and SignalR events remain available.
6. Google login on Web must use the same backend account flow, but needs an approved browser-compatible Firebase configuration/implementation.
7. Production origins and service URLs will be environment configuration, not hard-coded domains.

## Objective

Extend the existing Expo 54 / React Native application to production Web while preserving Android/iOS behavior, backend contracts, authentication flow, SignalR contracts, database schema, and all existing business actions. Desktop Web receives a centered, responsive shell with the five current visible tabs in a sticky header; existing screens and shared domain components remain the source of behavior.

## Current-state audit

### Application structure

- Navigation: Expo Router 6 with a root stack and five visible tabs (`index`, `reels`, `chat`, `notification`, `profile`). `utilities` exists but is intentionally hidden.
- Screens: feature folders contain feed, reels, conversations/chat, notifications, profile, auth, article, calls, legal, and supporting detail screens.
- Shared components: `PostCard`, `PostComposer`, `ReelCard`, `ConversationRow`, `NotificationItem`, `ProfileOverview`, `ProfileContent`, comments, media viewers, and themed primitives already exist and must be reused.
- API: domain services share `EXPO_PUBLIC_API_URL`; authenticated requests use Bearer tokens and `credentials: "include"` for the existing refresh-token cookie.
- Authentication: access token and user are stored by `session-store`; refresh token remains an HttpOnly backend cookie. Current Web session storage is memory-only and is lost on refresh.
- State: local React state dominates; theme uses Context + AsyncStorage; unread counts and realtime events use small subscription utilities. No Redux/Zustand migration is needed.
- SignalR: `@microsoft/signalr` connects to the existing `/hubs/realtime` endpoint with the existing access token and event names.
- Media: Expo Image Picker, Document Picker, Camera, Location, Audio, and Video are used. Uploads already flow through the current API services.
- Push/calls: Firebase Messaging, Notifee, Google Sign-In, LiveKit React Native, and React Native WebRTC are native-sensitive.
- Styling: ANKT theme tokens already provide dark navy, cyan, surfaces, text, borders, radii, and effects. Breakpoint and desktop layout tokens are missing.
- Deployment: Expo Web SPA output (`single`) and a Vercel direct-route rewrite are used together. Per-route SSG was rejected because client-only icon fonts and auth redirects produced hydration mismatches.

### Baseline verification (2026-08-24)

- `npm test`: passes 27/27 tests.
- `npx tsc --noEmit`: passes.
- `npx expo export --platform web`: fails during static rendering because `push-notification.service.ts` initializes React Native Firebase at module scope.
- Backend test attempt did not complete and spawned stuck test workers; the workers started by that attempt were stopped. Backend verification remains pending.
- Backend CORS currently allows the admin/local origins only and is not environment-driven for ANKT Web.

### Dependency compatibility

| Category | Dependencies/capabilities | Required treatment |
|---|---|---|
| Web-supported | Expo Router, React Native Web, SignalR JS, Expo Image, Document Picker, SVG, AsyncStorage | Reuse shared implementation and verify runtime behavior. |
| Partial/Web-specific behavior | Expo Image Picker, Camera, Location, Audio, Video, Notifications, Share, Safe Area, keyboard handling | Guard permissions/UI and add Web wrappers only where runtime behavior differs. |
| Native-only or currently unsafe on Web | React Native Firebase Messaging/Auth, Notifee, React Native Google Sign-In, LiveKit React Native, React Native WebRTC, SecureStore | Split `.native`/`.web` implementations or lazy platform adapters; never remove native packages. |

### Confirmed production blockers

- Module-scope Firebase Native initialization breaks Web static rendering.
- Web session persistence does not survive refresh. The Web adapter must use per-tab `sessionStorage`, not persistent `localStorage`, so refresh works without retaining the access token after the browser tab closes.
- Root layout imports native notification/call modules transitively during Web rendering.
- No shared responsive breakpoint/layout system exists.
- Feed/profile/chat bottom padding and fixed bars are mobile constants.
- Desktop header and chat master-detail layout do not exist.
- CORS origins are hard-coded and omit ANKT Web.
- Tracked backend configuration contains sensitive values. Values are intentionally omitted here; they must be rotated and moved to environment/secret storage before production.

## Tech stack

- Expo `~54.0.34`, Expo Router `~6.0.23`
- React 19.1, React Native 0.81, React Native Web 0.21
- TypeScript 5.9
- ASP.NET Core backend and existing PostgreSQL database
- Existing REST API, JWT/refresh cookie authentication, SignalR, and upload storage

## Commands

- Dev: `npm run web`
- Unit tests: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Production Web export: `npx expo export --platform web`
- Backend test: `dotnet test --no-restore --maxcpucount:1`
- Android regression build/run: `npm run android`

## Project structure

- `app/`: existing Expo Router routes; route contracts stay stable.
- `features/`: screen containers and current behavior.
- `components/`: reusable domain and layout components.
- `services/`: shared API/realtime services plus platform adapters.
- `stores/`: session persistence abstraction.
- `hooks/`: shared responsive hooks.
- `theme/`: existing tokens plus breakpoints/layout dimensions.
- `docs/`: specification, implementation plan, and final handoff.
- `../viora-BE/`: existing ASP.NET Core API; only CORS/configuration changes are in scope.

## Code style

Platform differences are isolated behind stable shared interfaces:

```ts
// services/platform-notifications.web.ts
export const registerPushNotifications = async () => null;

// services/platform-notifications.native.ts
export { registerPushNotifications } from "./push-notification.native";
```

Responsive screens reuse domain components instead of duplicating them:

```tsx
<ResponsiveContent maxWidth={layout.feedMaxWidth}>
  <PostCard post={post} {...existingActions} />
</ResponsiveContent>
```

Use existing theme tokens, `StyleSheet.create`, kebab-case file names, named components, and Expo Router conventions. Do not access `window`, `document`, `localStorage`, or `navigator` from shared/native code.

## Testing strategy

- TDD for breakpoint classification, layout calculations, platform adapters, and route/header mapping.
- Existing unit suite after each functional increment.
- Typecheck and lint at every checkpoint.
- Web export after platform-safety, navigation, and final increments.
- Browser runtime verification at 320, 768, 1024, and 1440px: console, keyboard/focus, direct URLs, refresh/back/forward, scrolling, and network/CORS.
- Auth integration: login, logout, persisted session, expired access token refresh, and same backend user.
- Feature regression: feed/post/media/actions; reels playback and single-active-video behavior; chat/realtime; notifications; profile; search and uploads.
- Android regression after platform splits. iOS verification is reported as unverified if no iOS build environment is available.

## Boundaries

- Always: reuse existing screens/components/services; preserve API/event contracts; keep mobile paths and behavior; use environment-driven URLs/origins; clean listeners and subscriptions; keep Web export/import safe.
- Ask first: add a new dependency; choose the production Web domain; provide Firebase Web App configuration; alter deployment provider; rotate/remove currently tracked secrets if external secret coordination is required.
- Never: change database schema or business rules; invent endpoints/data/actions; duplicate the app as a separate Web project; remove native dependencies/features; rename routes without a compatibility mapping; use `AllowAnyOrigin` with credentials; commit `.env` or generated Web output.

## Success criteria

- Android/iOS navigation and current business behavior remain unchanged.
- Web SPA export and `npx expo export --platform web` complete successfully without hydration errors.
- Desktop Web has one sticky ANKT header with exactly Home, Reels, Chat, Notifications, and Profile; active, hover, focus, tooltip, and unread states work.
- Feed is centered and bounded; Reels preserves 9:16 without multiple autoplay; Notifications and Profile use bounded desktop widths.
- Create Group and viewed-user Profile pages are centered and width-bounded on desktop Web while remaining full width on compact Web and native platforms.
- Desktop chat is master-detail with independently scrolling conversation and message panes; mobile chat retains list-to-detail navigation.
- Web session survives refresh and the existing refresh-cookie flow works with credentialed CORS.
- Native-only modules cannot crash Web import, SSR/static rendering, or unsupported interactions.
- Existing pagination/infinite scrolling and shared domain components remain in use.
- Direct URLs, browser refresh, back, and forward work for existing routes.
- No hard-coded localhost API/SignalR URL or production origin is introduced.
- Browser console has no application errors at supported breakpoints; test, typecheck, lint, Web export, and feasible mobile/backend checks pass.
- Production secrets are absent from tracked configuration and deployed through the platform's secret/environment facility.

## Open questions

1. What is the final Web origin (for example `https://ankt.vn`) and is Vercel the selected host?
2. May the implementation add the browser Firebase SDK/configuration required to preserve Google login on Web, or should Google login be temporarily hidden only on Web until configuration is supplied?
3. Should production secret rotation/removal from tracked backend configuration be included now? Deployment cannot be considered production-safe until it is resolved.

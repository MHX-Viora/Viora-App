# Developer Mini Apps — Stage 3

The integrated Expo Developer feature now implements real Mini App management at `/developers/console` and `/developers/console/apps/{appId}`. Creation stays in a dialog; detail navigation stays on the same FE origin. Uses the existing Developer session/BFF and real BE, never mock APIs.

Authoritative schema, API contract, changed-file list, local/E2E commands, key configuration, migration, verification and Stage 4 boundaries: [BE Stage 3 handoff](../../../viora-BE/docs/handoffs/developer-platform-stage-3.md).

FE changes: mini-apps.tsx (create dialog/list/upload), mini-app-detail.tsx (drafts/credentials/callbacks/activity), mini-app-client.ts, scoped mini-app.css, console route integration, allowlisted BFF/raw image support and pagination. The unused Stage 2 apps placeholder was replaced.

Security: owner authorization remains in BE; no secret in storage/SSR/URL/analytics. Integration unmounts on tab exit and route blur; hidden documents clear credentials. Expo stacked screens release Developer content when unfocused. Detail entry uses document navigation so native beforeunload correctly warns on browser Back/Forward/reload; clicked links and dirty sidebar creation use custom dialogs. This avoids the installed Expo linker's unsupported canceled-popstate rollback.

Verification: strict TypeScript, focused ESLint, production Expo export and 22 Developer tests passed. Real SMTP/BFF/BE/SQLite/Cloudinary E2E passed three times; its test assets and database were cleaned up. Chrome verified creation, persisted drafts/reload, validation failure retention, copy/rotation, draft warnings and 320/375px layout. Browser file-picker automation was blocked by DevTools workspace-root configuration; actual upload passed through HTTP E2E. Production deployment remains unverified and was not performed.

Keep server-only key/storage/BFF configuration outside EXPO_PUBLIC variables. Existing unrelated dirty ANKT code remains untouched. No Stage 4 runtime/review/SSO or production migration was enabled.

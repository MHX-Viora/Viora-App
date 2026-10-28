# Settings and notification cleanup

User request: remove the gift-effects toggle and Modern Dark option shown in the
screenshots; repair mark-all-read notifications. Keep Light and Ocean available.

1. Remove only the gift-effects control from profile settings.
2. Retire Modern Dark from selectable modes; saved modern preferences fall back
   to Light. Preserve the legacy palette used by older components.
3. Replace the nonfunctional React Native Web Alert confirmation using the
   existing cross-platform AuthAlert component. Prevent duplicate submissions,
   preserve state on API failure and reject stale list responses after success.
4. Verify focused notification interaction/transport and theme regression tests,
   TypeScript, lint and web build; record browser validation limitations.

Backend route/repository inspection confirms PUT /api/notifications/read-all
updates only the authenticated user's unread notifications. No DB change needed.

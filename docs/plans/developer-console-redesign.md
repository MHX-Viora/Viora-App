# Developer Console plan

1. Audit existing shell, provider/create dialog, account and detail/review routes.
2. Add route-selection tests; shared sidebar/layout/heading and design tokens.
3. Reshape existing API-backed dashboard/empty/cards and account identity.
4. Apply scoped styles to existing detail/forms/review/settings; retain handlers.
5. Test navigation, empty/populated/loading/error/dialogs/account at 1440/768/375;
   run developer tests/typecheck/lint/export, review diff and record limitations.

Do not commit docs/tests/logs per persistent preference; no commit requested.

Completed: redesign, 70/70 tests, tsc, targeted + full lint, Expo export and
desktop/tablet/mobile browser checks. Full file/evidence/limit report is in
../handoffs/developer-console-redesign.md. Real backend mutations remain untested.

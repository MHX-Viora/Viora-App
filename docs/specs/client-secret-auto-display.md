# Owner Client Secret auto-display

Display the selected environment's existing registered credential automatically
when its owner opens the integration section. Remove explicit reveal/masking and
the 60-second hiding timer. Keep copy and explicit retry after a failed request.
Do not hardcode credentials in source, public environment variables or SDK assets.

Keep the existing same-origin authenticated POST and backend owner checks. Clear
the value immediately on app/environment change, unmount and pagehide. Ignore
late responses and reload on bfcache restoration. Do not persist browser secrets.
Missing plaintext provisioning remains a backend configuration error, independent
of the display behavior; a hash cannot recover its original secret.

Plan: (1) update synthetic browser regression to require automatic display and
stale-response protection, (2) simplify the component, (3) verify browser test,
frontend typecheck/lint and document private backend configuration requirements.
Commands: `node features/developer/tests/client-secret.browser.mjs`,
`npx tsc --noEmit`; existing owner-credential backend/proxy tests.
No production changes, secret rotation, commits or new dependencies.

## User-directed exception: Nghệ Thuật Số direct FE values
The user subsequently explicitly requested directly assigned FE secrets instead
of fetching them. For the exact registered Nghệ Thuật Số App ID, use two public
Expo build values and never call the credential endpoint. Explain that these
values are readable from the distributed bundle. Keep actual assignments in the
ignored local .env, not source or example files. Other apps retain the owner API
flow and must never display this app's values. Verify both environments, copy,
zero credential requests and cross-app isolation with synthetic browser fixtures.

# Email verification page

Replace only the public verify-email page with a compact white/blue card matching
the Developer homepage (#0866ff, navy #071b49). Native SVG envelope, progress,
success, invalid/missing link and retryable error states; security note and resend.
Read the existing #token fragment once, remove it from history, auto-POST to the
existing verify endpoint once, including under React StrictMode. Keep token in
component memory, never logs/storage/query. Do not claim success before API OK.
Preserve existing backend token semantics, BFF boundary and shared auth form.

Verify with node:test for validation/request dedup/retry, existing developer tests,
esbuild UI fixture and actual browser desktop/mobile state checks. No real account
or verification token used for browser tests. No changes to unrelated dirty files.

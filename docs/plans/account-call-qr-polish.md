# Implementation plan

1. Add failing regression tests for public account-style rendering and Google display-name preservation.
2. Remove account-style badge rendering and correct Google identity/name mapping with minimal API changes.
3. Inspect the installed Play build and Android notification/full-screen settings; fix the call notification path and add configuration tests.
4. Add a shared local-image QR picker/decoder and connect it to profile and group scanners.
5. Run focused tests, typecheck, backend tests, and Android configuration verification; review the final diff.

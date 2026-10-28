# Owner-only Mini App Client Secret copy

Requested: let a developer copy the registered Client Secret beside their App ID.
Do not embed the secret pasted in chat in any repository file, JS bundle or SDK.

Existing credentials are operator-registered per app/environment and hash-verified.
Keep that authentication contract. Add optional server-secret-manager values
`MiniAppAuth:Partners:<label>:SandboxSecret` and `ProductionSecret`; reveal only if
the plaintext matches the existing corresponding hash. Hash-only registrations
continue authenticating, but cannot be revealed. No migration, generation, rotation
or change to partner auth is required to provide this requested UI.

POST owner `/api/developer/mini-apps/{appId}/auth-bridge/credentials/reveal`, body
`{environment: "Sandbox"|"Production"}`. Existing authenticated same-origin BFF
forwards it. Backend validates active/unlocked Developer session and app ownership,
uses sensitive-action rate limit, returns no-store credential DTO and records an
audit event containing only environment. Non-owner/social/revoked sessions fail.

UI beside Client ID: Production/Sandbox selector, masked field, explicit Reveal,
then Copy. No secret fetch on page load, no persistence or URL, no auto-copy of an
operator-shared literal. Clear on app/environment change, pagehide/unmount and after
60 seconds. An aborted/replaced request cannot repopulate stale credentials.

Plan: failing backend/BFF tests → owner service/API → UI → browser/TypeScript/docs.
Verify missing/mismatched config, ownership/session/environment isolation, audit
redaction, CSRF/BFF allowlist and UI lifecycle/clipboard. Update docs to describe
operator provisioning and the new owner-only reveal, not self-service generation.

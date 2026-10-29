# Profile advertisements

Show active campaign presentation on profile posts, video tiles and opened videos.
Preserve original content, ownership and live reaction counts. Paused, scheduled,
expired, cancelled and exhausted campaigns must not appear as advertisements.

Extend existing profile feed/detail DTOs with optional `advertisement` containing
only id, CTA, destination, headline, description and owner-preview flag. Resolve
campaigns in one batch per page; keep ordinary community delivery unchanged.
Use the existing PostCard, ReelCard and advertisement navigation. Owner previews
never generate paid events. No migration, dependencies or budget changes.

Implementation: backend projection and repository integration, frontend mapping
and CTA wiring, then focused repository/mapping tests and type/lint checks.
Commands: `dotnet test Viora.Application.Tests --filter FullyQualifiedName~ProfileAdvertisement`
from viora-BE; `node features/profile/profile-advertisements.test.mjs` and
`npx tsc --noEmit` from viora. Follow existing record DTO and component conventions.

# ANKT Developers public documentation

## Agreed scope
User explicitly chose public documentation only after Mini App/Developer services and tables were removed. Do not restore backend, SDK, tables or platform APIs. Protected registration/Console routes use existing ANKT auth and truthfully show unavailable. Documents teach the integration lifecycle and security concepts, label platform-specific actions as unavailable and never claim removed endpoints/packages are released.

## Implementation plan
1. Shared versioned content manifest for /developers, /developers/docs and 11 article routes. Add public/protected route policy and allowlisted auth return URL; test search accent folding, routing and HTML SEO before implementation.
2. Build one HTML renderer consumed by an Expo Web screen and post-export SSG script. Keep social app web.output=single; generate per-document HTML/assets within the same dist/domain. Semantic layout, theme, mobile drawer/TOC, anchors/copy and Vietnamese full-text static search. No new dependency or database.
3. Add account-menu and Utilities links, protected unavailable pages and login/profile return support. Public route guard bypasses auth even if session restore fails. Search and documents require no JWT or API requests.
4. Add canonical/title/description/OG/JSON-LD/breadcrumbs, sitemap (public docs only), robots (private exclusions), link/asset validation and build pipeline hook. Supply Nginx snippet for operator review without editing production or DNS.
5. Run focused Node tests, TypeScript/scoped lint, Expo export + generator validation and browser tests including direct URLs/refresh/search/anchors/copy/keyboard/themes/desktop/mobile/private redirect. Handoff includes deployment limits.

Commands: node --test features/developers/*.test.mjs; npx tsc --noEmit; npm run build:web; node scripts/build-developers-docs.mjs dist. Existing React Native/theme conventions remain. No commits/push/deploy unless requested. If public static pages cannot know auth state, any signed-in header enhancement must use existing auth code without sharing JWT with document/search assets; Console itself remains auth guarded.

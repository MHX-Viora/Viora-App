# Developer docs: shared header and palette

- Homepage and all 20 documentation pages use `DeveloperPublicHeader`; session-specific actions remain supplied by each host.
- Docs use the homepage blue/white palette, with search and API Reference in a separate toolbar. Saved/OS dark preferences no longer change docs colors.
- Shared CSS is imported by Expo screens and appended by the static docs builder. Keep both delivery paths consistent when editing the header.
- `data-hydrated` indicates client readiness; browser tests wait for it before interacting with prerendered pages.
- Verified: 14 docs tests, 63 Developer tests, TypeScript, focused ESLint, static export, anonymous docs browser checks and real-account Console/Docs round-trip.
- Browser coverage includes SDK/guide navigation, mobile header, keyboard focus, search, code copy, 320–1440px layouts, dark/light OS preferences and 200% text scaling.
- No deployment or commit performed for this change.

## All public Developer pages

- `Header` always renders `DeveloperPublicHeader`, including login/register, recovery, verification, contact, policies and Console. Session actions still reflect the current account.
- Shared header CSS overrides legacy mobile grid/padding rules, so logo placement and header height match documentation and homepage layouts.
- Both Expo and static docs 404 use `DocsNotFound` with the shared header; static errors hydrate menu/account controls normally.
- `npm run test:developer:header` checks identical anonymous header styles, navigation and actions across 30 routes at desktop/mobile widths, plus menu interaction. Requires Metro at `DOCS_EXPO_ORIGIN` or localhost:8081.
- Community routes are outside this shell.

## Shared footer

- `DeveloperPublicFooter` is the only Developer footer implementation, shared by the homepage, account/policy/Console pages, docs and docs errors. Links match the homepage: docs, SDK, guide, community, terms and contact.
- Docs render it after the full three-column layout. It spans the same container width as the homepage instead of being confined to the article column.
- `public-footer.css` loads in both Expo entry points and the static docs builder; explicit scoped styles prevent old footer grid rules from overriding the shared layout.
- The 30-route browser audit now compares footer styles, branding and links as well as headers. The Expo scrolling regression uses the shared footer as its end-of-page target.

## Expo scroll regression

- Expo locks body scrolling and constrains screen height. The docs root previously shrank to one viewport while content overflowed, exposing the outer black background and preventing wheel scrolling.
- `DocumentationScreen` now owns a bounded scroll container; its docs child grows naturally and paints the entire article white. Modal dialogs lock this container while open.
- TOC observes the Expo scroll container, falling back to window for standalone docs; header offset uses the shared public header.
- Run `npm run test:docs:expo` with Metro on port 8081 (override with `DOCS_EXPO_ORIGIN`). It checks actual wheel scrolling to the footer on all 20 routes at desktop/mobile widths, white backgrounds, sticky header and TOC tracking under dark OS preference. The test failed against the original layout before the fix.

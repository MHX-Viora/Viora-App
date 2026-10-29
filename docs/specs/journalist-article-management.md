# Journalist article access

Refresh the signed-in user's account style from the existing profile API on feed
and profile focus and feed pull-to-refresh. Preserve session tokens and never write
an old user's profile into a different session. Network failure retains cached
identity; publishing authorization remains enforced by the backend.

Show “Viết báo” for existing article-capable account styles. Add “Quản lý bài báo”
to the owner's profile and settings, linking to a permission-aware screen listing
only that user's articles, with pagination, read/edit/create and confirmed delete.
Use existing feed/article/post APIs and theme components, without dependencies.

Plan: regression-test permission refresh; wire focus refresh and entry points;
implement management and validate permission gates, owner filtering, navigation,
confirmation and error/empty states. Verify with targeted Node tests,
`npx tsc --noEmit`, targeted ESLint and a browser fixture.

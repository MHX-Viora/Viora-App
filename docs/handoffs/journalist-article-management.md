# Journalist article management

- Missing write button: feed read account style from the login session only on
  mount. Profile also used cached account style; no management entry existed.
- `refreshCurrentUser()` reads the current profile with no browser cache and
  updates cached account style/verification while preserving tokens and checking
  user identity after the request. Offline failures retain cached identity.
- Feed refreshes permission on navigation focus and pull-to-refresh. Profile
  refreshes on focus before loading article content. Existing account-style
  publishing rules are preserved; backend remains the authorization boundary.
- Article-capable users see “Viết báo”, a profile management card and a settings
  entry. `/article/manage` lists their articles with pagination, read/edit/create
  navigation and modal-confirmed deletion using existing APIs.
- Tests cover grants/revocations, offline and switched/signed-out sessions,
  ownership/type filtering, pagination, create/edit, confirmed delete, denied
  access, error retry and conditional write/manage entries.
- TypeScript and targeted tests passed. Targeted ESLint has no errors and three
  existing feed warnings. Chrome fixture passed at 320/375/768/1440px without
  horizontal overflow. Fixtures mock account/content APIs; no live account grant,
  publishing or deletion was performed.

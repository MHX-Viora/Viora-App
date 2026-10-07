# Notification fetch recovery

- Production probe on 2026-10-07: `/api/notifications?page=1&pageSize=20` returns OPTIONS 204 and unauthenticated GET 401, both without Access-Control-Allow-Origin for `https://mxh.ankt.vn`. Browser blocks the response and reports `Failed to fetch`; this is not evidence that the account has no notifications.
- Backend fix `bf0d5b11` already includes the exact app origin in CORS. Deploy that backend and ensure nginx forwards OPTIONS and retains CORS headers on actual responses, including 401/500. No production server changes were made here.
- FE translates fetch/network transport errors into Vietnamese, preserves server HTTP errors, and provides an accessible retry button on an empty failed list. Retry requests page 1 and uses existing loading state to disable the action; successful results replace the error.
- Notification list GET and read PUT paths already match the backend. No authentication bypass, cross-origin proxy workaround or schema changes.
- Regression: `node --test features/notifications/notification-fetch.test.mjs features/profile/profile-actions.test.mjs services/foreground-social-notification.test.mjs`; typecheck and lint.

## Production verification

```bash
curl -i -X OPTIONS 'https://api.tvphapluat.com.vn/api/notifications?page=1&pageSize=20' \
  -H 'Origin: https://mxh.ankt.vn' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization'
curl -i 'https://api.tvphapluat.com.vn/api/notifications?page=1&pageSize=20' \
  -H 'Origin: https://mxh.ankt.vn'
```

Expected: OPTIONS 204 with Allow-Origin=`https://mxh.ankt.vn`, Allow-Credentials=`true`, GET allowed and authorization allowed. Unauthenticated GET remains 401 with the same Allow-Origin/Allow-Credentials. Then verify the notification list with a signed-in account through the UI.

// Keep the rotated token in page memory; the HttpOnly cookie is used only when
// that token is unavailable (for example after a page reload).
export const refreshTokenTransportHeaders = {
  "X-ANKT-Refresh-Token": "body",
};

export const requestRefreshWithCookieFallback = async (
  send: (token: string | null) => Promise<Response>,
  storedToken: string | null,
): Promise<Response> => {
  // A rotated cookie may lag behind the token held by this page. Sending the
  // stale cookie first triggers the backend's reuse detection and revokes the
  // entire session before a retry with the current token can succeed.
  return send(storedToken);
};

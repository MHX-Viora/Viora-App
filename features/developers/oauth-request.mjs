const key = 'ankt.pending-oidc-transaction';
export function parseOAuthRequest(params) {
  if (params.response_type !== 'code' || typeof params.client_id !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(params.client_id) ||
      typeof params.redirect_uri !== 'string' || params.redirect_uri.length > 2048 || typeof params.state !== 'string' || params.state.length < 16 || params.state.length > 4096 ||
      typeof params.nonce !== 'string' || params.nonce.length > 256 || !/^[A-Za-z0-9._~+/-]{16,256}={0,2}$/.test(params.nonce) || params.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(params.code_challenge ?? '') ||
      typeof params.scope !== 'string') return null;
  const scopes = params.scope.split(' ');
  if (!scopes.includes('openid') || scopes.length > 4 || new Set(scopes).size !== scopes.length || scopes.some(scope => !['openid', 'profile', 'email', 'phone'].includes(scope))) return null;
  try { const callback = new URL(params.redirect_uri); if (callback.protocol !== 'https:' || callback.username || callback.password || callback.hash) return null; } catch { return null; }
  return { clientId: params.client_id, redirectUri: params.redirect_uri, state: params.state, nonce: params.nonce, codeChallenge: params.code_challenge, codeChallengeMethod: 'S256', scopes };
}
export function rememberOAuthRequest(params) {
  const request = parseOAuthRequest(params);
  if (!request || typeof window === 'undefined') return;
  try { window.sessionStorage.setItem(key, JSON.stringify({ request, expiresAt: Date.now() + 600000 })); } catch { /* UI reports a missing transaction if storage is blocked. */ }
}
export function readOAuthRequest() {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) ?? 'null');
    if (!value?.request || typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now() || value.expiresAt > Date.now() + 600000) return null;
    const r = value.request;
    return parseOAuthRequest({ response_type: 'code', client_id: r.clientId, redirect_uri: r.redirectUri, state: r.state, nonce: r.nonce, code_challenge: r.codeChallenge, code_challenge_method: r.codeChallengeMethod, scope: Array.isArray(r.scopes) ? r.scopes.join(' ') : null });
  } catch { return null; }
}
export function clearOAuthRequest() { if (typeof window !== 'undefined') try { window.sessionStorage.removeItem(key); } catch { /* Nothing persisted. */ } }

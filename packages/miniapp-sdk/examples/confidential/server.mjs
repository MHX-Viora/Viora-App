import {createServer} from 'node:https';
import {randomBytes} from 'node:crypto';
import * as oidc from 'openid-client';
import {settings, headers, html, escape, redirect} from '../common.mjs';
import {PrivateStore, cookie, readCookie} from './session.mjs';

const config = settings();
const secret = process.env.ANKT_CLIENT_SECRET;
if (!secret) throw new Error('Missing backend ANKT_CLIENT_SECRET');
// Never load a partner secret in the SPA or return it in a public config endpoint.
const issuerOrigin = new URL(config.issuer).origin;
const client = await oidc.discovery(new URL(config.issuer), config.clientId,
  {token_endpoint_auth_method: 'client_secret_basic', id_token_signed_response_alg: 'RS256'}, oidc.ClientSecretBasic(secret), {
    timeout: 10, execute: [oidc.enableNonRepudiationChecks],
    [oidc.customFetch]: (url, options) => {
      if (new URL(url).origin !== issuerOrigin) throw new Error('Unexpected issuer origin');
      return fetch(url, {...options, redirect: 'error', credentials: 'omit'});
    },
  });
const transactions = new PrivateStore(), sessions = new PrivateStore();
const loginCookie = '__Host-PartnerLogin', sessionCookie = '__Host-PartnerSession';
const token = () => randomBytes(32).toString('base64url');
const clearLogin = response => response.setHeader('Set-Cookie', cookie(loginCookie, '', 0));
async function body(request) {
  let value = ''; for await (const chunk of request) { value += chunk; if (value.length > 2048) throw new Error('Request too large'); }
  return new URLSearchParams(value);
}
createServer(config.tls, async (request, response) => {
  headers(response);
  const url = new URL(request.url, config.origin);
  const sessionKey = readCookie(request.headers.cookie, sessionCookie);
  const session = sessions.get(sessionKey);
  try {
    if (request.method === 'GET' && url.pathname === '/login') {
      transactions.remove(readCookie(request.headers.cookie, loginCookie));
      const verifier = oidc.randomPKCECodeVerifier(), state = oidc.randomState(), nonce = oidc.randomNonce();
      const key = transactions.put({verifier, state, nonce}, 300000);
      const authorization = oidc.buildAuthorizationUrl(client, {redirect_uri: config.redirectUri, scope: 'openid profile email', state, nonce,
        code_challenge_method: 'S256', code_challenge: await oidc.calculatePKCECodeChallenge(verifier)});
      response.setHeader('Set-Cookie', cookie(loginCookie, key, 300)); redirect(response, authorization.href);
    } else if (request.method === 'GET' && url.pathname === '/callback') {
      // Claim once before network exchange, retaining cancellation until completion.
      const loginKey = readCookie(request.headers.cookie, loginCookie);
      const transaction = transactions.claim(loginKey); clearLogin(response);
      if (!transaction) throw new Error('Invalid transaction');
      const tokens = await oidc.authorizationCodeGrant(client, url, {pkceCodeVerifier: transaction.verifier,
        expectedState: transaction.state, expectedNonce: transaction.nonce, idTokenExpected: true});
      const claims = tokens.claims();
      if (!claims?.sub || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 || tokens.expires_in > 300 || tokens.refresh_token) throw new Error('Invalid token lifetime');
      const user = await oidc.fetchUserInfo(client, tokens.access_token, claims.sub);
      if (transactions.take(loginKey) !== transaction) throw new Error('Login cancelled');
      sessions.remove(sessionKey);
      // Partner account key is (issuer, sub), never an email-based account merge.
      const key = sessions.put({issuer: claims.iss, sub: claims.sub, user, accessToken: tokens.access_token,
        tokenExpires: Date.now() + tokens.expires_in * 1000, csrf: token()}, 900000);
      response.setHeader('Set-Cookie', [cookie(loginCookie, '', 0), cookie(sessionCookie, key, 900)]);
      redirect(response, '/');
    } else if (request.method === 'GET' && url.pathname === '/me') {
      if (!session) throw new Error('Missing session');
      try {
        if (session.tokenExpires <= Date.now()) throw new Error('Expired session');
        session.user = await oidc.fetchUserInfo(client, session.accessToken, session.sub);
      }
      catch { sessions.remove(sessionKey); response.setHeader('Set-Cookie', cookie(sessionCookie, '', 0)); throw new Error('Grant unavailable'); }
      redirect(response, '/');
    } else if (request.method === 'POST' && url.pathname === '/logout') {
      const form = await body(request);
      if (!session || request.headers.origin !== config.origin || form.get('csrf') !== session.csrf) { html(response, '<h1>Forbidden</h1>', 403); return; }
      sessions.remove(sessionKey); transactions.remove(readCookie(request.headers.cookie, loginCookie));
      response.setHeader('Set-Cookie', [cookie(sessionCookie, '', 0), cookie(loginCookie, '', 0)]); redirect(response, '/');
    } else if (request.method === 'GET' && url.pathname === '/') {
      // Preserve Origin on the same-origin logout form. Callback responses retain
      // no-referrer so authorization codes cannot enter a subsequent Referer.
      response.setHeader('Referrer-Policy', 'same-origin');
      html(response, '<h1>Confidential backend</h1><p id="status">' + (session ? 'authenticated' : 'unauthenticated') + '</p>' +
        (session ? `<pre id="user">${escape(JSON.stringify({issuer: session.issuer, ...session.user}))}</pre><a href="/me">Revalidate UserInfo</a><form method="post" action="/logout"><input type="hidden" name="csrf" value="${session.csrf}"><button>Local logout</button></form>` : '<a href="/login">Login</a>') +
        '<p>Independent partner cookie. Tokens and secret remain server-side. The in-memory session store is for this example only.</p>');
    } else if (request.method === 'GET' && url.pathname === '/error') {
      html(response, '<h1>Request failed safely</h1><a href="/">Return to partner</a>', 400);
    } else { response.writeHead(404); response.end(); }
  } catch {
    if (url.pathname === '/callback') transactions.remove(readCookie(request.headers.cookie, loginCookie));
    // Never log callback URLs, authorization headers, library errors or token payloads.
    redirect(response, '/error');
  }
}).listen(config.port, config.host, () => console.log(`Confidential example: ${config.origin}`));

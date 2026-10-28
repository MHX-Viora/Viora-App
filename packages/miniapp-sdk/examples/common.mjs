import {readFileSync} from 'node:fs';

export function fixtureAncestors(input) {
  if (!input) return "'none'";
  try {
    const values=JSON.parse(input);
    if (!Array.isArray(values) || values.length !== 2 || new Set(values).size !== 2) throw new Error();
    for (const value of values) {
      const url=new URL(value);
      if (url.protocol !== 'https:' || value !== url.origin ||
        !(url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || ['127.0.0.1','127.0.0.2'].includes(url.hostname))) throw new Error();
    }
    return values.join(' ');
  } catch { throw new Error('Invalid fixture ancestor configuration'); }
}

export function settings() {
  const required = name => { const value = process.env[name]; if (!value) throw new Error(`Missing ${name}`); return value; };
  const origin = new URL(required('ANKT_PARTNER_ORIGIN'));
  const issuer = new URL(required('ANKT_ISSUER'));
  for (const url of [origin, issuer]) if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('HTTPS origin required');
  if (!['localhost', '127.0.0.1', '127.0.0.2'].includes(origin.hostname)) throw new Error('Example must bind loopback');
  return {origin: origin.origin, issuer: issuer.href, clientId: required('ANKT_CLIENT_ID'), redirectUri: origin.origin + '/callback',
    tls: {cert: readFileSync(required('ANKT_TLS_CERT')), key: readFileSync(required('ANKT_TLS_KEY'))}, port: Number(origin.port) || 443,
    host: origin.hostname === 'localhost' ? '127.0.0.1' : origin.hostname,
    frameAncestors: fixtureAncestors(process.env.ANKT_SANDBOX_FRAME_ANCESTORS)};
}
export function headers(response, script = "'none'", connect = "'self'", frameAncestors = "'none'") {
  response.setHeader('Cache-Control', 'no-store'); response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', `default-src 'none'; script-src ${script}; connect-src ${connect}; img-src data:; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors ${frameAncestors}`);
}
export const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
export function html(response, body, status = 200) {
  response.writeHead(status, {'Content-Type': 'text/html; charset=utf-8'});
  response.end(`<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><link rel=icon href="data:,"><title>ANKT partner example</title><main>${body}</main></html>`);
}
export function redirect(response, location) { response.writeHead(303, {Location: location}); response.end(); }

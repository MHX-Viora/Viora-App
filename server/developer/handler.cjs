const { proxyAccountRequest } = require('./account-proxy.cjs');
const { developerCookiePolicy } = require('./developer-cookie.cjs');
const { isDeveloperAccount } = require('./developer-types.cjs');
const { checkDeveloperHealth } = require('./health.cjs');
const { isIP } = require('node:net');
const { Buffer } = require('node:buffer');

function error(status, code, message) {
  return Response.json({ error: { code, message } }, { status });
}
function sessionCookie(value, name) {
  const matches = String(value || '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (matches.length !== 1) return undefined;
  const token = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
function cookie(name, token, options, expiry, clear = false) {
  return `${name}=${token}; Path=${options.path}; HttpOnly; SameSite=Lax${options.secure ? '; Secure' : ''}${clear ? '; Max-Age=0' : expiry ? `; Expires=${expiry.toUTCString()}` : ''}`;
}
async function bodyText(request, maximum = 16384, binary = false) {
  if (Number(request.headers['content-length']) > maximum) return null;
  if (request.body !== undefined) {
    const body = binary && Buffer.isBuffer(request.body) ? request.body : typeof request.body === 'string' ? request.body : Buffer.isBuffer(request.body) ? request.body.toString('utf8') : JSON.stringify(request.body);
    return Buffer.byteLength(body) > maximum ? null : body;
  }
  const chunks = []; let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length; if (length > maximum) return null;
    chunks.push(buffer);
  }
  return binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8') || '{}';
}
function routeFor(request) {
  const url = new URL(request.url, 'http://localhost');
  const query = new URLSearchParams(url.searchParams);
  if (url.pathname === '/developers/api/health') return { health: true };
  if (url.pathname.startsWith('/developers/api/account/')) return { path: url.pathname.slice('/developers/api/account/'.length), page: url.searchParams.get('page'), query };
  if (url.pathname === '/api/developer') {
    query.delete('path');query.delete('kind');
    return url.searchParams.get('kind') === 'health' ? { health: true } : { path: url.searchParams.get('path') || '', page: url.searchParams.get('page'), query };
  }
  return null;
}
function environmentConfig(request) {
  const production = process.env.NODE_ENV === 'production';
  let siteOrigin = process.env.DEVELOPER_SITE_ORIGIN || process.env.SITE_ORIGIN;
  if (!siteOrigin && !production) {
    const local = new URL(`http://${request.headers.host || 'localhost:8081'}`);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(local.hostname)) throw new Error('Explicit site origin required');
    siteOrigin = local.origin;
  }
  // Trust platform attribution only when actually deployed as a Vercel function.
  const peer = process.env.VERCEL === '1' ? request.headers['x-vercel-forwarded-for'] : request.socket.remoteAddress;
  const clientIp = typeof peer === 'string' ? peer.replace(/^::ffff:/, '') : undefined;
  return { siteOrigin, apiOrigin: process.env.ANKT_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL,
    production, bffSecret: process.env.ANKT_BFF_SHARED_SECRET, clientIp: clientIp && isIP(clientIp) ? clientIp : undefined };
}
function createDeveloperHandler(configuration = environmentConfig, fetcher = fetch) {
  return async function developerHandler(request, response) {
    let output;
    try {
      const config = typeof configuration === 'function' ? configuration(request) : configuration;
      const route = routeFor(request);
      if (!route) output = error(404, 'NOT_FOUND', 'Không tìm thấy API.');
      else if (route.health) {
        if (request.method !== 'GET') output = error(405, 'METHOD_NOT_ALLOWED', 'Phương thức không hợp lệ.');
        else { const health = await checkDeveloperHealth(config.apiOrigin, fetcher); output = Response.json(health, { status: health.ok ? 200 : 503 }); }
      } else {
        const policy = developerCookiePolicy(config.siteOrigin);
        const token = sessionCookie(request.headers.cookie, policy.name);
        const headers = new Headers();
        for (const name of ['origin', 'content-type', 'sec-fetch-site', 'x-ankt-developer', 'user-agent']) {
          const value = request.headers[name]; if (typeof value === 'string') headers.set(name, value);
        }
        if (config.clientIp) headers.set('X-ANKT-Client-IP', config.clientIp);
        const write = !['GET', 'HEAD'].includes(request.method);
        const logo = route.path === 'mini-apps/logo';
        const body = write ? await bodyText(request, logo ? 2097152 : route.path.includes('/sandbox/') ? 1024 : route.path.startsWith('mini-apps') ? 65536 : 16384, logo) : undefined;
        if (body === null) output = error(413, 'REQUEST_TOO_LARGE', 'Yêu cầu quá lớn.');
        else {
          const query = route.path.endsWith('/sandbox/diagnostics') || route.path.endsWith('/sandbox/test-runs') || route.path.endsWith('/sandbox/readiness') || /^review-notifications(?:\/|$)|\/(?:versions|reviews)(?:\/|$)|\/(?:review-readiness|publication-readiness|publications|publish|unpublish)$/.test(route.path) ? '?' + route.query.toString() : route.page ? '?page=' + encodeURIComponent(route.page) : '';
          const upstream = await proxyAccountRequest(new Request(`${config.siteOrigin}/developers/api/account/${route.path}${query}`, {
            method: request.method, headers, body,
          }), route.path, { ...config, token }, fetcher);
          let data = null;
          const attachment = upstream.ok && /^mini-apps\/app_[A-Za-z0-9_-]{43}\/domain-verification\/file$/.test(route.path);
          let download;
          if (attachment) {
            const disposition = upstream.headers.get('Content-Disposition') || '';
            const fileName = disposition.match(/filename="?(ankt-verify-[a-f0-9]{32}\.txt)"?(?:;|$)/i)?.[1];
            if (!fileName || upstream.headers.get('Content-Type')?.split(';')[0] !== 'text/plain') throw new Error('Invalid verification file');
            const reader = upstream.body?.getReader(); const chunks = []; let total = 0;
            if (!reader) throw new Error('Empty verification file');
            try {
              while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength;
                if (total > 4096) { await reader.cancel(); throw new Error('Verification file too large'); } chunks.push(Buffer.from(value)); }
            } finally { reader.releaseLock(); }
            download = { bytes: Buffer.concat(chunks), fileName };
          } else if (upstream.status !== 204) {
            try { data = await upstream.json(); }
            catch {
              if (upstream.ok) throw new Error('Invalid account response');
              data = { error: { code: upstream.status === 401 ? 'UNAUTHENTICATED' : upstream.status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED',
                message: upstream.status === 401 ? 'Phiên đã hết hạn. Vui lòng đăng nhập lại.' : upstream.status === 429 ? 'Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau.' : 'Yêu cầu chưa thực hiện được. Vui lòng thử lại.' } };
            }
          }
          let setCookie;
          if (upstream.ok && ['auth/login', 'auth/refresh'].includes(route.path)) {
            if (!isDeveloperAccount(data?.account) || typeof data.sessionToken !== 'string' ||
              (data.sessionToken && !/^[A-Za-z0-9_-]{43}$/.test(data.sessionToken)) || (!data.sessionToken && !token)) throw new Error('Invalid account response');
            const expiry = data.rememberMe ? new Date(data.absoluteExpiresAt || '') : undefined;
            if (expiry && !Number.isFinite(expiry.getTime())) throw new Error('Invalid session expiry');
            setCookie = cookie(policy.name, data.sessionToken || token, policy.options, expiry);
            data = data.account;
          }
          if ((upstream.ok && ['auth/logout', 'auth/logout-all', 'auth/change-password', 'auth/reset-password'].includes(route.path)) || upstream.status === 401)
            setCookie = cookie(policy.name, '', policy.options, undefined, true);
          output = download ? new Response(download.bytes, { status: 200, headers: {
            'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${download.fileName}"`,
          } }) : new Response(data === null ? null : JSON.stringify(data), { status: upstream.status });
          if (setCookie) output.headers.set('Set-Cookie', setCookie);
        }
      }
    } catch { output = error(503, 'SERVICE_UNAVAILABLE', 'Không thể kết nối dịch vụ tài khoản. Vui lòng thử lại.'); }
    response.statusCode = output.status;
    const disposition = output.headers.get('Content-Disposition');
    response.setHeader('Content-Type', disposition ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8');
    if (disposition) response.setHeader('Content-Disposition', disposition);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const setCookie = output.headers.get('Set-Cookie'); if (setCookie) response.setHeader('Set-Cookie', setCookie);
    response.end(Buffer.from(await output.arrayBuffer()));
  };
}
module.exports = { createDeveloperHandler, sessionCookie };

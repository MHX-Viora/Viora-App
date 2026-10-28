const { createServer } = require('node:http');
const { readFileSync, existsSync, statSync } = require('node:fs');
const { resolve, join, relative, extname } = require('node:path');
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
async function startDocsServer({ output, port = 0, apiHandler }) {
  const root = resolve(output), manifest = JSON.parse(readFileSync(join(root, 'docs-manifest.json'), 'utf8'));
  const server = createServer((request, response) => {
    response.setHeader('Content-Security-Policy', policy);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    let path;
    try { path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
    catch { response.writeHead(400); response.end(); return; }
    if (path.startsWith('/developers/api/account/')) {
      response.setHeader('Cache-Control', 'no-store');
      if (apiHandler) { void apiHandler(request, response); return; }
      response.writeHead(401, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Phiên Developer chưa đăng nhập.' } })); return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
    if (manifest.routes.includes(path.replace(/\/$/, '')) && path.endsWith('/')) {
      response.writeHead(308, { Location: path.slice(0, -1) }); response.end(); return;
    }
    const asset = /^\/developers\/(?:docs-assets\/[a-zA-Z0-9._-]+|brand\.png)$/.test(path) || /^\/(?:_expo|assets)\/[a-zA-Z0-9_./@-]+$/.test(path) || ['/robots.txt', '/developer-sitemap.xml', '/favicon.ico', '/manifest.webmanifest', '/firebase-messaging-sw.js', '/pwa-icon-192.png', '/pwa-icon-512.png'].includes(path);
    const portal = /^\/developers(?:\/(?!docs(?:\/|$)|docs-assets(?:\/|$))[a-zA-Z0-9_/-]+)?$/.test(path);
    const file = manifest.routes.includes(path) ? join(root, path, 'index.html') : asset ? join(root, path) : portal && existsSync(join(root, 'index.html')) ? join(root, 'index.html') : '';
    // Expo's existing portal needs its existing inline-style policy. Docs keep
    // the stricter external-style policy above; no deployed policy is changed.
    if (portal && !manifest.routes.includes(path)) response.setHeader('Content-Security-Policy', policy.replace("default-src 'none'", "default-src 'self'").replace("style-src 'self'", "style-src 'self' 'unsafe-inline'"));
    const bounded = file && relative(root, file);
    if (!bounded || bounded.startsWith('..') || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' });
      const notFound = join(root, 'developers/docs-404.html');
      response.end(existsSync(notFound) ? readFileSync(notFound) : '<!doctype html><html lang="vi"><meta name="robots" content="noindex"><title>Không tìm thấy tài liệu</title><h1>Không tìm thấy tài liệu</h1><a href="/developers/docs">Về tài liệu</a></html>'); return;
    }
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : readFileSync(file));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const deadline = setTimeout(() => server.close(), 600000); deadline.unref();
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => { clearTimeout(deadline); server.close(resolve); }) };
}
module.exports = { startDocsServer, policy };

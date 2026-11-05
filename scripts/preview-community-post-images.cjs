const { build } = require('esbuild');
const { createServer } = require('node:http');
const { mkdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve('.codex-tmp/community-post-images');
async function main() {
  mkdirSync(root, { recursive: true });
  await build({ entryPoints: ['scripts/community-post-images-preview.tsx'], outfile: path.join(root, 'preview.js'),
    bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
    alias: { 'react-native': 'react-native-web' },
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    loader: { '.js': 'jsx', '.ttf': 'file', '.png': 'file' },
    define: { global: 'globalThis', __DEV__: 'false', 'process.env.NODE_ENV': '"production"', 'process.env.EXPO_OS': '"web"', 'process.env.EXPO_PUBLIC_API_URL': '""' },
  });
  if (process.argv.includes('--build-only')) return;
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/fixtures/')) {
      const number = Number(url.pathname.match(/\d+/)?.[0] || 1);
      const [width, height] = number % 3 === 0 ? [500, 800] : number % 3 === 1 ? [800, 500] : [600, 600];
      response.setHeader('Content-Type', 'image/svg+xml');
      response.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="hsl(${number * 37},40%,35%)"/><rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="white" stroke-width="8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="100">${number}</text></svg>`);
      return;
    }
    if (url.pathname === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body,#root{height:100%;margin:0}#root{display:flex}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
      return;
    }
    const target = path.resolve(root, '.' + url.pathname);
    if (!target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    try {
      response.setHeader('Content-Type', target.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
      response.end(readFileSync(target));
    } catch { response.writeHead(404).end(); }
  });
  server.listen(4178, '127.0.0.1', () => process.stderr.write('Community post image preview: http://127.0.0.1:4178\n'));
}
main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });

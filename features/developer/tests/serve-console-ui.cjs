// Loopback fixture: never loads .env or contacts a real backend/account.
const { build } = require('esbuild');
const { createServer } = require('node:http');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../../..');
const port = Number(process.env.ANKT_CONSOLE_PREVIEW_PORT || 5494);
async function start() {
  const bundle = await build({ absWorkingDir: root, entryPoints: ['features/developer/tests/console-ui.fixture.jsx'], bundle: true, write: false,
    outfile: 'console.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'fixture-navigation', setup(builder) {
      builder.onResolve({ filter: /navigation\.web$/ }, () => ({ path: 'navigation', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'jsx', resolveDir: root, contents:
        `export default function Link({href,...props}){const path=href.startsWith('/developers')?href:'/developers'+(href==='/'?'':href);return <a {...props} href={path+(path.includes('?')?'':location.search)}/>;} export const usePathname=()=>location.pathname;export const useRouter=()=>({replace:path=>location.assign('/developers'+path),refresh:()=>{}});` }));
    } }] });
  const assets = new Map(bundle.outputFiles.map(file => [file.path.endsWith('.css') ? '/console.css' : '/console.js', file.contents]));
  createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('Cache-Control', 'no-store');
    if (assets.has(path)) { res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'application/javascript'); return res.end(assets.get(path)); }
    if (path === '/developers/brand.png') { res.setHeader('Content-Type', 'image/png'); return res.end(readFileSync(resolve(root, 'public/developers/brand.png'))); }
    if (path.startsWith('/developers/api/')) { res.writeHead(500); return res.end('Synthetic fixture must not contact a backend'); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/console.css"><title>Console UI fixture</title><style>body{margin:0}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/console.js"></script></body></html>');
  }).listen(port, '127.0.0.1', () => console.log(`Console synthetic preview: http://127.0.0.1:${port}/developers/console/apps (PID ${process.pid})`));
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });

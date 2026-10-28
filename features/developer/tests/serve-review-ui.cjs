// Isolated UI fixture. No backend connection or real account/credential.
const { build } = require('esbuild');
const { createServer } = require('node:http');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../../..');
const navigation = { name: 'fixture-navigation', setup(build) {
  build.onResolve({ filter: /navigation\.web$/ }, () => ({ path: 'navigation', namespace: 'fixture' }));
  build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'jsx', resolveDir: root, contents:
    `import React from 'react'; export default function Link({href,children,...props}){return <a {...props} href={href.startsWith('/developers')?href:'/developers'+href}>{children}</a>}; export const useRouter=()=>({replace:path=>location.assign(path),refresh:()=>{}}); export const usePathname=()=>location.pathname;` }));
} };
async function start() {
const bundle = await build({ absWorkingDir: root, entryPoints: ['features/developer/tests/review-ui.fixture.jsx'], bundle: true, write: false,
  outfile: 'review.js', jsx: 'automatic', plugins: [navigation], define: { 'process.env.NODE_ENV': JSON.stringify('development') } });
const assets = new Map(bundle.outputFiles.map(file => [file.path.endsWith('.css') ? '/review.css' : '/review.js', file.contents]));
createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname; res.setHeader('Cache-Control', 'no-store');
  if (assets.has(path)) { res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(assets.get(path)); return; }
  if (path !== '/' && !path.startsWith('/developers/')) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Stage 7 UI fixture</title><link rel="stylesheet" href="/review.css"><body style="margin:0"><div id="root"></div><script src="/review.js"></script></body></html>');
}).listen(5489, '127.0.0.1', () => console.log('Stage 7 UI-only fixture: http://127.0.0.1:5489/?tab=review'));
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });

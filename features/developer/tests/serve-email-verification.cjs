// Loopback synthetic preview. No .env or real account API is loaded.
const { build } = require('esbuild');
const { createServer } = require('node:http');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../../..');
const port = Number(process.env.ANKT_VERIFICATION_PREVIEW_PORT || 5492);
async function start() {
  const bundle = await build({ absWorkingDir: root, entryPoints: ['features/developer/tests/email-verification.fixture.jsx'], bundle: true,
    write: false, outfile: 'verification.js', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'fixture-navigation', setup(builder) {
      builder.onResolve({ filter: /navigation\.web$/ }, () => ({ path: 'navigation', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ loader: 'jsx', resolveDir: root,
        contents: "export default function Link({href,...props}){return <a {...props} href={'/developers'+(href==='/'?'':href)}/>;}" }));
    } }],
  });
  const assets = new Map(bundle.outputFiles.map(file => [file.path.endsWith('.css') ? '/verification.css' : '/verification.js', file.contents]));
  createServer((req, res) => {
    if (assets.has(req.url)) { res.setHeader('Content-Type', req.url.endsWith('.css') ? 'text/css' : 'application/javascript'); return res.end(assets.get(req.url)); }
    if (req.url.startsWith('/developers/api/')) { res.writeHead(500); return res.end('Fixture must not contact a backend.'); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/verification.css"><title>Verification UI fixture</title><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/verification.js"></script></body></html>');
  }).listen(port, '127.0.0.1', () => console.log(`Synthetic verification preview: http://127.0.0.1:${port}/developers/verify-email (PID ${process.pid})`));
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });

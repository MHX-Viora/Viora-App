// Loopback UI fixture. No real API, credentials, approvals or publications.
/* global __dirname */
const { build } = require('esbuild');
const { createServer } = require('node:http');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../../..');
async function start() {
  const fixture = resolve(__dirname, 'web-ui.fixture.jsx');
  const shims = { name: 'mini-app-ui-shims', setup(builder) {
    builder.onResolve({ filter: /^react-native$/ }, () => ({ path: require.resolve('react-native-web') }));
    builder.onResolve({ filter: /^(?:@\/theme|@react-navigation\/native|expo-router|@\/services\/mini-app.service|@expo\/vector-icons\/Ionicons)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    builder.onResolve({ filter: /^\.\/adapters\/host$/ }, () => ({ path: 'host', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'tsx', resolveDir: root, contents: {
      '@/theme': `export const spacing={sm:8,md:12,lg:16,xl:24}; export const useTheme=()=>({theme:{colors:{background:'#f7f8fa',text:'#111827',textMuted:'#4b5563',card:'#fff',primary:'#155ac0',primarySoft:'#eaf1fc',borderSubtle:'#d8dee8',secondaryBackground:'#eee'}}});`,
      '@react-navigation/native': `import {useEffect} from 'react'; export const useFocusEffect=callback=>useEffect(callback,[callback]);`,
      'expo-router': `import {fixture,navigate} from ${JSON.stringify(fixture)}; export const router={canGoBack:()=>true,back:()=>navigate(null),replace:()=>navigate(null),push:path=>{fixture.lastNavigation=path;navigate(null)}};`,
      '@expo/vector-icons/Ionicons': `import React from 'react'; export default function Icon({name,size,color}) {return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{name==='arrow-back'?<path d="M19 12H5m7-7-7 7 7 7"/>:<><path d="M4 14v-3a8 8 0 0 1 16 0v3m0 2v2a3 3 0 0 1-3 3h-3"/><rect x="2" y="11" width="4" height="7" rx="2"/><rect x="18" y="11" width="4" height="7" rx="2"/></>}</svg>};`,
      '@/services/mini-app.service': `export {miniAppCatalog} from ${JSON.stringify(fixture)};`,
      host: `export {FixtureHost as default} from ${JSON.stringify(fixture)};`,
    }[args.path] }));
  } };
  const bundle = await build({ absWorkingDir: root, entryPoints: [fixture], bundle: true, write: false,
    outfile: 'fixture.js', jsx: 'automatic', plugins: [shims], resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'], define: {
      'process.env.NODE_ENV': '"development"', 'process.env.EXPO_PUBLIC_MINI_APP_RUNTIME_ENABLED': '"true"',
    } });
  const assets = new Map(bundle.outputFiles.map(file => [file.path.endsWith('.css') ? '/fixture.css' : '/fixture.js', file.contents]));
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (request.headers.host !== '127.0.0.1:5498') { response.writeHead(404); response.end(); return; }
    const path = new URL(request.url, 'http://127.0.0.1:5498').pathname;
    if (assets.has(path)) { response.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'text/javascript'); response.end(assets.get(path)); return; }
    if (path !== '/') { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Stage 8 UI fixture</title><body style="margin:0"><div id="root" style="min-height:100vh;display:flex"></div><script src="/fixture.js"></script></body></html>');
  });
  const timeout = setTimeout(() => server.close(), 600000);
  server.on('close', () => clearTimeout(timeout));
  process.once('SIGINT', () => server.close()); process.once('SIGTERM', () => server.close());
  server.listen(5498, '127.0.0.1', () => console.log('UI-only fixture: http://127.0.0.1:5498/'));
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });

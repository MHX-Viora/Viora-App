import {createServer} from 'node:https';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {settings, headers, html} from '../common.mjs';

const config = settings();
const {outputFiles} = await build({entryPoints: [fileURLToPath(new URL('./main.ts', import.meta.url))], bundle: true, write: false, format: 'esm', target: 'es2022', platform: 'browser'});
createServer(config.tls, (request, response) => {
  headers(response, "'self'", `'self' ${new URL(config.issuer).origin}`);
  const path = new URL(request.url, config.origin).pathname;
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  if (path === '/config.json') {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({issuer: config.issuer, clientId: config.clientId, redirectUri: config.redirectUri, scope: 'openid profile email'}));
  } else if (path === '/app.js') {
    response.writeHead(200, {'Content-Type': 'text/javascript'}); response.end(outputFiles[0].contents);
  } else if (path === '/' || path === '/callback') {
    html(response, '<h1>Public SPA · PKCE</h1><p id="status" role="status">initializing</p><pre id="user"></pre><button id="login">Login</button> <button id="consent">Ask consent</button> <button id="user-info">UserInfo</button> <button id="reload">Reload</button> <button id="logout">Local logout</button><p>Tokens stay in SDK memory. Reload requires authorization again. Logout clears this partner only.</p><script type="module" src="/app.js"></script>');
  } else { response.writeHead(404); response.end(); }
}).listen(config.port, config.host, () => console.log(`Public example: ${config.origin}`));

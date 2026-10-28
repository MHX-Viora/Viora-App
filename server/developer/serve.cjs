const http = require('node:http');
const { createDeveloperHandler } = require('./handler.cjs');

function createDeveloperServer(configuration, fetcher) {
  const handler = createDeveloperHandler(configuration, fetcher);
  return http.createServer((request, response) => {
    void handler(request, response).catch(() => {
      if (response.headersSent) { response.destroy(); return; }
      response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Dịch vụ tài khoản chưa sẵn sàng.' } }));
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.DEVELOPER_BFF_PORT || 4319);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid DEVELOPER_BFF_PORT.');
  for (const [key, value] of [['DEVELOPER_SITE_ORIGIN', process.env.DEVELOPER_SITE_ORIGIN], ['ANKT_API_BASE_URL', process.env.ANKT_API_BASE_URL]]) {
    const url = value ? new URL(value) : null;
    if (!url || url.protocol !== 'https:' || url.origin !== value || url.username || url.password) throw new Error(`Set ${key} to an exact HTTPS origin.`);
  }
  if (!process.env.ANKT_BFF_SHARED_SECRET || process.env.ANKT_BFF_SHARED_SECRET.length < 32) throw new Error('Set ANKT_BFF_SHARED_SECRET to match the backend DeveloperAuth__BffSharedSecret.');
  const server = createDeveloperServer();
  server.listen(port, '127.0.0.1', () => console.log(`ANKT Developer BFF listening on 127.0.0.1:${port}`));
  const stop = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
}
module.exports = { createDeveloperServer };

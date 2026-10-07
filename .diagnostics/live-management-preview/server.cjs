const http = require('http');
const net = require('net');
const fs = require('fs');
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(__dirname + '/index.html')); return;
  }
  const proxy = http.request({ hostname: '127.0.0.1', port: 3000, path: req.url, method: req.method, headers: { ...req.headers, host: 'localhost:3000' } }, upstream => {
    res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res);
  });
  proxy.on('error', () => { res.statusCode = 502; res.end('Metro unavailable'); }); req.pipe(proxy);
});
server.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(3000, '127.0.0.1', () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);
    for (const [key,value] of Object.entries(req.headers)) upstream.write(`${key}: ${key === 'host' ? 'localhost:3000' : value}\r\n`);
    upstream.write('\r\n'); if(head.length) upstream.write(head); socket.pipe(upstream); upstream.pipe(socket);
  });
  upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy()); socket.on('close', () => upstream.destroy());
});
server.listen(8087, '127.0.0.1');

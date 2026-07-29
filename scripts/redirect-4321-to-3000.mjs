import http from 'node:http';

const server = http.createServer((req, res) => {
  const target = `http://${req.headers.host?.split(':')[0] || 'localhost'}:3000${req.url}`;
  res.writeHead(302, { Location: target });
  res.end();
});

server.listen(4321, '0.0.0.0', () => {
  console.log('🔄 Redirigiendo automáticamente puerto 4321 -> 3000');
});

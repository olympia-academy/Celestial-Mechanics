'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png'};
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch (_) { response.writeHead(400).end('Bad request'); return; }
  if (pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(root + path.sep)) { response.writeHead(403).end('Forbidden'); return; }
  fs.readFile(target, (error, content) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    response.end(content);
  });
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => {
  if (require.main === module) console.log('Himmelmekanikk: http://127.0.0.1:' + server.address().port);
});
module.exports = server;

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('.');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ttf': 'font/ttf', '.md': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const target = path.resolve(root, '.' + decodeURIComponent(url.pathname).replace(/\/$/, '/index.html'));
  if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.stat(target, (error, info) => {
    if (error || !info.isFile()) { res.writeHead(404).end('Arquivo não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(target).pipe(res);
  });
}).listen(port, '127.0.0.1', () => console.log(`HelpDesk Simulator: http://127.0.0.1:${port}`));

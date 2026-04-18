require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/' || urlPath === '/index.html') {
    try {
      let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      html = html
        .replace('__ANTHROPIC_KEY__', process.env.ANTHROPIC_API_KEY || '')
        .replace('__GOOGLE_CLIENT_ID__', process.env.GOOGLE_CLIENT_ID || '');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(500); res.end('Server error');
    }
    return;
  }

  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Vita running at http://localhost:${PORT}`);
});

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3000;
const DIR = __dirname;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // ─── API: Apply homepage data ───────────────────────────────
  if (urlPath === '/api/apply-homepage' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        // Validate JSON
        const data = JSON.parse(body);

        // 1. Save homepage-data.json
        const jsonPath = path.join(DIR, 'homepage-data.json');
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');

        // 2. Run generate-homepage.js to patch index.html
        const output = execSync('node generate-homepage.js', {
          cwd: DIR,
          encoding: 'utf-8',
          timeout: 10000
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ ok: true, output }));
        console.log('✅ Homepage applied via CMS');

      } catch (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ ok: false, error: err.message }));
        console.error('❌ Apply failed:', err.message);
      }
    });
    return;
  }

  // ─── API: Apply page-data.js ────────────────────────────────
  if (urlPath === '/api/apply-pages' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        // Save page-data.js
        const jsPath = path.join(DIR, 'page-data.js');
        fs.writeFileSync(jsPath, body, 'utf-8');

        // Run generate-pages.js
        const output = execSync('node generate-pages.js', {
          cwd: DIR,
          encoding: 'utf-8',
          timeout: 30000
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ ok: true, output }));
        console.log('✅ Sub-pages regenerated via CMS');

      } catch (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ ok: false, error: err.message }));
        console.error('❌ Page generation failed:', err.message);
      }
    });
    return;
  }

  // ─── CORS preflight for API ─────────────────────────────────
  if (req.method === 'OPTIONS' && urlPath.startsWith('/api/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // ─── Static file serving ────────────────────────────────────
  let filePath = path.join(DIR, urlPath === '/' ? 'index.html' : urlPath);
  let ext = path.extname(filePath);

  // Extensionless URL resolution: try directory/index.html, then .html
  if (!ext) {
    const tryIndex = path.join(filePath, 'index.html');
    const tryHtml = filePath + '.html';
    if (fs.existsSync(tryIndex)) {
      filePath = tryIndex;
      ext = '.html';
    } else if (fs.existsSync(tryHtml)) {
      filePath = tryHtml;
      ext = '.html';
    }
  }

  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

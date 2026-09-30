// United Flag Football League – dependency-free Node server.
// This version uses only Node's built-in modules so Replit can run it
// without needing npm install or an Express dependency.
const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_PASSWORD = 'UFF99234';
const MAX_BODY = 15 * 1024 * 1024;

const cache = new Map();
const TTL = 6 * 60 * 60 * 1000;
const fails = new Map();
const sheetCache = new Map();

const empty = () => ({ teams: {}, players: {}, games: [] });

function send(res, status, body = '', type = 'text/plain; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, ...headers });
  res.end(body);
}

function json(res, status, value) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function isAdmin(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const f = fails.get(ip) || { n: 0, t: 0 };
  if (now - f.t > 10 * 60 * 1000) f.n = 0;
  if (f.n >= 10) return false;

  const ok = req.headers['x-admin-password'] === ADMIN_PASSWORD;
  if (ok) fails.delete(ip);
  else fails.set(ip, { n: f.n + 1, t: now });
  return ok;
}

async function headshotUrl(name) {
  const key = String(name).toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.url;

  const u = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernames: [name], excludeBannedUsers: false })
  }).then(r => r.json());

  const id = u.data && u.data[0] && u.data[0].id;
  if (!id) return null;

  const t = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`
  ).then(r => r.json());

  const url = t.data && t.data[0] && t.data[0].imageUrl;
  if (url) cache.set(key, { url, at: Date.now() });
  return url || null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  })[ext] || 'application/octet-stream';
}

function safePublicFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded.replace(/^\/+/, '');
  const file = path.resolve(PUBLIC_DIR, relative || 'index.html');
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) return null;
  return file;
}

function serveStatic(req, res, pathname) {
  let file = safePublicFile(pathname);
  if (!file) return send(res, 403);

  if (!path.extname(file)) file = path.join(PUBLIC_DIR, 'index.html');

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not found');
    res.writeHead(200, {
      'Content-Type': mime(file),
      'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Roblox avatar proxy.
    if (req.method === 'GET' && pathname.startsWith('/api/avatar/')) {
      const name = decodeURIComponent(pathname.slice('/api/avatar/'.length));
      if (!name) return send(res, 404);
      const avatar = await headshotUrl(name);
      if (!avatar) return send(res, 404);
      const img = await fetch(avatar);
      if (!img.ok) return send(res, 502);
      res.writeHead(200, {
        'Content-Type': img.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=21600'
      });
      return res.end(Buffer.from(await img.arrayBuffer()));
    }

    // Public data API.
    if (req.method === 'GET' && pathname === '/api/data') {
      try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        return json(res, 200, data);
      } catch {
        return json(res, 200, empty());
      }
    }

    // Admin login.
    if (req.method === 'POST' && pathname === '/api/login') {
      return send(res, isAdmin(req) ? 200 : 401);
    }

    // Admin data save.
    if (req.method === 'PUT' && pathname === '/api/data') {
      if (!isAdmin(req)) return send(res, 401);
      const body = await readBody(req);
      let data;
      try { data = JSON.parse(body); } catch { return send(res, 400, 'Invalid JSON'); }
      if (!data || typeof data.teams !== 'object' || typeof data.players !== 'object' || !Array.isArray(data.games)) {
        return send(res, 400, 'Invalid data');
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      return send(res, 200);
    }

    // Google Sheets schedule proxy.
    if (req.method === 'GET' && pathname === '/api/sheet') {
      const id = url.searchParams.get('id');
      const name = url.searchParams.get('name');
      if (!/^[\w-]{10,}$/.test(id || '') || !name) return send(res, 400);
      const key = id + '|' + name;
      const hit = sheetCache.get(key);
      if (hit && Date.now() - hit.at < 60000) {
        return send(res, 200, hit.t, 'text/csv; charset=utf-8');
      }
      const r = await fetch(
        `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(name)}`
      );
      const t = await r.text();
      if (!r.ok || /^\s*</.test(t)) return send(res, 403);
      sheetCache.set(key, { t, at: Date.now() });
      return send(res, 200, t, 'text/csv; charset=utf-8');
    }

    // Static website.
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, pathname);
    return send(res, 405, 'Method not allowed');
  } catch (err) {
    console.error(err);
    return send(res, err.statusCode || 500, 'Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`United Flag Football League running on port ${PORT}`);
});

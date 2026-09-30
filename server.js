// United Flag Football League – dependency-free Node server.
// This version uses only Node's built-in modules so Replit can run it
// without needing npm install or an Express dependency.
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_PASSWORD = 'UFF99234';   // "Admin Key" login
// Username/password accounts. Passwords are stored as scrypt hashes (salt:hash), not plain text.
const ADMIN_USERS = {
  vbop: '5c7cc00f451c06eb67b29bfa7d8c1492:800510b74386f473674e72666288171ae00abebb744e91aecbd70ed158518a1aed143fba6dcda0770974e75ce4312f5314a59aa4ee779b560c82f263fb730106'
};
const STORE_FILE = path.join(__dirname, 'admin-store.json');
const readStore = () => { try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); } catch { return { admins: [], bans: [], activity: [] }; } };
const writeStore = s => fs.writeFileSync(STORE_FILE, JSON.stringify(s, null, 2));
const hashPw = pw => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); };
function checkUser(user, pass) {
  const name = String(user || '').toLowerCase();
  const extra = readStore().admins.find(a => a.username.toLowerCase() === name);
  const rec = ADMIN_USERS[name] || (extra && extra.hash);
  if (!rec || typeof pass !== 'string') return false;
  const [salt, hash] = rec.split(':');
  const got = crypto.scryptSync(pass, salt, 64);
  return crypto.timingSafeEqual(got, Buffer.from(hash, 'hex'));
}
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

  const user = req.headers['x-admin-user'];
  const pass = req.headers['x-admin-password'];
  const ok = user ? checkUser(decodeURIComponent(user), pass === undefined ? undefined : decodeURIComponent(pass)) : (pass === undefined ? undefined : decodeURIComponent(pass)) === ADMIN_PASSWORD;
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

    // Admin store: extra admin accounts, bans, activity log (never public).
    if (pathname === '/api/admin-store') {
      if (!isAdmin(req)) return send(res, 401);
      const st = readStore();
      if (req.method === 'GET') {
        return json(res, 200, { master: Object.keys(ADMIN_USERS), admins: st.admins.map(({ hash, ...a }) => a), bans: st.bans, activity: st.activity.slice(-200).reverse() });
      }
      if (req.method === 'POST') {
        let b; try { b = JSON.parse(await readBody(req)); } catch { return send(res, 400); }
        const who = decodeURIComponent(req.headers['x-admin-user'] || 'admin-key');
        const log = (action, detail) => st.activity.push({ action, detail, by: who, at: Date.now() });
        if (b.op === 'addAdmin') {
          const u = String(b.username || '').trim();
          if (!/^\w{3,24}$/.test(u) || String(b.password || '').length < 8) return send(res, 400, 'Username 3-24 chars, password 8+');
          if (ADMIN_USERS[u.toLowerCase()] || st.admins.some(a => a.username.toLowerCase() === u.toLowerCase())) return send(res, 409, 'Exists');
          st.admins.push({ username: u, role: b.role === 'Moderator' ? 'Moderator' : 'Admin', hash: hashPw(b.password), created: Date.now() });
          log('ADD_ADMIN', 'Added ' + u);
        } else if (b.op === 'delAdmin') {
          st.admins = st.admins.filter(a => a.username !== b.username); log('DELETE_ADMIN', 'Removed ' + b.username);
        } else if (b.op === 'addBan') {
          st.bans.push({ id: Date.now(), username: String(b.username || ''), type: b.type || 'Permanent Ban', reason: b.reason || '', notes: b.notes || '', at: Date.now() });
          log('BAN', b.username + ' (' + (b.type || 'Permanent Ban') + ')');
        } else if (b.op === 'delBan') {
          st.bans = st.bans.filter(x => x.id !== b.id); log('UNBAN', 'Removed ban ' + b.id);
        } else if (b.op === 'log') {
          log(String(b.action || 'NOTE').slice(0, 40), String(b.detail || '').slice(0, 300));
        } else return send(res, 400);
        writeStore(st); return send(res, 200);
      }
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

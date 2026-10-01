// United Flag Football League – dependency-free Node server.
// This version uses only Node's built-in modules so Replit can run it
// without needing npm install or an Express dependency.
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { URL } = require('url');
const LI = require('./legacy-import');
const DR = require('./discord-roles');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
// Where data lives. On hosts with a persistent disk (Render, etc.) set DATA_DIR to that disk's mount path so data survives deploys.
const DATA_DIR = process.env.DATA_DIR || __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const ADMIN_PASSWORD = 'UFF99234';   // "Admin Key" login
// Username/password accounts. Passwords are stored as scrypt hashes (salt:hash), not plain text.
const ADMIN_USERS = {
  vbop: '5c7cc00f451c06eb67b29bfa7d8c1492:800510b74386f473674e72666288171ae00abebb744e91aecbd70ed158518a1aed143fba6dcda0770974e75ce4312f5314a59aa4ee779b560c82f263fb730106'
};
const STORE_FILE = path.join(DATA_DIR, 'admin-store.json');
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


// ---- Legacy: reads a Google Sheet/Doc link, a Drive/direct .ods/.xlsx/.csv link, or an uploaded file; admin edits are layered on top ----
const LEG_DEFAULT_ID = process.env.LEGACY_SHEET_ID || '1CDjc8QZdCV2q7a_7utCO8XzNgGtg8bzpxNhvqGIr_y0';
const LEG_DEFAULT_URL = process.env.LEGACY_CSV_URL || `https://docs.google.com/spreadsheets/d/${LEG_DEFAULT_ID}/edit`;
const LEG_CACHE = path.join(DATA_DIR, 'legacy-cache.json'), LEG_EDITS = path.join(DATA_DIR, 'legacy-edits.json'), LEG_CFG = path.join(DATA_DIR, 'legacy-config.json');
const LEG_EVERY = 5 * 60 * 1000;
const LEG_COLS = [['ufb', 'UFB'], ['mvp', 'MVP'], ['pa', 'PA'], ['va', 'VA'], ['first', '1ST'], ['second', '2ND'], ['crowns', 'CROWNS'], ['titles', 'TITLES'], ['cc', 'CC'], ['fo', 'FO']];
const LEG_TIERS = [['HALL OF FAME', 1e9], ['ULTRA', 1600], ['LEGEND', 1200], ['SUPERSTAR', 850], ['SPECIALIST', 600], ['VETERAN', 400], ['ALLPRO', 250], ['PRO', 100], ['UNRANKED', -Infinity]];
const rj = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
// Writes never crash the server; an in-memory copy keeps Legacy working even if the disk is read-only.
const MEM = {};
const wj = (f, v) => { MEM[f] = v; try { fs.writeFileSync(f, JSON.stringify(v)); } catch (e) { console.error('Could not write ' + path.basename(f) + ': ' + e.message); } };
const rd = (f, d) => MEM[f] !== undefined ? MEM[f] : rj(f, d);

// ---- Transactions webhook (UFF Discord): the site posts each new transaction to a Discord channel. The URL is a secret, so it stays on the server and is never sent to visitors. ----
const WH_FILE = path.join(DATA_DIR, 'transactions-webhook.json');
const WH_RE = /^https:\/\/(?:(?:ptb|canary)\.)?(?:discord|discordapp)\.com\/api(?:\/v\d+)?\/webhooks\/\d+\/[\w-]+$/;
const whCfg = () => rd(WH_FILE, {});
const whStatus = () => { const c = whCfg(); return { set: !!c.url, hint: c.url ? 'discord.com/api/webhooks/' + c.url.split('/webhooks/')[1].split('/')[0] + '/••••' + c.url.slice(-4) : '', name: c.name || '', savedAt: c.savedAt || 0, lastAt: c.lastAt || 0, lastOk: c.lastOk !== false, lastError: c.lastError || '' }; };
const WH_COLORS = { signing: 0x2ecc71, release: 0xe74c3c, trade: 0xf2c14e, offer: 0x3498db, coaching: 0x9b59b6 };
async function whSend(payload) {
  const c = whCfg(); if (!c.url) throw new Error('No transactions webhook saved yet.');
  try {
    const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'UFF Transactions', ...payload }) });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error('Discord answered ' + r.status + (t ? ': ' + t.slice(0, 140) : '')); }
    wj(WH_FILE, { ...whCfg(), lastAt: Date.now(), lastOk: true, lastError: '' });
  } catch (e) { wj(WH_FILE, { ...whCfg(), lastAt: Date.now(), lastOk: false, lastError: String(e.message || e) }); throw e; }
}
const whEmbed = t => {
  const type = String(t.type || 'Transaction').slice(0, 40), key = Object.keys(WH_COLORS).find(k => type.toLowerCase().includes(k));
  const teams = [t.team, t.team2].filter(Boolean).join(' ↔ ');
  return { title: type.toUpperCase() + (teams ? ' · ' + String(teams).slice(0, 120) : ''), description: String(t.text || '').slice(0, 1800), color: WH_COLORS[key] || 0x95a5a6, footer: { text: 'United Flag Football League' }, timestamp: new Date(t.at || Date.now()).toISOString() };
};
const legCfg = () => rd(LEG_CFG, { type: 'default' });
const legCache = () => rd(LEG_CACHE, { at: 0, players: [], error: '' });
const legEdits = () => rd(LEG_EDITS, { set: {}, del: [], add: [] });
const legSource = () => { const c = legCfg(); return c.type === 'upload' ? { type: 'upload', label: 'Uploaded file: ' + (c.name || 'file'), url: '' } : c.type === 'url' ? { type: 'url', label: 'Link', url: c.url } : { type: 'default', label: 'Default Google Sheet', url: LEG_DEFAULT_URL }; };
let legBusy = null;
function syncLegacy() {
  if (legBusy) return legBusy;
  legBusy = (async () => {
    const cfg = legCfg();
    if (cfg.type === 'upload') return;                       // an uploaded file has nothing to refresh
    try {
      const players = await LI.loadUrl(cfg.type === 'url' ? cfg.url : LEG_DEFAULT_URL);
      wj(LEG_CACHE, { at: Date.now(), players, error: '' });
    } catch (e) {
      const c = legCache(); wj(LEG_CACHE, { ...c, error: String(e.message || e), tried: Date.now() });
    }
  })().catch(e => console.error('Legacy sync failed:', e)).finally(() => { legBusy = null; });
  return legBusy;
}
const legKey = n => String(n).toLowerCase();
function legacyView() {
  const c = legCache(), ed = legEdits(), src = legSource();
  let list = c.players.filter(p => !ed.del.includes(legKey(p.name))).map(p => ({ ...p, ...(ed.set[legKey(p.name)] || {}) }));
  list = list.concat((ed.add || []).filter(a => !list.some(p => legKey(p.name) === legKey(a.name))));
  list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  list.forEach((p, i) => { p.rank = i && list[i - 1].score === p.score ? list[i - 1].rank : i + 1; p.tier = p.hof ? 'HALL OF FAME' : (LEG_TIERS.find(([n, m], j) => j > 0 && p.score >= m) || LEG_TIERS[LEG_TIERS.length - 1])[0]; });
  return { at: c.at, error: c.error || '', cols: LEG_COLS.map(x => x[1]), tiers: LEG_TIERS.map(([n, m]) => ({ name: n, min: Number.isFinite(m) ? m : -1, players: list.filter(p => p.tier === n) })), edited: Object.keys(ed.set).length + ed.del.length + (ed.add || []).length, source: src, sheet: src.url || '' };
}
function legUse(cfg, players) {
  wj(LEG_CFG, cfg);
  wj(LEG_CACHE, { at: Date.now(), players, error: '' });
  wj(LEG_EDITS, { set: {}, del: [], add: [] });            // edits belonged to the old data
  dcSoon();
}
// Discord ranking roles: keeps each player's tier role on the Discord server in step with the Legacy table.
const DC = DR.create({ rd, wj, file: path.join(DATA_DIR, 'legacy-discord.json'), getView: () => legacyView() });
let dcTimer = null;
const dcSoon = () => { clearTimeout(dcTimer); dcTimer = setTimeout(() => DC.auto(), 4000); };
syncLegacy().then(() => DC.auto(true)); setInterval(() => syncLegacy().then(() => DC.auto()), LEG_EVERY).unref();

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

    // Discord ranking roles (admin only).
    if (pathname.startsWith('/api/discord')) {
      if (!isAdmin(req)) return send(res, 401);
      try {
        if (pathname === '/api/discord' && req.method === 'GET') return json(res, 200, DC.status());
        let b = {}; if (req.method !== 'GET') { try { b = JSON.parse((await readBody(req)) || '{}'); } catch { return json(res, 400, { error: 'Bad request' }); } }
        if (pathname === '/api/discord/sync' && req.method === 'POST') { const report = await DC.run(!!b.dry, b.ct); return json(res, 200, { report, status: DC.status() }); }
        if (pathname === '/api/discord/ct' && req.method === 'PUT') { DC.setCt(b.ct); dcSoon(); return json(res, 200, DC.status()); }
        if (pathname === '/api/discord/roles' && req.method === 'POST') {
          if (b.op === 'defaults') { const made = await DC.createDefaults(); return json(res, 200, { status: DC.status(), report: { at: Date.now(), dry: false, createdRoles: made, matched: 0, members: 0, changed: 0, wouldChange: 0, unmatched: [], problems: [], errors: [], stale: 0, preview: [], rolesOnly: true } }); }
          if (b.op === 'custom') { const r = await DC.createRole(b.name, b.color); return json(res, 200, { status: DC.status(), report: { at: Date.now(), dry: false, createdRoles: [r.name], matched: 0, members: 0, changed: 0, wouldChange: 0, unmatched: [], problems: [], errors: [], stale: 0, preview: [], rolesOnly: true } }); }
          return json(res, 400, { error: 'Bad request' });
        }
        if (pathname === '/api/discord/settings' && req.method === 'PUT') return json(res, 200, DC.settings(b));
        return json(res, 404, { error: 'Not found' });
      } catch (e) { return json(res, 400, { error: String(e.message || e) }); }
    }

    // Legacy (public read, admin source / edits / manual sync).
    if (pathname.startsWith('/api/legacy')) {
      try {
        if (pathname === '/api/legacy' && req.method === 'GET') {
          const c = legCache(), stale = Date.now() - (c.at || 0) > LEG_EVERY && legCfg().type !== 'upload';
          if (stale) {
            const p = syncLegacy();
            if (!c.players.length && Date.now() - (c.tried || 0) > 30000) await Promise.race([p, new Promise(r => setTimeout(r, 8000))]);
          }
          return json(res, 200, legacyView());
        }
        if (!isAdmin(req)) return send(res, 401);
        if (pathname === '/api/legacy/sync' && req.method === 'POST') { await syncLegacy(); return json(res, 200, legacyView()); }
        if (pathname === '/api/legacy/source' && req.method === 'PUT') {
          let b; try { b = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'Bad request' }); }
          const u = String(b.url || '').trim();
          if (!u) { wj(LEG_CFG, { type: 'default' }); wj(LEG_EDITS, { set: {}, del: [], add: [] }); await syncLegacy(); return json(res, 200, legacyView()); }
          let players; try { players = await LI.loadUrl(u); } catch (e) { return json(res, 400, { error: String(e.message || e) }); }
          legUse({ type: 'url', url: u, at: Date.now() }, players);
          return json(res, 200, legacyView());
        }
        if (pathname === '/api/legacy/upload' && req.method === 'POST') {
          let b; try { b = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'Upload too large or broken' }); }
          let players; try { players = LI.loadBuffer(Buffer.from(String(b.data || ''), 'base64')); } catch (e) { return json(res, 400, { error: String(e.message || e) }); }
          legUse({ type: 'upload', name: String(b.name || 'file').slice(0, 80), at: Date.now() }, players);
          return json(res, 200, legacyView());
        }
        if (pathname === '/api/legacy/edits') {
          if (req.method === 'DELETE') { wj(LEG_EDITS, { set: {}, del: [], add: [] }); dcSoon(); return json(res, 200, legacyView()); }
          if (req.method === 'PUT') {
            let b; try { b = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'Bad request' }); }
            const base = legCache().players, bm = new Map(base.map(p => [legKey(p.name), p])), ed = { set: {}, del: [], add: [] }, seen = new Set();
            for (const r of (b.rows || [])) {
              const name = String(r.name || '').trim().slice(0, 40); if (!name || seen.has(legKey(name))) continue; seen.add(legKey(name));
              const row = { name, score: Number(r.score) || 0, s: LEG_COLS.map((_, i) => Number((r.s || [])[i]) || 0), hof: !!r.hof }, o = bm.get(legKey(name));
              if (!o) ed.add.push(row); else if (o.score !== row.score || o.hof !== row.hof || o.s.some((v, i) => v !== row.s[i])) ed.set[legKey(name)] = row;
            }
            ed.del = base.filter(p => !seen.has(legKey(p.name))).map(p => legKey(p.name));
            wj(LEG_EDITS, ed); dcSoon(); return json(res, 200, legacyView());
          }
        }
        return json(res, 404, { error: 'Not found' });
      } catch (e) { console.error('Legacy route error:', e); return json(res, 500, { error: String(e.message || e) }); }
    }

    // Transactions webhook (admin only). GET status, PUT save/clear, POST /test, POST /send.
    if (pathname.startsWith('/api/transactions-webhook')) {
      if (!isAdmin(req)) return send(res, 401);
      try {
        if (req.method === 'GET') return json(res, 200, whStatus());
        let b = {}; try { b = JSON.parse((await readBody(req)) || '{}'); } catch { return json(res, 400, { error: 'Bad request' }); }
        if (pathname === '/api/transactions-webhook' && req.method === 'PUT') {
          const u = String(b.url || '').trim();
          if (!u) { wj(WH_FILE, {}); return json(res, 200, whStatus()); }
          if (!WH_RE.test(u)) return json(res, 400, { error: 'That is not a Discord webhook link. It should look like https://discord.com/api/webhooks/123456789/AbCd…' });
          let info; try { const r = await fetch(u); if (!r.ok) throw new Error(String(r.status)); info = await r.json(); } catch (e) { return json(res, 400, { error: 'Discord did not accept that webhook (' + String(e.message || e) + '). Check that it was not deleted.' }); }
          wj(WH_FILE, { url: u, name: String(info.name || '').slice(0, 80), savedAt: Date.now() });
          return json(res, 200, whStatus());
        }
        if (pathname === '/api/transactions-webhook/test' && req.method === 'POST') {
          await whSend({ embeds: [{ title: 'WEBHOOK CONNECTED', description: 'New league transactions from the UFF website will be posted here.', color: 0x2ecc71, footer: { text: 'United Flag Football League' }, timestamp: new Date().toISOString() }] });
          return json(res, 200, whStatus());
        }
        if (pathname === '/api/transactions-webhook/send' && req.method === 'POST') {
          const items = (Array.isArray(b.items) ? b.items : []).slice(0, 10);
          if (!items.length) return json(res, 400, { error: 'Nothing to send' });
          if (!whCfg().url) return json(res, 200, { ...whStatus(), skipped: true });
          await whSend({ embeds: items.map(whEmbed) });
          return json(res, 200, whStatus());
        }
        return json(res, 404, { error: 'Not found' });
      } catch (e) { return json(res, 502, { error: String(e.message || e), ...whStatus() }); }
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

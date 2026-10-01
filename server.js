// United Flag Football League – dependency-free Node server.
// This version uses only Node's built-in modules so Replit can run it
// without needing npm install or an Express dependency.
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { env } = require('cloudflare:workers');
const { rd, wj, initStorage, flushStorage } = require('./storage');
const LI = require('./legacy-import');
const DR = require('./discord-roles');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
// Durable state is stored in Cloudflare D1; DATA_DIR is no longer used for persistence.
const DATA_FILE = 'data.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'UFF99234';   // "Admin Key" login
// Username/password accounts. Passwords are stored as scrypt hashes (salt:hash), not plain text.
const ADMIN_USERS = {
  vbop: '5c7cc00f451c06eb67b29bfa7d8c1492:800510b74386f473674e72666288171ae00abebb744e91aecbd70ed158518a1aed143fba6dcda0770974e75ce4312f5314a59aa4ee779b560c82f263fb730106'
};
const STORE_FILE = 'admin-store.json';
const readStore = () => rd(STORE_FILE, { admins: [], bans: [], activity: [] });
const writeStore = s => wj(STORE_FILE, s);
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
const LEG_CACHE = 'legacy-cache.json', LEG_EDITS = 'legacy-edits.json', LEG_CFG = 'legacy-config.json';
const LEG_EVERY = 5 * 60 * 1000;
const LEG_COLS = [['ufb', 'UFB'], ['mvp', 'MVP'], ['pa', 'PA'], ['va', 'VA'], ['first', '1ST'], ['second', '2ND'], ['crowns', 'CROWNS'], ['titles', 'TITLES'], ['cc', 'CC'], ['fo', 'FO']];
const LEG_TIERS = [['HALL OF FAME', 1e9], ['ULTRA', 1600], ['LEGEND', 1200], ['SUPERSTAR', 850], ['SPECIALIST', 600], ['VETERAN', 400], ['ALLPRO', 250], ['PRO', 100], ['UNRANKED', -Infinity]];
// Persistent state is backed by Cloudflare D1 through storage.js.

// ---- Transactions webhook (UFF Discord): the site posts each new transaction to a Discord channel. The URL is a secret, so it stays on the server and is never sent to visitors. ----
const WH_FILE = 'transactions-webhook.json';
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

// ---- Transactions feed: reads EVERY message (people, bots, webhooks) from the Discord transactions channel with the same bot as the ranking roles.
// The channel is found from the saved webhook, or set by hand in Admin > Transactions (or DISCORD_TX_CHANNEL_ID). Needs the bot to see the channel
// (View Channel + Read Message History) and "Message Content Intent" turned ON in the Discord developer portal, or message text arrives empty. ----
const TXF_FILE = 'transactions-feed.json';
const TXF_EVERY = 2 * 60 * 1000, TXF_STALE = 45 * 1000, TXF_KEEP = 500;
const txf = () => ({ channelId: '', manualId: '', channelName: '', messages: [], at: 0, error: '', warn: '', ...rd(TXF_FILE, {}) });
const txfSave = v => wj(TXF_FILE, v);
const txfBot = () => process.env.DISCORD_BOT_TOKEN || '';
const txfChannel = () => {
  const env = String(process.env.DISCORD_TX_CHANNEL_ID || '').trim(); if (/^\d{5,25}$/.test(env)) return env;
  const f = txf(); if (/^\d{5,25}$/.test(f.manualId || '')) return f.manualId;
  const w = whCfg(); return /^\d{5,25}$/.test(w.channelId || '') ? w.channelId : '';
};
async function txfCall(pathq, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch('https://discord.com/api/v10' + pathq, { headers: { Authorization: 'Bot ' + txfBot(), 'User-Agent': 'UFF-transactions (1.0)' }, signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined });
    if (r.status === 429) { const j = await r.json().catch(() => ({})); await new Promise(ok => setTimeout(ok, Math.ceil(((j.retry_after || 1) + 0.2) * 1000))); continue; }
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch {}
    if (!r.ok) { const e = new Error((j && j.message) || ('Discord answered ' + r.status)); e.status = r.status; e.code = j && j.code; throw e; }
    return j;
  }
  throw new Error('Discord kept rate limiting the request');
}
// Turns Discord markup (<@id>, <#id>, <:emoji:id>, <t:unix>) into plain readable text.
function txfClean(text, m) {
  const users = {}; (m.mentions || []).forEach(u => { users[u.id] = u.global_name || u.username; });
  const roles = {}; (m.mention_roles || []).forEach(id => { roles[id] = 'role'; });
  return String(text || '')
    .replace(/<@!?(\d+)>/g, (_, id) => '@' + (users[id] || 'user'))
    .replace(/<@&(\d+)>/g, '@role')
    .replace(/<#(\d+)>/g, '#channel')
    .replace(/<a?:(\w+):\d+>/g, ':$1:')
    .replace(/<t:(-?\d+)(?::[a-zA-Z])?>/g, (_, n) => new Date(Number(n) * 1000).toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC');
}
function txfEmbed(e, m) {
  const o = {
    title: txfClean(e.title, m).slice(0, 300), description: txfClean(e.description, m).slice(0, 3500),
    color: typeof e.color === 'number' ? '#' + e.color.toString(16).padStart(6, '0') : '',
    fields: (e.fields || []).slice(0, 12).map(f => ({ name: txfClean(f.name, m).slice(0, 200), value: txfClean(f.value, m).slice(0, 800) })),
    footer: e.footer && e.footer.text ? String(e.footer.text).slice(0, 200) : '', url: e.url && /^https?:\/\//.test(e.url) ? e.url : '',
    image: (e.image && /^https?:\/\//.test(e.image.url || '')) ? e.image.url : ''
  };
  return (o.title || o.description || o.fields.length || o.image) ? o : null;
}
function txfNorm(m) {
  const a = m.author || {}, snaps = (m.message_snapshots || []).map(x => x.message).filter(Boolean);
  const src = [m, ...snaps];
  const embeds = src.flatMap(x => (x.embeds || []).map(e => txfEmbed(e, x)).filter(Boolean));
  const files = src.flatMap(x => (x.attachments || []).map(f => ({ name: String(f.filename || 'file').slice(0, 120), url: f.url, image: /^image\//.test(f.content_type || '') })));
  const content = src.map(x => txfClean(x.content, x)).filter(Boolean).join('\n').slice(0, 3800);
  return {
    id: m.id, at: m.timestamp, edited: m.edited_timestamp || '',
    author: { name: String(a.global_name || a.username || 'Unknown').slice(0, 80), bot: !!(a.bot || m.webhook_id), avatar: a.avatar ? `https://cdn.discordapp.com/avatars/${a.id}/${a.avatar}.png?size=64` : '' },
    content, embeds, files, forwarded: snaps.length > 0, reply: !!m.referenced_message && !snaps.length
  };
}
let txfBusy = null;
function syncTx(force) {
  if (txfBusy) return txfBusy;
  txfBusy = (async () => {
    const f0 = txf();
    if (!txfBot()) { txfSave({ ...f0, error: 'Set DISCORD_BOT_TOKEN so the site can read the Discord channel.', at: Date.now() }); return; }
    let ch = txfChannel();
    if (!ch) { // older saved webhooks do not have the channel stored yet: ask Discord which channel the webhook posts to
      const w = whCfg();
      if (w.url) { try { const r = await fetch(w.url); const j = r.ok ? await r.json() : null; if (j && j.channel_id) { wj(WH_FILE, { ...whCfg(), channelId: String(j.channel_id) }); ch = String(j.channel_id); } } catch {} }
    }
    if (!ch) { txfSave({ ...f0, error: 'No channel yet. Save the transactions webhook or type the channel ID in Admin > Transactions.', at: Date.now() }); return; }
    try {
      let name = f0.channelName; if (!name || f0.channelId !== ch) { try { const c = await txfCall('/channels/' + ch); name = c && c.name ? String(c.name) : ''; } catch {} }
      const first = !f0.messages.length || f0.channelId !== ch || force === 'full';
      let raw = [], before = '';
      for (let page = 0; page < (first ? 5 : 1); page++) {
        const part = await txfCall('/channels/' + ch + '/messages?limit=100' + (before ? '&before=' + before : ''));
        if (!Array.isArray(part) || !part.length) break;
        raw = raw.concat(part); before = part[part.length - 1].id; if (part.length < 100) break;
      }
      const hidden = raw.filter(m => m.author && !m.author.bot && !m.webhook_id && !m.content && !(m.embeds || []).length && !(m.attachments || []).length && !(m.message_snapshots || []).length && [0, 19].includes(m.type)).length;
      const SKIP = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);   // joins, pins, boosts, thread events...
      const fresh = raw.filter(m => !SKIP.has(m.type)).map(txfNorm).filter(m => m.content || m.embeds.length || m.files.length);
      let keep = first ? [] : f0.messages;
      if (!first && raw.length) { const oldest = raw[raw.length - 1].id; keep = keep.filter(m => BigInt(m.id) < BigInt(oldest)); }   // window just re-read: drop edited/deleted ones inside it
      const msgs = [...fresh, ...keep].filter((m, i, a) => a.findIndex(x => x.id === m.id) === i).sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1)).slice(0, TXF_KEEP);
      txfSave({ manualId: f0.manualId, channelId: ch, channelName: name, messages: msgs, at: Date.now(), error: '', warn: hidden ? hidden + ' recent message' + (hidden === 1 ? '' : 's') + ' came through with no text. Turn ON "Message Content Intent" for the bot (discord.com/developers > your app > Bot), then press Sync now.' : '' });
    } catch (e) {
      const why = e.status === 401 ? 'Discord rejected the bot token.' : (e.status === 403 || e.status === 404) ? 'The bot cannot see that channel. Invite it to the server and give it View Channel + Read Message History on the transactions channel.' : String(e.message || e);
      txfSave({ ...txf(), error: why, at: Date.now() });
    }
  })().finally(() => { txfBusy = null; });
  return txfBusy;
}
const txfPublic = () => { const f = txf(); return { on: !!(txfBot() && txfChannel()), channel: f.channelName || '', at: f.at || 0, messages: f.messages || [] }; };
const txfAdmin = () => { const f = txf(); return { bot: !!txfBot(), channelId: txfChannel(), manualId: f.manualId || '', fromWebhook: !f.manualId && !!whCfg().channelId, channelName: f.channelName || '', at: f.at || 0, count: (f.messages || []).length, error: f.error || '', warn: f.warn || '' }; };
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
const DC = DR.create({ rd, wj, file: 'legacy-discord.json', getView: () => legacyView() });
let dcTimer = null;
const dcSoon = () => {}; // Workers do not rely on background process timers; use the admin Sync action when needed.

const cache = new Map();
const TTL = 6 * 60 * 60 * 1000;
const fails = new Map();
const sheetCache = new Map();

const empty = () => ({ teams: {}, players: {}, games: [] });

async function send(res, status, body = '', type = 'text/plain; charset=utf-8', headers = {}) {
  await flushStorage();
  res.writeHead(status, { 'Content-Type': type, ...headers });
  res.end(body);
}

async function json(res, status, value) {
  return send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
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

async function serveStatic(req, res, pathname) {
  const base = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  let assetRes = await env.ASSETS.fetch(new Request(base.toString(), { method: req.method }));
  if (assetRes.status === 404 && req.method === 'GET' && !path.extname(pathname)) {
    const fallback = new URL('/index.html', base);
    assetRes = await env.ASSETS.fetch(new Request(fallback.toString(), { method: 'GET' }));
  }
  const headers = {};
  assetRes.headers.forEach((v, k) => { headers[k] = v; });
  res.writeHead(assetRes.status, headers);
  if (req.method === 'HEAD') return res.end();
  return res.end(Buffer.from(await assetRes.arrayBuffer()));
}

const server = http.createServer(async (req, res) => {
  try {
    await initStorage(env.DB);

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
      return json(res, 200, rd(DATA_FILE, empty()));
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
        if (pathname === '/api/discord/player-roles' && req.method === 'POST') return json(res, 200, await DC.playerRoles(b.names));
        if (pathname === '/api/discord/settings' && req.method === 'PUT') return json(res, 200, DC.settings(b));
        return json(res, 404, { error: 'Not found' });
      } catch (e) { return json(res, 400, { error: String(e.message || e) }); }
    }

    // Legacy (public read, admin source / edits / manual sync).
    // Past awards import (admin only): read a Google Sheet / Doc / Drive link or an uploaded .ods / .xlsx / .csv and return the awards table. Nothing is saved here.
    if (pathname === '/api/awards-import' && req.method === 'POST') {
      if (!isAdmin(req)) return send(res, 401);
      let b; try { b = JSON.parse((await readBody(req)) || '{}'); } catch { return json(res, 400, { error: 'Upload too large or broken' }); }
      try { return json(res, 200, b.data ? LI.loadAwardsBuffer(Buffer.from(String(b.data), 'base64')) : await LI.loadAwardsUrl(b.url)); }
      catch (e) { return json(res, 400, { error: String(e.message || e) }); }
    }
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

    // Transactions feed: public GET returns the messages read from the Discord channel; admin GET/PUT/POST manage it.
    if (pathname === '/api/transactions-feed' && req.method === 'GET') {
      const f = txf();
      if (txfBot() && txfChannel() && Date.now() - (f.at || 0) > TXF_STALE) { await Promise.race([syncTx(), new Promise(ok => setTimeout(ok, 8000))]).catch(() => {}); }
      return json(res, 200, txfPublic());
    }
    if (pathname === '/api/transactions-feed/admin') {
      if (!isAdmin(req)) return send(res, 401);
      try {
        if (req.method === 'PUT') {
          let b = {}; try { b = JSON.parse((await readBody(req)) || '{}'); } catch { return json(res, 400, { error: 'Bad request' }); }
          const id = String(b.channelId || '').trim();
          if (id && !/^\d{5,25}$/.test(id)) return json(res, 400, { error: 'A channel ID is only numbers. In Discord: Settings > Advanced > Developer Mode, then right-click the channel > Copy Channel ID.' });
          txfSave({ ...txf(), manualId: id, channelName: '', messages: [] });
        }
        if (req.method === 'PUT' || req.method === 'POST') await syncTx(req.method === 'POST' ? 'full' : true);
        return json(res, 200, txfAdmin());
      } catch (e) { return json(res, 502, { error: String(e.message || e), ...txfAdmin() }); }
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
          wj(WH_FILE, { url: u, name: String(info.name || '').slice(0, 80), channelId: String(info.channel_id || ''), savedAt: Date.now() });
          syncTx(true).catch(() => {});
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
      wj(DATA_FILE, data);
      await flushStorage();
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
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res, pathname);
    return send(res, 405, 'Method not allowed');
  } catch (err) {
    console.error(err);
    return send(res, err.statusCode || 500, 'Server error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`United Flag Football League running on port ${PORT}`);
});

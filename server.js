// United Flag Football League – serves the site, Roblox headshots, and the admin data API.
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const DATA_FILE = path.join(__dirname, 'data.json');
const ADMIN_PASSWORD = 'UFF99234'; // admin panel passcode, checked on the server for every admin request
app.set('trust proxy', true);

const cache = new Map();          // username -> { url, at }
const TTL = 6 * 60 * 60 * 1000;   // refresh headshots every 6 hours

async function headshotUrl(name) {
  const key = name.toLowerCase();
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

// Proxies the image so the browser only ever talks to your own site.
app.get('/api/avatar/:name', async (req, res) => {
  try {
    const url = await headshotUrl(req.params.name);
    if (!url) return res.sendStatus(404);
    const img = await fetch(url);
    res.set('Content-Type', img.headers.get('content-type') || 'image/png');
    res.set('Cache-Control', 'public, max-age=21600');
    res.send(Buffer.from(await img.arrayBuffer()));
  } catch (e) {
    res.sendStatus(502);
  }
});

// ---- admin data (teams, players, games) saved to data.json ----
// 10 wrong passcodes from one address locks admin for that address for 10 minutes
const fails = new Map();
function isAdmin(req) {
  const now = Date.now(), f = fails.get(req.ip) || { n: 0, t: 0 };
  if (now - f.t > 10 * 60 * 1000) { f.n = 0; }
  if (f.n >= 10) return false;
  const ok = req.get('x-admin-password') === ADMIN_PASSWORD;
  if (ok) fails.delete(req.ip); else fails.set(req.ip, { n: f.n + 1, t: now });
  return ok;
}
const empty = () => ({ teams: {}, players: {}, games: [] });

app.get('/api/data', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); }
  catch (e) { res.json(empty()); }
});
app.post('/api/login', (req, res) => res.sendStatus(isAdmin(req) ? 200 : 401));
app.put('/api/data', express.json({ limit: '15mb' }), (req, res) => {
  if (!isAdmin(req)) return res.sendStatus(401);
  const d = req.body;
  if (!d || typeof d.teams !== 'object' || typeof d.players !== 'object' || !Array.isArray(d.games)) return res.sendStatus(400);
  fs.writeFileSync(DATA_FILE, JSON.stringify(d));
  res.sendStatus(200);
});

// ---- Google Sheets schedule proxy (sheet must be shared as "anyone with the link can view") ----
const sheetCache = new Map();
app.get('/api/sheet', async (req, res) => {
  const { id, name } = req.query;
  if (!/^[\w-]{10,}$/.test(id || '') || !name) return res.sendStatus(400);
  const key = id + '|' + name, hit = sheetCache.get(key);
  if (hit && Date.now() - hit.at < 60000) return res.type('text/csv').send(hit.t);
  try {
    const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(name)}`);
    const t = await r.text();
    if (!r.ok || /^\s*</.test(t)) return res.sendStatus(403);
    sheetCache.set(key, { t, at: Date.now() });
    res.type('text/csv').send(t);
  } catch (e) { res.sendStatus(502); }
});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('United Flag Football League running'));

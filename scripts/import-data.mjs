// Copy the league data from the old (Render) site into the new Cloudflare site.
// Usage:
//   node scripts/import-data.mjs <old-site-url> <new-site-url> <admin-password>
// Example:
//   node scripts/import-data.mjs https://gridiron-rbx.onrender.com https://united-flag-football.YOURNAME.workers.dev YOUR_ADMIN_PASSWORD
// It downloads the old /api/data and saves it through the new site's admin API, which writes it into D1.
// (Pasting a big data.json straight into D1 with an SQL file can fail: D1 limits one SQL statement to 100 KB.)
import process from 'node:process';
import fs from 'node:fs/promises';

const [from, to, password] = process.argv.slice(2).map(x => String(x || '').trim());
if (!from || !to || !password) throw new Error('Usage: node scripts/import-data.mjs <old-site-url> <new-site-url> <admin-password>');
const strip = u => u.replace(/\/$/, '');

const r = await fetch(strip(from) + '/api/data', { headers: { accept: 'application/json' } });
if (!r.ok) throw new Error(`Old site returned HTTP ${r.status}`);
const data = await r.json();
if (!data || typeof data.teams !== 'object' || typeof data.players !== 'object' || !Array.isArray(data.games)) {
  throw new Error('That response does not look like UFF league data.');
}
await fs.mkdir('migrations', { recursive: true });
await fs.writeFile('migrations/render-data.json', JSON.stringify(data, null, 2)); // backup copy
const size = Buffer.byteLength(JSON.stringify(data));
console.log(`Downloaded ${Object.keys(data.teams).length} teams, ${Object.keys(data.players).length} players, ${data.games.length} games (${(size / 1024).toFixed(0)} KB). Backup: migrations/render-data.json`);
if (size > 1.9 * 1024 * 1024) console.warn('Warning: D1 stores at most 2 MB in one row. This data is close to or over that, so the save may fail. Remove very large team logos first.');

const put = await fetch(strip(to) + '/api/data', {
  method: 'PUT',
  headers: { 'content-type': 'application/json', 'x-admin-password': encodeURIComponent(password) },
  body: JSON.stringify(data)
});
if (!put.ok) throw new Error(`New site rejected the data: HTTP ${put.status} ${await put.text()}`);
console.log('Done. Open the new site and check the Teams, Players and Schedule pages.');

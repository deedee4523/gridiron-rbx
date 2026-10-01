// Export the current public league data from the Render site so it can be
// seeded into the new Cloudflare D1 app.
// Usage:
//   node scripts/export-render-data.mjs https://gridiron-rbx.onrender.com
// Then run the printed Wrangler command.
import fs from 'node:fs/promises';
import process from 'node:process';

const base = String(process.argv[2] || '').replace(/\/$/, '');
if (!base) throw new Error('Give the current Render URL, e.g. https://gridiron-rbx.onrender.com');
const r = await fetch(base + '/api/data', { headers: { accept: 'application/json' } });
if (!r.ok) throw new Error(`Render returned HTTP ${r.status}`);
const data = await r.json();
if (!data || typeof data.teams !== 'object' || typeof data.players !== 'object' || !Array.isArray(data.games)) {
  throw new Error('The Render /api/data response did not look like UFF league data.');
}
await fs.mkdir('migrations', { recursive: true });
await fs.writeFile('migrations/render-data.json', JSON.stringify(data, null, 2));
const value = JSON.stringify(data).replace(/'/g, "''");
const sql = `CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);\nINSERT INTO app_state (key, value) VALUES ('data.json', '${value}') ON CONFLICT(key) DO UPDATE SET value = excluded.value;\n`;
await fs.writeFile('migrations/render-data.sql', sql);
console.log('Saved migrations/render-data.json');
console.log('Now run: npx wrangler d1 execute united-flag-football --remote --file=migrations/render-data.sql');

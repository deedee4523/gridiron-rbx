// Durable state adapter for Cloudflare Workers + D1.
// The app still uses its old file-keyed rd()/wj() interface, but the values are
// stored in D1 so they survive Worker restarts and scale-out.
let db = null;
let loaded = false;
const state = new Map();
let queue = Promise.resolve();

const keyOf = file => String(file || '').replace(/\\/g, '/').split('/').pop() || String(file || 'state');
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

async function initStorage(database) {
  if (!database) throw new Error('Missing D1 binding. Create a D1 database and bind it as DB.');
  db = database;
  if (loaded) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)').run();
  const rows = await db.prepare('SELECT key, value FROM app_state').all();
  for (const row of rows.results || []) {
    try { state.set(row.key, JSON.parse(row.value)); } catch { /* ignore corrupt rows */ }
  }
  loaded = true;
}

function rd(file, fallback) {
  const key = keyOf(file);
  return state.has(key) ? clone(state.get(key)) : clone(fallback);
}

function wj(file, value) {
  const key = keyOf(file);
  const copy = clone(value);
  state.set(key, copy);
  if (!db) return;
  queue = queue.then(() => db.prepare(
    'INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind(key, JSON.stringify(copy)).run()).catch(err => console.error('D1 state write failed:', err));
}

async function flushStorage() {
  await queue;
}

module.exports = { initStorage, rd, wj, flushStorage };

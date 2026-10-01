// Durable state adapter for Cloudflare Workers + D1.
// The app still uses its old file-keyed rd()/wj() interface, but the values are
// stored in D1 so they survive Worker restarts and scale-out.
// Cloudflare may run several copies (isolates) of the Worker at once, so the in-memory
// copy is re-read from D1 every few seconds. Otherwise a visitor could keep seeing old
// data after the admin saves.
const REFRESH_MS = 5000;
let db = null;
let loadedAt = 0;
let writeSeq = 0;
const state = new Map();
let queue = Promise.resolve();

const keyOf = file => String(file || '').replace(/\\/g, '/').split('/').pop() || String(file || 'state');
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

async function initStorage(database) {
  if (!database) throw new Error('Missing D1 binding. Create a D1 database and bind it as DB.');
  db = database;
  if (loadedAt && Date.now() - loadedAt < REFRESH_MS) return;
  if (!loadedAt) await db.prepare('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)').run();
  await queue; // let this copy's own pending writes reach D1 first
  const seq = writeSeq;
  const rows = await db.prepare('SELECT key, value FROM app_state').all();
  if (seq !== writeSeq && loadedAt) return; // something was saved while reading: keep the newer local copy
  const seen = new Set();
  for (const row of rows.results || []) {
    try { state.set(row.key, JSON.parse(row.value)); seen.add(row.key); } catch { /* ignore corrupt rows */ }
  }
  for (const k of [...state.keys()]) if (!seen.has(k)) state.delete(k);
  loadedAt = Date.now();
}

function rd(file, fallback) {
  const key = keyOf(file);
  return state.has(key) ? clone(state.get(key)) : clone(fallback);
}

function wj(file, value) {
  const key = keyOf(file);
  const copy = clone(value);
  state.set(key, copy);
  writeSeq++;
  if (!db) return;
  queue = queue.then(() => db.prepare(
    'INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind(key, JSON.stringify(copy)).run()).catch(err => console.error('D1 state write failed:', err));
}

async function flushStorage() {
  await queue;
}

module.exports = { initStorage, rd, wj, flushStorage };

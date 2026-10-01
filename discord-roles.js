// Discord ranking roles for Legacy (dependency-free, uses Discord's REST API through fetch).
// Every legacy tier (Hall of Fame ... Pro) is a role. Each player on the Legacy sheet who can be matched to a
// member of the Discord server gets the role of their tier, and loses the other tier roles. Nothing else is touched.
//
// Setup (once): create a bot in the Discord developer portal, turn ON "Server Members Intent", invite it with the
// "Manage Roles" permission, put its role ABOVE the rank roles, then set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID
// as environment variables (Replit: Secrets). The token is never stored in a file and never sent to the browser.
const API = 'https://discord.com/api/v10';
const TIERS = [
  ['HALL OF FAME', 'Hall of Fame', 0xffec20], ['ULTRA', 'Ultra', 0x22c55e], ['LEGEND', 'Legend', 0xfacc15],
  ['SUPERSTAR', 'Superstar', 0xa855f7], ['SPECIALIST', 'Specialist', 0xf97316], ['VETERAN', 'Veteran', 0x7ae2ff],
  ['ALLPRO', 'AllPro', 0xfba2f9], ['PRO', 'Pro', 0x110a0a]
];
const EXTRA = [['CROWN', 'Crown', 0xf2b632], ['TITLE', 'Title', 0x5db3b5]];   // given to whoever holds a crown / a title
const sleep = ms => new Promise(r => setTimeout(r, ms));
const low = s => String(s == null ? '' : s).trim().toLowerCase();

function create({ rd, wj, file, getView, fetchFn }) {
  const doFetch = fetchFn || fetch;
  const token = () => process.env.DISCORD_BOT_TOKEN || '';
  const guild = () => process.env.DISCORD_GUILD_ID || '';
  const configured = () => !!(token() && guild());
  const cfgDefault = () => ({ roles: {}, links: {}, removeStale: false, auto: true, applied: '', last: null });
  const cfg = () => ({ ...cfgDefault(), ...JSON.parse(JSON.stringify(rd(file, {}))) });
  const save = c => wj(file, c);
  let busy = null;

  async function call(method, path, body, tries = 4) {
    for (let i = 0; i < tries; i++) {
      const r = await doFetch(API + path, {
        method,
        headers: { Authorization: 'Bot ' + token(), 'Content-Type': 'application/json', 'User-Agent': 'UFF-legacy-roles (1.0)', 'X-Audit-Log-Reason': 'UFF legacy rank' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined
      });
      if (r.status === 429) { const j = await r.json().catch(() => ({})); await sleep(Math.ceil(((j.retry_after || 1) + 0.2) * 1000)); continue; }
      if (r.status === 204) return null;
      const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch {}
      if (!r.ok) { const e = new Error((j && j.message) || ('Discord answered ' + r.status)); e.status = r.status; e.code = j && j.code; throw e; }
      return j;
    }
    throw new Error('Discord kept rate limiting the request');
  }

  /* make sure there is one role per tier: reuse an id we saved, else a role with the same name, else create it */
  async function ensureRoles(c) {
    const existing = await call('GET', `/guilds/${guild()}/roles`), byId = new Map(existing.map(r => [r.id, r])), made = [];
    c.roles = c.roles || {};
    for (const [key, name, color] of [...TIERS, ...EXTRA]) {
      let r = byId.get(c.roles[key]) || existing.find(x => low(x.name) === low(name));
      if (!r) { r = await call('POST', `/guilds/${guild()}/roles`, { name, color, hoist: true, mentionable: false }); made.push(name); }
      else if (TIERS.some(t => t[0] === key) && r.color !== color) { try { await call('PATCH', `/guilds/${guild()}/roles/${r.id}`, { color }); } catch (e) { /* needs Manage Roles and a higher bot role; skip */ } }
      c.roles[key] = r.id;
    }
    save(c); return made;
  }

  async function createRole(name, colorHex) {
    name = String(name || '').trim().slice(0, 100); if (!name) throw new Error('Type a role name first.');
    const m = /^#?([0-9a-f]{6})$/i.exec(String(colorHex || '').trim()), color = m ? parseInt(m[1], 16) : 0;
    const ex = await call('GET', `/guilds/${guild()}/roles`);
    if (ex.some(r => low(r.name) === low(name))) throw new Error('A role called "' + name + '" already exists.');
    const r = await call('POST', `/guilds/${guild()}/roles`, { name, color, hoist: false, mentionable: false });
    return r;
  }
  async function createDefaults() {
    if (!configured()) throw new Error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID first.');
    const c = cfg(), made = await ensureRoles(c); return made;
  }

  async function members() {
    const out = []; let after = '0';
    for (;;) {
      const page = await call('GET', `/guilds/${guild()}/members?limit=1000&after=${after}`);
      out.push(...page);
      if (page.length < 1000) break;
      after = page[page.length - 1].user.id;
    }
    return out;
  }
  /* every name a member could be found by: server nickname, display name, username, and anything in brackets, so
     "Zach (@exanious)" is found as "zach (@exanious)", "exanious" and "zach" */
  function keysOf(m) {
    const names = [m.nick, m.user && m.user.global_name, m.user && m.user.username].filter(Boolean), keys = new Set();
    for (const n of names) {
      keys.add(low(n));
      for (const g of String(n).matchAll(/[(\[{]\s*@?([^)\]}]+?)\s*[)\]}]/g)) keys.add(low(g[1]));
      const head = String(n).replace(/[(\[{].*$/, '').replace(/^@/, '').trim(); if (head) keys.add(low(head));
    }
    return keys;
  }
  function parseLinks(text) {
    const links = {};
    for (const raw of String(text || '').split(/\r?\n/)) {
      const m = /^\s*(.+?)\s*(?:=|->|:|,)\s*@?(\S.*?)\s*$/.exec(raw); if (!m) continue;
      links[low(m[1])] = m[2].trim();
    }
    return links;
  }

  function sigOf(c) {
    const tierOf = new Map(); for (const t of getView().tiers) if (t.name !== 'UNRANKED') for (const p of t.players) tierOf.set(low(p.name), t.name);
    return [...tierOf].map(([k, v]) => k + ':' + v).sort().join('|') + '#' + ['crown', 'title'].map(k => k + ':' + [...((c.ct || {})[k] || [])].map(low).sort().join(',')).join('#');
  }
  /* work out who should hold which role (no changes made) */
  async function plan(c) {
    const view = getView(), ms = await members(), index = new Map(), byId = new Map(), problems = [], tierOf = new Map();
    for (const t of view.tiers) if (t.name !== 'UNRANKED') for (const p of t.players) tierOf.set(low(p.name), { name: p.name, tier: t.name });
    for (const m of ms) { byId.set(m.user.id, m); for (const k of keysOf(m)) { if (!index.has(k)) index.set(k, new Set()); index.get(k).add(m.user.id); } }
    const find = (key, label) => {
      const link = (c.links || {})[key]; let id = null;
      if (link) {
        if (/^\d{15,25}$/.test(link)) id = byId.has(link) ? link : null;
        else { const s2 = index.get(low(link)); id = s2 && s2.size === 1 ? [...s2][0] : null; }
        if (!id) problems.push(`${label}: the linked Discord account "${link}" was not found in the server`);
        return id;
      }
      const s2 = index.get(key);
      if (s2 && s2.size === 1) return [...s2][0];
      if (s2 && s2.size > 1) problems.push(`${label}: matches ${s2.size} Discord members, add a link to pick one`);
      return null;
    };
    const managed = new Set([...TIERS, ...EXTRA].map(t => c.roles[t[0]]).filter(Boolean)), tierIds = new Set(TIERS.map(t => c.roles[t[0]]).filter(Boolean));
    const want = new Map(), unmatched = [], seenProblem = new Set();
    const slot = id => { if (!want.has(id)) want.set(id, { names: [], tier: null, tierRole: null, crown: false, title: false }); return want.get(id); };
    for (const [key, info] of tierOf) {
      const id = find(key, info.name); if (!id) { unmatched.push(info.name); continue; }
      const w = slot(id);
      if (w.tier) { problems.push(`${info.name}: same Discord member as ${w.names[0]}, skipped`); continue; }
      w.names.push(info.name); w.tier = info.tier; w.tierRole = c.roles[info.tier] || null;
    }
    for (const kind of ['crown', 'title']) for (const nameRaw of ((c.ct || {})[kind] || [])) {
      const key = low(nameRaw), id = find(key, nameRaw + ' (' + kind + ')');
      if (!id) { if (!tierOf.has(key) && !unmatched.includes(nameRaw)) unmatched.push(nameRaw); continue; }
      const w = slot(id); if (!w.names.includes(nameRaw)) w.names.push(nameRaw); w[kind] = true;
    }
    const changes = [], who = m => (m.nick || m.user.global_name || m.user.username);
    for (const m of ms) {
      const have = (m.roles || []).filter(r => managed.has(r)), w = want.get(m.user.id);
      let desired;
      if (w) {
        desired = new Set();
        if (w.tierRole) desired.add(w.tierRole);
        if (w.crown && c.roles.CROWN) desired.add(c.roles.CROWN);
        if (w.title && c.roles.TITLE) desired.add(c.roles.TITLE);
        if (!w.tier && !c.removeStale) have.filter(r => tierIds.has(r)).forEach(r => desired.add(r));        // on the crown/title list only: keep their rank role
      } else {
        desired = new Set(c.removeStale ? [] : have.filter(r => tierIds.has(r)));                              // crown/title roles always go when no longer earned
      }
      const add = [...desired].filter(r => !have.includes(r)), remove = have.filter(r => !desired.has(r));
      if (add.length || remove.length) changes.push({ id: m.user.id, who: who(m), player: w ? w.names.join(' / ') : '(no longer qualifies)', tier: w && w.tier ? w.tier : (w ? 'crown/title' : 'none'), add, remove });
    }
    const stale = ms.filter(m => !want.has(m.user.id) && (m.roles || []).some(r => tierIds.has(r))).length;
    const sig = sigOf(c);
    return { changes, unmatched, problems, stale, matched: want.size, members: ms.length, sig };
  }

  async function run(dry, ct) {
    if (!configured()) throw new Error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID first.');
    if (busy) return busy;
    busy = (async () => {
      const c = cfg(); if (ct) { c.ct = cleanCt(ct); if (!dry) save(c); }
      const made = dry ? [] : await ensureRoles(c);
      if (dry && !Object.keys(c.roles || {}).length) { const ex = await call('GET', `/guilds/${guild()}/roles`); for (const [k, n] of [...TIERS, ...EXTRA]) { const r = ex.find(x => low(x.name) === low(n[1])); if (r) c.roles[k] = r.id; } }
      if (dry) for (const t of [...TIERS, ...EXTRA]) if (!c.roles[t[0]]) c.roles[t[0]] = 'new:' + t[0];   // preview: roles that do not exist yet
      const p = await plan(c), errors = []; let done = 0;
      if (!dry) {
        const roleName = id => (Object.entries(c.roles).find(([, v]) => v === id) || [])[0] || id;
        for (const ch of p.changes) {
          try {
            for (const r of ch.remove) { await call('DELETE', `/guilds/${guild()}/members/${ch.id}/roles/${r}`); await sleep(120); }
            for (const r of ch.add) { await call('PUT', `/guilds/${guild()}/members/${ch.id}/roles/${r}`); await sleep(120); }
            done++;
          } catch (e) {
            errors.push(`${ch.player}: ${e.message}${e.code === 50013 ? ' (move the bot\'s role above the rank roles)' : ''}`);
            if (errors.length >= 5 && !done) break;
          }
        }
      }
      const rep = { at: Date.now(), dry: !!dry, createdRoles: made, matched: p.matched, members: p.members, changed: dry ? 0 : done, wouldChange: p.changes.length, unmatched: p.unmatched, problems: p.problems, errors, stale: p.stale,
        preview: p.changes.slice(0, 60).map(x => `${x.player} (${x.who}) -> ${x.tier}`) };
      if (!dry) { const c2 = cfg(); c2.roles = c.roles; c2.ct = c.ct || c2.ct; c2.last = rep; if (!errors.length) c2.applied = p.sig; save(c2); }
      return rep;
    })().finally(() => { busy = null; });
    return busy;
  }

  /* Which Discord roles does each of these site players hold? Read only, nothing is changed on Discord.
     Players are matched to members the same way as the ranking roles (nickname / display name / username, plus the links box). */
  async function playerRoles(names) {
    if (!configured()) throw new Error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID first (see README), then restart.');
    const c = cfg(), rl = await call('GET', `/guilds/${guild()}/roles`), roleName = new Map(rl.map(r => [r.id, r.name])), ms = await members();
    const index = new Map(), byId = new Map(), problems = [], found = [], unmatched = [];
    for (const m of ms) { byId.set(m.user.id, m); for (const k of keysOf(m)) { if (!index.has(k)) index.set(k, new Set()); index.get(k).add(m.user.id); } }
    for (const name of [...new Set((names || []).map(x => String(x).trim()).filter(Boolean))].slice(0, 5000)) {
      const key = low(name), link = (c.links || {})[key]; let id = null;
      if (link) {
        if (/^\d{15,25}$/.test(link)) id = byId.has(link) ? link : null;
        else { const s2 = index.get(low(link)); id = s2 && s2.size === 1 ? [...s2][0] : null; }
        if (!id) problems.push(`${name}: the linked Discord account "${link}" was not found in the server`);
      } else {
        const s2 = index.get(key);
        if (s2 && s2.size === 1) id = [...s2][0];
        else if (s2 && s2.size > 1) problems.push(`${name}: matches ${s2.size} Discord members, add a link to pick one`);
      }
      if (!id) { unmatched.push(name); continue; }
      const m = byId.get(id);
      found.push({ player: name, discord: (m.nick || (m.user && (m.user.global_name || m.user.username)) || ''), roles: (m.roles || []).map(r => roleName.get(r)).filter(Boolean) });
    }
    return { at: Date.now(), members: ms.length, found, unmatched, problems };
  }
  const cleanCt = ct => ({ crown: [...new Set(((ct || {}).crown || []).map(x => String(x).slice(0, 40)).filter(Boolean))].slice(0, 200), title: [...new Set(((ct || {}).title || []).map(x => String(x).slice(0, 40)).filter(Boolean))].slice(0, 200) });
  function setCt(ct) { const c = cfg(); c.ct = cleanCt(ct); save(c); }
  function status() {
    const c = cfg();
    return { configured: configured(), tokenSet: !!token(), guildSet: !!guild(), roles: c.roles, removeStale: !!c.removeStale, auto: c.auto !== false, last: c.last,
      links: Object.entries(c.links || {}).map(([k, v]) => `${k} = ${v}`).join('\n'), tiers: TIERS.map(t => t[1]), extra: EXTRA.map(t => t[1]), have: Object.keys(c.roles || {}), ct: c.ct || { crown: [], title: [] } };
  }
  function settings(b) {
    const c = cfg();
    if (typeof b.removeStale === 'boolean') c.removeStale = b.removeStale;
    if (typeof b.auto === 'boolean') c.auto = b.auto;
    if (typeof b.links === 'string') c.links = parseLinks(b.links);
    save(c); return status();
  }
  /* called whenever the legacy data may have changed (and on a timer): only talks to Discord if somebody's tier moved */
  async function auto(force) {
    if (!configured()) return;
    const c = cfg(); if (c.auto === false) return;
    try {
      const sig = sigOf(c);
      if (!force && sig === c.applied && Date.now() - ((c.last || {}).at || 0) < 30 * 60 * 1000) return;
      await run(false);
    } catch (e) { console.error('Discord roles:', e.message); const c2 = cfg(); c2.last = { at: Date.now(), error: e.message, errors: [e.message], problems: [], unmatched: [], createdRoles: [] }; save(c2); }
  }
  return { configured, status, settings, run, auto, parseLinks, keysOf, createRole, createDefaults, setCt, playerRoles, TIERS };
}
module.exports = { create, TIERS };

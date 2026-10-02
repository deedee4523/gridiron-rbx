// Legacy import helpers (dependency-free): reads .ods, .xlsx, .fods, .csv and Google Sheets/Docs/Drive links.
const zlib = require('zlib');

/* ---------- tiny helpers ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, g) => {
  if (g[0] === '#') { const n = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10); try { return String.fromCodePoint(n); } catch { return ''; } }
  return ENT[g.toLowerCase()] ?? m;
});
const stripTags = s => decode(String(s).replace(/<text:s[^>]*?(?:text:c="(\d+)")?[^>]*\/>/g, ' ').replace(/<text:tab\s*\/>/g, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>\s*<p[^>]*>/gi, ' ').replace(/<[^>]*>/g, ''));
const attr = (a, n) => { const m = new RegExp('(?:^|\\s)' + n.replace(/[:.]/g, '\\$&') + '\\s*=\\s*"([^"]*)"').exec(a); return m ? decode(m[1]) : null; };
const trimRow = r => { while (r.length && (r[r.length - 1] === '' || r[r.length - 1] == null)) r.pop(); return r; };

/* ---------- CSV ---------- */
function parseCsv(t) {
  const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); rows.push(r); r = []; c = ''; }
    else c += ch;
  }
  if (c || r.length) { r.push(c); rows.push(r); }
  return rows;
}

/* ---------- zip reader ---------- */
function unzip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('This file is not a valid .ods / .xlsx file');
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const files = {};
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    files[buf.toString('utf8', p + 46, p + 46 + nlen)] = { method, csize, lho };
    p += 46 + nlen + xlen + clen;
  }
  const get = name => {
    const f = files[name]; if (!f) return null;
    const ln = buf.readUInt16LE(f.lho + 26), lx = buf.readUInt16LE(f.lho + 28), s = f.lho + 30 + ln + lx;
    const data = buf.subarray(s, s + f.csize);
    return f.method === 0 ? data : zlib.inflateRawSync(data);
  };
  return { names: Object.keys(files), get };
}

/* ---------- ODS / FODS ---------- */
function odsSheets(xml) {
  const sheets = [];
  const tre = /<table:table(?=[\s>])([^>]*?)>([\s\S]*?)<\/table:table>/g; let tm;
  while ((tm = tre.exec(xml))) {
    const name = attr(tm[1], 'table:name') || 'Sheet' + (sheets.length + 1), rows = [];
    const rre = /<table:table-row(?=[\s>\/])([^>]*?)(\/>|>([\s\S]*?)<\/table:table-row>)/g; let rm;
    while ((rm = rre.exec(tm[2]))) {
      const rep = Math.max(1, +attr(rm[1], 'table:number-rows-repeated') || 1), cells = [];
      const body = rm[3] || '';
      const cre = /<table:(table-cell|covered-table-cell)(?=[\s>\/])([^>]*?)(\/>|>([\s\S]*?)<\/table:\1>)/g; let cm;
      while ((cm = cre.exec(body))) {
        const a = cm[2], crep = Math.min(Math.max(1, +attr(a, 'table:number-columns-repeated') || 1), 60), type = attr(a, 'office:value-type');
        let val = '';
        if (type === 'float' || type === 'percentage' || type === 'currency') val = attr(a, 'office:value') ?? '';
        else if (type === 'date') val = attr(a, 'office:date-value') ?? '';
        else if (type === 'boolean') val = attr(a, 'office:boolean-value') ?? '';
        else if (type) { val = attr(a, 'office:string-value'); if (val == null) { const ps = (cm[4] || '').match(/<text:p[^>]*>[\s\S]*?<\/text:p>/g) || []; val = ps.map(stripTags).join(' '); } }
        for (let k = 0; k < crep; k++) cells.push(val);
      }
      trimRow(cells);
      const times = cells.length ? Math.min(rep, 50) : Math.min(rep, 1);
      for (let k = 0; k < times; k++) rows.push(cells.slice());
      if (rows.length > 20000) break;
    }
    sheets.push({ name, rows });
  }
  return sheets;
}

/* ---------- XLSX ---------- */
const colIdx = s => { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
function xlsxSheets(z) {
  const txt = n => { const b = z.get(n); return b ? b.toString('utf8') : ''; };
  const shared = [];
  const ss = txt('xl/sharedStrings.xml').replace(/<rPh[\s\S]*?<\/rPh>/g, '');
  (ss.match(/<si[\s>][\s\S]*?<\/si>|<si\s*\/>/g) || []).forEach(si => { shared.push(decode((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(t => t.replace(/<[^>]*>/g, '')).join(''))); });
  const wb = txt('xl/workbook.xml'), rels = txt('xl/_rels/workbook.xml.rels'), relMap = {};
  (rels.match(/<Relationship\b[^>]*>/g) || []).forEach(r => { const id = attr(r, 'Id'), t = attr(r, 'Target'); if (id && t) relMap[id] = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); });
  let list = (wb.match(/<sheet\b[^>]*>/g) || []).map((s, i) => ({ name: attr(s, 'name') || 'Sheet' + (i + 1), file: relMap[attr(s, 'r:id')] || 'xl/worksheets/sheet' + (i + 1) + '.xml' }));
  if (!list.length) list = z.names.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).map((n, i) => ({ name: 'Sheet' + (i + 1), file: n }));
  return list.map(({ name, file }) => {
    const xml = txt(file), rows = [];
    const rre = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g; let rm, auto = 0;
    while ((rm = rre.exec(xml))) {
      const rn = (+attr(rm[1], 'r') || ++auto) - 1; auto = rn + 1; const cells = [];
      const cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; let cm, ci = 0;
      while ((cm = cre.exec(rm[2] || ''))) {
        const ref = attr(cm[1], 'r'), t = attr(cm[1], 't'), body = cm[2] || '';
        if (ref) { const L = /^[A-Z]+/.exec(ref); if (L) ci = colIdx(L[0]); }
        let val = '';
        const v = /<v[^>]*>([\s\S]*?)<\/v>/.exec(body);
        if (t === 's' && v) val = shared[+v[1]] ?? '';
        else if (t === 'inlineStr') val = decode((body.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(x => x.replace(/<[^>]*>/g, '')).join(''));
        else if (v) val = decode(v[1]);
        cells[ci] = val; ci++;
      }
      for (let k = 0; k < cells.length; k++) if (cells[k] == null) cells[k] = '';
      while (rows.length < rn) rows.push([]);
      rows[rn] = trimRow(cells);
      if (rows.length > 20000) break;
    }
    return { name, rows };
  });
}

/* ---------- HTML tables (Google Doc export) ---------- */
function htmlSheets(html) {
  return (html.match(/<table[\s\S]*?<\/table>/gi) || []).map((t, i) => ({
    name: 'Table' + (i + 1),
    rows: (t.match(/<tr[\s\S]*?<\/tr>/gi) || []).map(tr => (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(c => stripTags(c).replace(/\s+/g, ' ').trim()))
  }));
}

/* ---------- any file -> sheets ---------- */
function readSheets(buf) {
  if (buf.length > 3 && buf[0] === 0x50 && buf[1] === 0x4b) {
    const z = unzip(buf);
    if (z.names.includes('content.xml')) return odsSheets(z.get('content.xml').toString('utf8'));
    if (z.names.includes('xl/workbook.xml')) return xlsxSheets(z);
    throw new Error('Unsupported file. Use .ods, .xlsx or .csv');
  }
  if (buf.length > 7 && buf.readUInt32BE(0) === 0xd0cf11e0) throw new Error('Old .xls files are not supported. Save it as .ods, .xlsx or .csv');
  const t = buf.toString('utf8').replace(/^\uFEFF/, '');
  if (/<office:document[\s>]/.test(t)) return odsSheets(t);
  if (/^\s*<(!doctype|html|\?xml)/i.test(t) || /<html[\s>]/i.test(t.slice(0, 500))) {
    if (/<table[\s>]/i.test(t)) return htmlSheets(t);
    throw new Error('The link gave back a web page, not data. Set sharing to "Anyone with the link can view" and try again.');
  }
  return [{ name: 'csv', rows: parseCsv(t) }];
}

/* ---------- legacy table -> players ---------- */
const COLS = [['ufb', ['UFB']], ['mvp', ['MVP']], ['pa', ['PA']], ['va', ['VA']], ['first', ['1ST', 'FIRST', '1STTEAM']], ['second', ['2ND', 'SECOND', '2NDTEAM']], ['crowns', ['CROWNS', 'CROWN']], ['titles', ['TITLES', 'TITLE', 'CHAMPIONSHIPS']], ['cc', ['CC']], ['fo', ['FO']]];
const NAMEH = ['PLAYER', 'PLAYERS', 'NAME', 'PLAYERNAME', 'USERNAME', 'ROBLOXUSERNAME'], SCOREH = ['SCORE', 'LEGACYSCORE', 'LEGACY', 'TOTAL', 'TOTALSCORE', 'POINTS', 'PTS'];
const norm = s => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const num = x => Number(String(x ?? '').replace(/[,\s]/g, '')) || 0;
const TIERWORD = /^(hall of fame|ultra|legend|superstar|specialist|veteran|all ?pro|pro|unranked)\b/i;

function parseTable(rows) {
  let hi = -1, H;
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const h = (rows[i] || []).map(norm);
    if (h.some(x => NAMEH.includes(x)) && h.some(x => SCOREH.includes(x))) { hi = i; H = h; break; }
  }
  if (hi < 0) return null;
  const nameI = H.findIndex(x => NAMEH.includes(x)), scoreI = H.findIndex(x => SCOREH.includes(x));
  const cols = COLS.map(([, al]) => H.findIndex(x => al.includes(x)));
  const out = [], seen = new Set(); let hof = false;
  for (const r of rows.slice(hi + 1)) {
    const name = String(r[nameI] ?? '').trim();
    const others = r.filter((c, i) => i !== nameI && String(c ?? '').trim() !== '');
    if (!name) { const sec = r.map(c => String(c ?? '').trim()).filter(c => c && isNaN(Number(c.replace(/,/g, '')))).join(' '); if (sec) hof = /HALL OF FAME/i.test(sec); continue; }
    if (!others.length && TIERWORD.test(name)) { hof = /HALL OF FAME/i.test(name); continue; }
    if (seen.has(name.toLowerCase())) continue; seen.add(name.toLowerCase());
    out.push({ name: name.slice(0, 40), score: num(r[scoreI]), s: cols.map(i => i < 0 ? 0 : num(r[i])), hof });
  }
  return out;
}

function parseLegacySheets(sheets) {
  let best = null;
  for (const sh of sheets) { const p = parseTable(sh.rows); if (p && (!best || p.length > best.length)) best = p; }
  if (!best) throw new Error('Could not find a table with "Player" and "Score" column headings' + (sheets.length ? ' (looked at: ' + sheets.map(s => s.name).join(', ') + ')' : ''));
  if (!best.length) throw new Error('Found the Player / Score headings but no player rows under them');
  return best;
}

/* ---------- links ---------- */
function privateHost(h) {
  h = h.toLowerCase().replace(/^\[|\]$/g, '');
  if (process.env.LEGACY_ALLOW_LOCAL === '1') return false;
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '::1' || h === '0.0.0.0') return true;
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(h);
  return !!m && (+m[1] === 10 || +m[1] === 127 || +m[1] === 0 || (+m[1] === 169 && +m[2] === 254) || (+m[1] === 192 && +m[2] === 168) || (+m[1] === 172 && +m[2] >= 16 && +m[2] <= 31));
}
function candidates(input) {
  let u = String(input || '').trim(), m;
  if (!u) throw new Error('Paste a link first');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  let host; try { host = new URL(u).hostname; } catch { throw new Error('That does not look like a link'); }
  if (privateHost(host)) throw new Error('That address is not allowed');
  const gid = (u.match(/[#?&]gid=(\d+)/) || [])[1];
  if ((m = u.match(/docs\.google\.com\/spreadsheets\/d\/e\/([\w-]+)/))) {
    const b = 'https://docs.google.com/spreadsheets/d/e/' + m[1] + '/pub';
    return gid ? [b + '?gid=' + gid + '&single=true&output=csv', b + '?output=xlsx'] : [b + '?output=xlsx', b + '?output=csv'];
  }
  if ((m = u.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/))) {
    const b = 'https://docs.google.com/spreadsheets/d/' + m[1];
    return gid ? [b + '/export?format=csv&gid=' + gid, b + '/export?format=xlsx'] : [b + '/export?format=xlsx', b + '/gviz/tq?tqx=out:csv'];
  }
  if ((m = u.match(/docs\.google\.com\/document\/d\/([\w-]+)/))) return ['https://docs.google.com/document/d/' + m[1] + '/export?format=html', 'https://docs.google.com/document/d/' + m[1] + '/export?format=txt'];
  if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/))) return ['https://drive.google.com/uc?export=download&id=' + m[1]];
  if (/dropbox\.com/i.test(host)) return [u.replace(/([?&])dl=0/, '$1dl=1').replace(/^([^?]*)$/, '$1?dl=1')];
  return [u];
}
async function fetchBuf(url) {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'Mozilla/5.0 (UFF legacy import)' } });
  if (!r.ok) throw new Error('The link answered with HTTP ' + r.status + (r.status === 401 || r.status === 403 || r.status === 404 ? ' - set sharing to "Anyone with the link can view"' : ''));
  const b = Buffer.from(await r.arrayBuffer());
  if (b.length > 25 * 1024 * 1024) throw new Error('That file is too large');
  return b;
}
async function loadUrl(input) {
  let last = null;
  for (const c of candidates(input)) {
    try { return parseLegacySheets(readSheets(await fetchBuf(c))); }
    catch (e) { last = e; }
  }
  throw last || new Error('Could not read that link');
}
function loadBuffer(buf) { return parseLegacySheets(readSheets(buf)); }


/* ---------- past awards: seasons across the top (SEASON I, SEASON II ...), award names down the side (MVP, OPOY ...) ---------- */
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100 };
function romanToInt(t) {
  t = String(t).toLowerCase(); if (!/^[ivxlc]+$/.test(t)) return 0;
  let n = 0; for (let i = 0; i < t.length; i++) { const a = ROMAN[t[i]], b = ROMAN[t[i + 1]] || 0; n += a < b ? -a : a; }
  return n > 0 && n < 200 ? n : 0;
}
function seasonOf(cell) {
  const t = String(cell == null ? '' : cell).trim(); let m;
  if ((m = /^(?:season|szn|seas|s)\.?\s*#?\s*0*(\d{1,3})$/i.exec(t))) return +m[1];
  if ((m = /^(?:season|szn|seas)\.?\s*#?\s*([ivxlc]+)$/i.exec(t))) return romanToInt(m[1]);
  return 0;
}
const transpose = rows => { const w = Math.max(0, ...rows.map(r => r.length)), out = []; for (let c = 0; c < w; c++) out.push(rows.map(r => r[c] == null ? '' : r[c])); return out; };
function awardGrid(rows) {
  let cols = null, first = 0, out = [], header = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || [], hit = [];
    r.forEach((c, ci) => { const se = seasonOf(c); if (se) hit.push({ col: ci, se }); });
    if (hit.length >= 2) { cols = hit; first = Math.min(...hit.map(h => h.col)); if (header < 0) header = i; continue; }
    if (!cols) continue;
    let label = ''; for (let ci = 0; ci < first; ci++) { const v = String(r[ci] == null ? '' : r[ci]).replace(/\s+/g, ' ').trim(); if (v) { label = v; break; } }
    if (!label || label.length > 40 || /^(szn|season)\b/i.test(label)) continue;
    const cells = {}; let any = false;
    for (const h of cols) { const v = String(r[h.col] == null ? '' : r[h.col]).replace(/\s+/g, ' ').trim(); if (v) { cells[h.se] = v.slice(0, 120); any = true; } }
    if (any) out.push({ label, cells });
  }
  if (!out.length) return null;
  return { rows: out, seasons: [...new Set(cols.map(h => h.se))].sort((a, b) => a - b) };
}
function parseAwardSheets(sheets) {
  let best = null;
  for (const sh of sheets) {
    for (const rows of [sh.rows, transpose(sh.rows)]) {
      const g = awardGrid(rows); if (!g) continue;
      const score = g.rows.length + (/award/i.test(sh.name) ? 1000 : 0);
      if (!best || score > best.score) best = { score, name: sh.name, ...g };
      break;
    }
  }
  if (!best) throw new Error('Could not find the awards table. It needs SEASON headings across the top (SEASON I, SEASON II ... or S1, S2 ...) and award names (MVP, OPOY ...) down the left side' + (sheets.length ? ' (looked at: ' + sheets.map(x => x.name).join(', ') + ')' : ''));
  return { sheet: best.name, seasons: best.seasons, rows: best.rows.slice(0, 80) };
}
async function loadAwardsUrl(input) {
  let last = null;
  for (const c of candidates(input)) {
    try { return parseAwardSheets(readSheets(await fetchBuf(c))); }
    catch (e) { last = e; }
  }
  throw last || new Error('Could not read that link');
}
const loadAwardsBuffer = buf => parseAwardSheets(readSheets(buf));


/* ---------- past United Flag Bowl documents: read a Google Doc and find which known players it names ---------- */
const decodeEnt = t => String(t).replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
function htmlToText(h) {
  h = String(h).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6]|td|th)>/gi, '\n').replace(/<[^>]+>/g, ' ');
  return decodeEnt(h).replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n');
}
async function loadDocText(input) {
  let u = String(input || '').trim(), m;
  if (!u) throw new Error('Paste a Google Docs link first');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  const tries = [];
  if ((m = u.match(/docs\.google\.com\/document\/d\/e\/([\w-]+)/))) tries.push('https://docs.google.com/document/d/e/' + m[1] + '/pub');
  else if ((m = u.match(/docs\.google\.com\/document\/d\/([\w-]+)/))) tries.push('https://docs.google.com/document/d/' + m[1] + '/export?format=txt', 'https://docs.google.com/document/d/' + m[1] + '/export?format=html');
  else throw new Error('That is not a Google Docs link. It should look like https://docs.google.com/document/d/…');
  let last = null;
  for (const t of tries) {
    try {
      let txt = (await fetchBuf(t)).toString('utf8').replace(/^\uFEFF/, '');
      if (/^\s*<(!doctype|html)/i.test(txt)) { if (/accounts\.google\.com|ServiceLogin/i.test(txt) && !/<\/p>/i.test(txt)) throw new Error('The document is private - set sharing to "Anyone with the link can view"'); txt = htmlToText(txt); }
      if (txt.trim()) return txt;
    } catch (e) { last = e; }
  }
  throw last || new Error('Could not read that document');
}
/* lines + which of the given names appear on which line (whole-name match, longest names first so "Max" never matches inside "Maxwell") */
function scanDoc(text, names) {
  const lines = String(text).split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 4000).map(x => x.slice(0, 400));
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const list = [...new Set((names || []).map(x => String(x).trim()).filter(x => x.length >= 3 && !/^\d+$/.test(x)))].sort((a, b) => b.length - a.length);
  const rx = list.map(n => ({ n, r: new RegExp('(?<![A-Za-z0-9_])' + esc(n) + '(?![A-Za-z0-9_])', 'i') }));
  const hits = [];
  lines.forEach((ln, li) => {
    let w = ln;
    for (const { n, r } of rx) { const m = r.exec(w); if (m) { hits.push({ name: n, line: li }); w = w.slice(0, m.index) + ' '.repeat(m[0].length) + w.slice(m.index + m[0].length); } }
  });
  return { lines, hits, size: lines.length };
}

module.exports = { loadDocText, scanDoc, htmlToText, loadAwardsUrl, loadAwardsBuffer, awardGrid, loadUrl, loadBuffer, readSheets, parseLegacySheets, parseCsv, candidates };

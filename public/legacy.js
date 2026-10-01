/* Legacy page: live from the Google Sheet (server refreshes it every 5 minutes; this page re-checks every minute). */
(function(){
const L={d:null,sig:'',err:''};
const css=document.createElement('style');css.textContent=`.lg-wrap{overflow-x:auto;margin-top:10px}.lg-t{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}.lg-t th{font:700 10px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--dim);text-align:center;padding:8px 6px}.lg-t td{padding:7px 6px;text-align:center;border-top:1px solid var(--line)}.lg-t td.n,.lg-t th.n{text-align:left}.lg-t td.r{color:var(--dim);width:42px}.lg-t td.sc{font:800 16px var(--disp);color:var(--amber)}.lg-t td.z{color:var(--dim2)}.lg-pl{display:flex;align-items:center;gap:9px;font-weight:600}.lg-pl img{width:26px;height:26px;border-radius:50%;background:var(--panel2);object-fit:cover}.lg-h{display:flex;align-items:baseline;gap:10px;margin:26px 0 4px}.lg-h b{font:800 22px var(--disp);letter-spacing:.04em;text-transform:uppercase}.lg-h span{font-size:11px;color:var(--dim)}.lg-h.hof b{color:var(--amber)}.lg-h.t-halloffame,.lg-h.t-allpro,.lg-h.t-veteran,.lg-h.t-pro{padding:9px 14px;border-radius:6px}.lg-h.t-halloffame{background:#ffec20}.lg-h.t-halloffame b,.lg-h.t-halloffame span{color:#1a1500}.lg-h.t-allpro{background:#fba2f9}.lg-h.t-allpro b,.lg-h.t-allpro span{color:#3a0f39}.lg-h.t-veteran{background:#7ae2ff}.lg-h.t-veteran b,.lg-h.t-veteran span{color:#06303b}.lg-h.t-pro{background:#000;border:1px solid #2a2a2a}.lg-h.t-pro b,.lg-h.t-pro span{color:#fff}.lg-e{color:var(--dim2);padding:10px 0;font-size:13px}`;document.head.appendChild(css);
let busy=false,fails=0;
async function pull(){
  if(busy)return;busy=true;
  try{
    const r=await fetch('/api/legacy',{cache:'no-store'});
    const ct=r.headers.get('content-type')||'';
    if(!r.ok)throw new Error('The server answered '+r.status);
    if(!/json/i.test(ct))throw new Error('The server is running an old version without Legacy support. Redeploy server.js and legacy-import.js.');
    const d=await r.json(),sig=d.at+'|'+d.edited+'|'+(d.error||'')+'|'+d.tiers.reduce((n,t)=>n+t.players.length,0);
    L.err='';fails=0;
    if(sig!==L.sig){L.sig=sig;L.d=d;if(location.hash.startsWith('#/legacy')&&!(document.activeElement&&document.activeElement.id==='lg_q'))route()}else L.d=d;
  }catch(e){
    L.err=String(e.message||e);fails++;
    if(location.hash.startsWith('#/legacy')&&!L.d)route();
    if(fails<4)setTimeout(pull,3000*fails);
  }finally{busy=false}
}
window.lgRetry=()=>{L.err='';fails=0;pull();if(location.hash.startsWith('#/legacy'))route()};
function view(){
  pull();const d=L.d;
  const head=pageHead('All-time standings','Legacy','Career legacy score for every player, pulled live from the league sheet.');
  if(!d)return head+(L.err?`<p class="lg-e" style="color:var(--red)">Could not load Legacy: ${esc(L.err)} <button class="chip" onclick="lgRetry()" style="margin-left:8px">Try again</button></p>`:'<p class="lg-e">Loading legacy…</p>');
  const tot=d.tiers.reduce((n,t)=>n+t.players.length,0);
  const ago=d.at?Math.max(1,Math.round((Date.now()-d.at)/60000))+' min ago':'not yet';
  const src=d.source&&d.source.label?' · '+esc(d.source.label):'';
  const err=d.error?`<div class="lg-e" style="color:var(--red)">${tot?'Last refresh failed, showing the last good data: ':'Could not read the legacy data: '}${esc(d.error)}</div>`:'';
  if(!tot)return head+err+'<div class="lg-e">No legacy data yet. An admin can add a Google Sheets / Docs link or upload an .ods file in Admin → Legacy.</div>';
  return head+err+`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><input id="lg_q" type="search" placeholder="Search players…" style="max-width:260px;background:var(--panel2);border:1px solid var(--line2);color:var(--text);border-radius:6px;padding:9px 12px;font:13px var(--body)" oninput="var v=this.value.toLowerCase();document.querySelectorAll('.lg-t tr[data-n]').forEach(function(r){r.style.display=r.dataset.n.indexOf(v)<0?'none':''})"><span class="lg-e" style="padding:0">${tot} players · updated ${ago}${src}</span></div>`+
   d.tiers.map(t=>`<div class="lg-h t-${t.name.replace(/[^A-Za-z]/g,'').toLowerCase()} ${t.name==='HALL OF FAME'?'hof':''}"><b>${esc(t.name)}</b><span>${t.min>0&&t.min<1e9?t.min+'+':t.name==='HALL OF FAME'?'Inductees':''} · ${t.players.length}</span></div>`+
   (t.players.length?`<div class="lg-wrap"><table class="lg-t"><thead><tr><th>#</th><th class="n">Player</th><th>Score</th>${d.cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.players.map(p=>`<tr data-n="${esc(p.name.toLowerCase())}"><td class="r">${p.rank}</td><td class="n"><span class="lg-pl"><img src="/api/avatar/${encodeURIComponent(p.name)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">${esc(p.name)}</span></td><td class="sc">${p.score}</td>${p.s.map(v=>`<td class="${v?'':'z'}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="lg-e">No players in this tier yet.</div>')).join('');
}
Object.assign(window.XV=window.XV||{},{legacy:view});
pull();setInterval(()=>{if(document.visibilityState==='visible')pull()},60000);
})();

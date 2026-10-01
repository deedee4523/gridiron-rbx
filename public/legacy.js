/* Legacy page: live from the Google Sheet (server refreshes it every 5 minutes; this page re-checks every minute). */
(function(){
const L={d:null,sig:''};
const css=document.createElement('style');css.textContent=`.lg-wrap{overflow-x:auto;margin-top:10px}.lg-t{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}.lg-t th{font:700 10px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--dim);text-align:center;padding:8px 6px}.lg-t td{padding:7px 6px;text-align:center;border-top:1px solid var(--line)}.lg-t td.n,.lg-t th.n{text-align:left}.lg-t td.r{color:var(--dim);width:42px}.lg-t td.sc{font:800 16px var(--disp);color:var(--amber)}.lg-t td.z{color:var(--dim2)}.lg-pl{display:flex;align-items:center;gap:9px;font-weight:600}.lg-pl img{width:26px;height:26px;border-radius:50%;background:var(--panel2);object-fit:cover}.lg-h{display:flex;align-items:baseline;gap:10px;margin:26px 0 4px}.lg-h b{font:800 22px var(--disp);letter-spacing:.04em;text-transform:uppercase}.lg-h span{font-size:11px;color:var(--dim)}.lg-h.hof b{color:var(--amber)}.lg-e{color:var(--dim2);padding:10px 0;font-size:13px}`;document.head.appendChild(css);
const f=(d,b)=>{const a=(L.d=d,b);return a};
async function pull(){try{const r=await fetch('/api/legacy');if(!r.ok)return;const d=await r.json(),sig=d.at+'|'+d.edited+'|'+d.tiers.reduce((n,t)=>n+t.players.length,0);if(sig!==L.sig){L.sig=sig;L.d=d;if(location.hash.startsWith('#/legacy')&&!(document.activeElement&&document.activeElement.id==='lg_q'))route()}else L.d=d}catch(e){}}
function view(){
  pull();const d=L.d;
  const head=pageHead('All-time standings','Legacy','Career legacy score for every player, pulled live from the league sheet.');
  if(!d)return head+'<p class="lg-e">Loading legacy…</p>';
  const tot=d.tiers.reduce((n,t)=>n+t.players.length,0);
  const ago=d.at?Math.max(1,Math.round((Date.now()-d.at)/60000))+' min ago':'not yet';
  return head+`<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><input id="lg_q" type="search" placeholder="Search players…" style="max-width:260px;background:var(--panel2);border:1px solid var(--line2);color:var(--text);border-radius:6px;padding:9px 12px;font:13px var(--body)" oninput="var v=this.value.toLowerCase();document.querySelectorAll('.lg-t tr[data-n]').forEach(function(r){r.style.display=r.dataset.n.indexOf(v)<0?'none':''})"><span class="lg-e" style="padding:0">${tot} players · updated ${ago}${d.error?' · <span style="color:var(--red)">last sync failed</span>':''}</span></div>`+
   d.tiers.map(t=>`<div class="lg-h ${t.name==='HALL OF FAME'?'hof':''}"><b>${esc(t.name)}</b><span>${t.min>0&&t.min<1e9?t.min+'+':t.name==='HALL OF FAME'?'Inductees':''} · ${t.players.length}</span></div>`+
   (t.players.length?`<div class="lg-wrap"><table class="lg-t"><thead><tr><th>#</th><th class="n">Player</th><th>Score</th>${d.cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.players.map(p=>`<tr data-n="${esc(p.name.toLowerCase())}"><td class="r">${p.rank}</td><td class="n"><span class="lg-pl"><img src="/api/avatar/${encodeURIComponent(p.name)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">${esc(p.name)}</span></td><td class="sc">${p.score}</td>${p.s.map(v=>`<td class="${v?'':'z'}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<div class="lg-e">No players in this tier yet.</div>')).join('');
}
Object.assign(window.XV=window.XV||{},{legacy:view});
pull();setInterval(()=>{if(document.visibilityState==='visible')pull()},60000);
})();

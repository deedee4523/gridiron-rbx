/* Legacy page: live from the Google Sheet (server refreshes it every 5 minutes; this page re-checks every minute). */
(function(){
const L={d:null,sig:'',err:''};
const css=document.createElement('style');css.textContent=`.lg-wrap{overflow-x:auto;margin-top:10px}.lg-t{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}.lg-t th{font:700 10px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--dim);text-align:center;padding:8px 6px}.lg-t td{padding:7px 6px;text-align:center;border-top:1px solid var(--line)}.lg-t td.n,.lg-t th.n{text-align:left}.lg-t td.r{color:var(--dim);width:42px}.lg-t td.sc{font:800 16px var(--disp);color:var(--amber)}.lg-t td.z{color:var(--dim2)}.lg-pl{display:flex;align-items:center;gap:9px;font-weight:600}.lg-pl img{width:26px;height:26px;border-radius:50%;background:var(--panel2);object-fit:cover}.lg-h{display:flex;align-items:baseline;gap:10px;margin:26px 0 4px}.lg-h b{font:800 22px var(--disp);letter-spacing:.04em;text-transform:uppercase}.lg-h span{font-size:11px;color:var(--dim)}.lg-h.hof b{color:var(--amber)}.lg-h.t-halloffame,.lg-h.t-allpro,.lg-h.t-veteran,.lg-h.t-pro{padding:9px 14px;border-radius:6px}.lg-h.t-halloffame{background:#ffec20}.lg-h.t-halloffame b,.lg-h.t-halloffame span{color:#1a1500}.lg-h.t-allpro{background:#fba2f9}.lg-h.t-allpro b,.lg-h.t-allpro span{color:#3a0f39}.lg-h.t-veteran{background:#7ae2ff}.lg-h.t-veteran b,.lg-h.t-veteran span{color:#06303b}.lg-h.t-ultra{background:#22c55e}.lg-h.t-ultra b,.lg-h.t-ultra span{color:#03230f}.lg-h.t-legend{background:#facc15}.lg-h.t-legend b,.lg-h.t-legend span{color:#2a2000}.lg-h.t-superstar{background:#a855f7}.lg-h.t-superstar b,.lg-h.t-superstar span{color:#fff}.lg-h.t-specialist{background:#f97316}.lg-h.t-specialist b,.lg-h.t-specialist span{color:#2b1100}.lg-h.t-ultra,.lg-h.t-legend,.lg-h.t-superstar,.lg-h.t-specialist{padding:9px 14px;border-radius:6px}.lg-h.t-pro{background:#000;border:1px solid #2a2a2a}.lg-h.t-pro b,.lg-h.t-pro span{color:#fff}.lg-e{color:var(--dim2);padding:10px 0;font-size:13px}`;document.head.appendChild(css);const css2=document.createElement('style');css2.textContent=`.lh-sec{margin-top:40px}.lh-sec h2{font:800 24px var(--disp);letter-spacing:.04em;text-transform:uppercase;margin:2px 0 4px}.lh-sec .sb{font-size:12px;color:var(--dim);margin-bottom:12px}.lh-vb{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}.lh-v{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px 14px;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden}.lh-v::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--amber)}.lh-v .se{font:800 22px var(--disp);color:var(--amber);min-width:34px}.lh-v .w{flex:1;min-width:0}.lh-v .w b{display:block;font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lh-v .w small{font-size:10.5px;color:var(--dim)}.lh-v .sc{font:700 15px var(--disp);color:var(--text);text-align:right}.lh-v .sc small{display:block;font:500 9px var(--body);color:var(--dim2)}.lh-aw{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}.lh-s{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px 14px}.lh-s>b{display:block;font:800 18px var(--disp);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}.lh-r{display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--line);font-size:12px;cursor:pointer;text-align:left;width:100%;background:none;color:var(--text);font-family:var(--body)}.lh-r:first-of-type{border-top:0}.lh-r i{width:8px;height:8px;border-radius:50%;flex:none}.lh-r .c{font:700 9px var(--mono);letter-spacing:.1em;color:var(--dim);min-width:38px}.lh-r b{flex:1;min-width:0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lh-r:hover b{color:var(--amber)}`;document.head.appendChild(css2);
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
let view=function(){
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

/* Past Victory Bowls and awards, built from the league's own season data (playoff brackets + award winners). */
function history(){
  const ses=(window.SEASONS&&SEASONS.length?SEASONS:[S.season]).map(Number).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>b-a);
  const vb=ses.map(se=>{
    const P=window.rbxPlayoffs?rbxPlayoffs(se):null,rs=((P&&P.rounds)||[]).filter(r=>r.games.length),last=rs[rs.length-1];
    if(!last)return null;const g=last.games.length===1?last.games[0]:null;if(!g)return null;
    const w=poWinner(g);if(!w)return null;const l=w===g.a?g.b:g.a,ws=w===g.a?g.sa:g.sb,ls=w===g.a?g.sb:g.sa;
    return {se,w,l,ws,ls,round:last.name};
  }).filter(Boolean);
  const vbH=vb.length?`<div class="lh-vb">${vb.map(x=>{const t=TEAMS[x.w];return `<div class="lh-v"><span class="se">S${x.se}</span>${t?badge(t.ab,x.w,'md'):''}<div class="w"><b>${esc(x.w)}</b><small>${esc(x.round||'Victory Bowl')}${x.l?' · def. '+esc(x.l):''}</small></div>${x.ws!=null&&x.ls!=null?`<div class="sc">${x.ws}-${x.ls}<small>FINAL</small></div>`:''}</div>`}).join('')}</div>`:'<div class="lg-e">No Victory Bowl results have been recorded yet. Set up a playoff bracket for a season in Admin → Playoffs and its champion will show here.</div>';
  const aw=ses.map(se=>({se,list:computeAwards(se).filter(a=>!a.empty&&a.p)})).filter(x=>x.list.length);
  const awH=aw.length?`<div class="lh-aw">${aw.map(x=>`<div class="lh-s"><b>Season ${x.se}</b>${x.list.map(a=>`<button class="lh-r" data-player="${esc(a.p.name)}"><i style="background:${esc(a.d.color||'#f2b632')}"></i><span class="c">${esc(a.d.code)}</span><b>${esc(a.p.name)}</b></button>`).join('')}</div>`).join('')}</div>`:'<div class="lg-e">No award winners yet.</div>';
  return `<section class="lh-sec"><h2>Victory Bowl history</h2><div class="sb">Every season's champion.</div>${vbH}</section><section class="lh-sec"><h2>Award history</h2><div class="sb">Award winners from every season.</div>${awH}</section>`;
}
const viewMain=view;view=function(){return viewMain()+history()};
Object.assign(window.XV=window.XV||{},{legacy:view});
pull();setInterval(()=>{if(document.visibilityState==='visible')pull()},60000);
})();

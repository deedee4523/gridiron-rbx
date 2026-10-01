/* Legacy page: live from the Google Sheet (server refreshes it every 5 minutes; this page re-checks every minute).
   The table is drawn to match the league's legacy spreadsheet: coloured tier banners, a rank swatch, and one tinted box per stat. */
(function(){
const L={d:null,sig:'',err:'',q:''};
/* tier look (banner fill, banner text, rank swatch) */
const TS={
 'HALL OF FAME':{bg:'#ffec20',fg:'#b8a912',label:'HALL OF FAME (INDUCTEES)'},
 'ULTRA':{bg:'#bdffba',fg:'#74ad72'},
 'LEGEND':{bg:'#fed36f',fg:'#b18f3d'},
 'SUPERSTAR':{bg:'#8bdbea',fg:'#5e9aa5'},
 'SPECIALIST':{bg:'#ff9d9d',fg:'#a45d5d'},
 'VETERAN':{bg:'#7ae2ff',fg:'#32869f'},
 'ALLPRO':{bg:'#fba2f9',fg:'#a65ba5'},
 'PRO':{bg:'#110a0a',fg:'#ffffff'},
 'UNRANKED':{bg:'#e3e6e3',fg:'#8a8f8a'}
};
/* stat columns, same order as the sheet: UFB MVP PA VA 1ST 2ND CROWNS TITLES CC FO */
const CS=[
 {bg:'#ff9797',fg:'#c66868',xp:50},{bg:'#ff9797',fg:'#c66868',xp:50},
 {bg:'#ffec8b',fg:'#c8b557',xp:32},{bg:'#ffec8b',fg:'#c8b557',xp:50},
 {bg:'#ffca00',fg:'#d7ad07',xp:16},{bg:'#cacaca',fg:'#9c9c9c',xp:8},
 {bg:'#cacaca',fg:'#9c9c9c',xp:32},{bg:'#cacaca',fg:'#9c9c9c',xp:16},
 {bg:'#ffec8b',fg:'#cdba5a',xp:25},{bg:'#e9e9e9',fg:'#c4c4c4',xp:50}
];
const font=document.createElement('link');font.rel='stylesheet';font.href='https://fonts.googleapis.com/css2?family=Roboto:wght@500;700;900&display=swap';document.head.appendChild(font);
const css=document.createElement('style');css.textContent=`
.lgs{background:#f8faf8;color:#000;border-radius:12px;padding:18px 16px 24px;margin-top:14px;overflow-x:auto;font-family:'Roboto','Inter',system-ui,sans-serif}
.lgs-in{min-width:740px;max-width:900px;margin:0 auto}
.lgs-g{display:grid;grid-template-columns:24px minmax(120px,1fr) 66px repeat(10,minmax(40px,52px));gap:5px 6px;align-items:center}
.lgs-g>*{min-width:0}
.lgs-lab{font-weight:700;font-size:11px;text-align:center;color:#000}
.lgs-score-lab{font-weight:900;font-size:15px;text-align:center;color:#e06666}
.lgs-xp{font-weight:700;font-size:9px;text-align:center;color:#000;white-space:nowrap}
.lgs-h{font-weight:700;font-size:10px;letter-spacing:-.02em;text-align:center;padding:6px 0;border-radius:3px;color:#000;white-space:nowrap;overflow:hidden}
.lgs-banner{grid-column:1/-1;text-align:center;font-weight:700;font-size:17px;letter-spacing:.01em;padding:8px 6px;margin:16px 0 8px;border-radius:2px}
.lgs-sw{grid-column:1;align-self:stretch;border-radius:2px;min-height:22px}
.lgs-n{background:#fff;border:1px dashed #bdbdbd;border-radius:3px;text-align:center;font-weight:700;font-size:12px;padding:3px 6px;height:22px;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lgs-n[data-player]{cursor:pointer}.lgs-n[data-player]:hover{border-color:#000}
.lgs-s{background:#fff;border:1px dashed #bdbdbd;border-radius:3px;text-align:center;font-weight:700;font-size:14px;color:#e06666;height:22px;line-height:20px}
.lgs-c{border:1px dashed rgba(0,0,0,.28);border-radius:3px;text-align:center;font-weight:700;font-size:11px;height:22px;line-height:20px}
.lgs-e{color:var(--dim2);padding:10px 0;font-size:13px}
.lgs-bar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.lgs-bar input{max-width:260px;background:var(--panel2);border:1px solid var(--line2);color:var(--text);border-radius:6px;padding:9px 12px;font:13px var(--body)}
`;document.head.appendChild(css);
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
const ESC=s=>esc(String(s==null?'':s));
function sheet(d){
  const q=L.q.trim().toLowerCase(),known=n=>window.PBY&&PBY[n];
  const head=`<div class="lgs-g"><span class="lgs-lab">rank</span><span class="lgs-lab">player</span><span class="lgs-score-lab">score</span>${CS.map((c,i)=>`<span class="lgs-xp">${c.xp} XP</span>`).join('')}</div>
   <div class="lgs-g" style="margin-top:3px"><span></span><span></span><span></span>${d.cols.map((c,i)=>`<span class="lgs-h" style="background:${(CS[i]||CS[9]).bg}">${ESC(c)}</span>`).join('')}</div>`;
  const tiers=d.tiers.map(t=>{
    const st=TS[t.name]||TS.UNRANKED,list=q?t.players.filter(p=>p.name.toLowerCase().includes(q)):t.players;
    if(q&&!list.length)return '';
    if(t.name==='UNRANKED'&&!list.length)return '';
    const label=st.label||(t.name+(t.min>0&&t.min<1e9?' ('+t.min+'+)':''));
    const rows=list.map(p=>`<span class="lgs-n" ${known(p.name)?`data-player="${ESC(p.name)}"`:''} title="Rank #${p.rank}">${ESC(p.name)}</span><span class="lgs-s">${p.score}</span>${p.s.map((v,i)=>{const c=CS[i]||CS[9];return `<span class="lgs-c" style="background:${c.bg};color:${c.fg}">${v}</span>`}).join('')}`).join('');
    return `<div class="lgs-banner" style="background:${st.bg};color:${st.fg}">${ESC(label)}</div>`+
      (list.length?`<div class="lgs-g"><span class="lgs-sw" style="grid-row:1 / span ${list.length};background:${st.bg}"></span>${rows}</div>`:'');
  }).join('');
  return head+tiers;
}
function view(){
  pull();const d=L.d;
  const head=pageHead('All-time standings','Legacy','Career legacy score for every player, pulled live from the league sheet.');
  if(!d)return head+(L.err?`<p class="lgs-e" style="color:var(--red)">Could not load Legacy: ${ESC(L.err)} <button class="chip" onclick="lgRetry()" style="margin-left:8px">Try again</button></p>`:'<p class="lgs-e">Loading legacy…</p>');
  const tot=d.tiers.reduce((n,t)=>n+t.players.length,0);
  const ago=d.at?Math.max(1,Math.round((Date.now()-d.at)/60000))+' min ago':'not yet';
  const src=d.source&&d.source.label?' · '+ESC(d.source.label):'';
  const err=d.error?`<div class="lgs-e" style="color:var(--red)">${tot?'Last refresh failed, showing the last good data: ':'Could not read the legacy data: '}${ESC(d.error)}</div>`:'';
  if(!tot)return head+err+'<div class="lgs-e">No legacy data yet. An admin can add a Google Sheets / Docs link or upload an .ods file in Admin → Legacy.</div>';
  return head+err+`<div class="lgs-bar"><input id="lg_q" type="search" placeholder="Search players…" value="${ESC(L.q)}" oninput="lgSearch(this.value)"><span class="lgs-e" style="padding:0">${tot} players · updated ${ago}${src}</span></div><div class="lgs"><div class="lgs-in" id="lgs_body">${sheet(d)}</div></div>`;
}
window.lgSearch=v=>{L.q=v;const b=document.getElementById('lgs_body');if(b&&L.d)b.innerHTML=sheet(L.d)};
Object.assign(window.XV=window.XV||{},{legacy:view});
pull();setInterval(()=>{if(document.visibilityState==='visible')pull()},60000);
})();

/* UFF extra pages (Arcade, Trade Machine, Transactions, Compare, Achievements, Playoffs bracket, Watchlist, Elite).
   Loaded after the main script; registers views in window.XV, which route() merges in. */
(function(){
const DBX=()=>(window.rbxDB?rbxDB():{})||{};
const season=()=>(typeof CUR!=='undefined'&&CUR)||S.season;
const I=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC={
  spark:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  scale:'<path d="M12 3v18M6 21h12M4 7h16M4 7l-2.5 7a3 3 0 005 0zM20 7l-2.5 7a3 3 0 005 0z"/>',
  swap:'<path d="M17 3l4 4-4 4M21 7H8M7 21l-4-4 4-4M3 17h13"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.8a3.5 3.5 0 010 6.4M18 14.5a6.5 6.5 0 013.5 5.5"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  wallet:'<path d="M3 7a2 2 0 012-2h13v4M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
  filter:'<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  crown:'<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  login:'<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/>'
};
if(typeof DI!=='undefined'){DI.eye=IC.eye;DI.swap=IC.swap}
const css=document.createElement('style');
css.textContent=`
.xh{text-align:center;padding:30px 0 26px}.xh.l{text-align:left}
.xh .ey{display:inline-flex;align-items:center;gap:8px;font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--dim)}
.xh .ey svg{width:15px;height:15px;color:var(--amber)}
.xh h1{font-family:var(--disp);font-weight:800;font-size:clamp(40px,7vw,58px);line-height:1;letter-spacing:-.01em;text-transform:uppercase;margin-top:10px}
.xh h1 em{font-style:normal;background:linear-gradient(90deg,var(--amber),var(--blue2));-webkit-background-clip:text;background-clip:text;color:transparent}
.xh p{font-size:13px;color:var(--dim);margin-top:8px}
.xw{max-width:860px;margin:0 auto}.xw.n{max-width:770px}
.xp{background:var(--panel);border:1px solid var(--line);border-radius:10px;min-width:0;overflow:hidden}
.xp-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 18px;border-bottom:1px solid var(--line);font-family:var(--disp);font-weight:800;font-size:15px;letter-spacing:.01em;text-transform:uppercase}
.xp-h>span{display:flex;align-items:center;gap:8px}.xp-h svg{width:16px;height:16px;color:var(--amber)}
.xp-h .pill{font:600 10px var(--body);letter-spacing:0;text-transform:none;background:#1c2028;border-radius:5px;padding:3px 7px;color:var(--text)}
.tf{display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line)}.tf:last-child{border-bottom:0}
.tf .av{width:36px;height:36px;border-radius:50%;flex:none;background:var(--line);object-fit:cover;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--dim)}
.tf .mb{min-width:0;flex:1}.tf .hd{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.tf .hd b{font-size:13px}
.tf .bot{font-size:9px;font-weight:700;letter-spacing:.08em;padding:2px 5px;border-radius:4px;background:var(--amber);color:#111;align-self:center}
.tf .ts{font-size:10px;color:var(--dim)}.tf .bd{font-size:13px;line-height:1.5;margin-top:3px;word-break:break-word}.tf .bd a,.tf .em a{color:var(--amber)}
.tf .em{margin-top:8px;border-left:4px solid var(--dim);background:rgba(255,255,255,.04);border-radius:6px;padding:10px 12px;max-width:560px;font-size:12.5px;line-height:1.5;word-break:break-word}
.tf .em .et{font-weight:700;font-size:13px;margin-bottom:3px}.tf .em .ef{margin-top:6px}.tf .em .ef b{display:block;font-size:11px;color:var(--dim)}.tf .em .ft{margin-top:8px;font-size:10px;color:var(--dim)}
.tf img.pic{display:block;margin-top:8px;max-width:100%;max-height:300px;border-radius:6px}.tf .fl{display:block;margin-top:6px;font-size:12px;color:var(--amber)}
.tfs{display:flex;align-items:center;gap:8px;margin:-6px 0 14px;font-size:10px;color:var(--dim)}.tfs i{width:7px;height:7px;border-radius:50%;background:#2ecc71;display:inline-block}
.txc{display:inline-flex;align-items:center;gap:5px;vertical-align:middle;white-space:nowrap}
.txc .badge.xs{width:20px;height:20px;font-size:8px}.txc .badge.pf{border-radius:50%}
.xp-b{padding:14px 18px}.xp-e{padding:26px 16px;text-align:center;font-size:12px;color:var(--dim)}
.xl{display:block;font-size:9.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin:0 0 7px}
.xsel,.xin{width:100%;background:var(--panel);border:1px solid var(--line2);border-radius:6px;color:var(--text);font:500 12px var(--body);padding:10px 12px}
.xin{padding-left:34px}
.xsearch{position:relative}.xsearch svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--dim)}
.xdrop{position:absolute;left:0;right:0;top:100%;margin-top:4px;background:#0f1218;border:1px solid var(--line2);border-radius:8px;z-index:20;max-height:240px;overflow:auto;box-shadow:0 16px 36px rgba(0,0,0,.6)}
.xdrop button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;text-align:left;font-size:12px}.xdrop button:hover{background:rgba(255,255,255,.05)}
.xdrop small{color:var(--dim2);margin-left:auto}
.xbtn{display:inline-flex;align-items:center;gap:9px;background:linear-gradient(90deg,#a4c815,#1e8fff);color:#fff;font:700 12px var(--body);padding:11px 26px;border-radius:6px;letter-spacing:.02em}
.xbtn svg{width:14px;height:14px}.xbtn:hover{filter:brightness(1.1)}
/* arcade */
.ax{max-width:744px;margin:0 auto;padding-top:34px}
.ax-h{display:flex;align-items:center;gap:12px;margin-bottom:26px}.ax-h i{width:30px;height:30px;border-radius:8px;background:#19b561;display:grid;place-items:center;color:#fff}.ax-h i svg{width:17px;height:17px}
.ax-h b{display:block;font:600 22px var(--body)}.ax-h small{font-size:10.5px;color:var(--dim)}
.ax-g{display:grid;grid-template-columns:1fr 235px;gap:19px;margin-bottom:30px;align-items:start}
.mk{border:1px solid var(--line);border-radius:10px;background:#0a0c10;padding:12px;margin-bottom:12px}
.mk-t{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;margin-bottom:10px}.mk-t code{font:400 8px var(--code);color:var(--dim2)}
.mk-t .st{margin-left:auto;font:700 8px var(--body);letter-spacing:.05em;padding:3px 8px;border-radius:99px;background:rgba(30,110,255,.16);color:#6ea4ff;border:1px solid rgba(30,110,255,.35);text-transform:uppercase}
.mk-o{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mk-o div{border-radius:6px;padding:11px 10px;border:1px solid}.mk-o .y{background:#0c231a;border-color:#15432f}.mk-o .n{background:#2a1017;border-color:#4a1a24}
.mk-o span{font-size:9px;color:#9ac7b2}.mk-o .n span{color:#d2959f}.mk-o b{display:block;font:700 19px var(--body);margin:4px 0}.mk-o small{font-size:7.5px;color:var(--dim2)}
.mk-f{display:flex;justify-content:space-between;font-size:8px;color:var(--dim2);margin-top:9px}.mk-f .w{color:#36d189}
.ax-note{font-size:8.5px;color:var(--dim);margin-top:2px}.ax-note code{font:400 8px var(--code);background:#1a1d24;border-radius:3px;padding:2px 5px;color:var(--text)}
.lbrow{display:flex;align-items:center;gap:8px;font-size:11px;padding:6px 0}.lbrow b{margin-left:auto;color:#36d189;font-size:10px}
/* achievements */
.acl{background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden;max-height:410px;display:flex;flex-direction:column}
.acl h4{font:800 11px var(--disp);letter-spacing:.04em;text-transform:uppercase;padding:14px 16px;border-bottom:1px solid var(--line)}
.acl div{overflow:auto;padding:5px}.acl button{display:flex;gap:9px;align-items:center;width:100%;padding:8px;border-radius:6px;text-align:left;border:1px solid transparent}
.acl button b{display:block;font-size:11px}.acl button small{font-size:9px;color:var(--dim2)}
.acl button.on{background:rgba(255,214,10,.12);border-color:#4f5f10}
.ac-h{display:flex;align-items:center;gap:16px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px}
.ac-h .ring{margin-left:auto;width:66px;height:66px;border-radius:50%;display:grid;place-items:center;font:800 18px var(--disp);background:conic-gradient(var(--amber) calc(var(--p)*1%),#1c2028 0)}
.ac-h .ring span{width:54px;height:54px;border-radius:50%;background:var(--panel);display:grid;place-items:center}
.ac-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.ac-tabs button{font-size:11px;font-weight:600;padding:7px 14px;border-radius:99px;background:#15181f;color:var(--text)}.ac-tabs button.on{background:var(--amber);color:#10140a}
.ac-g{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ac{display:flex;gap:11px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
.ac i{width:34px;height:34px;border-radius:8px;background:#1a1d24;display:grid;place-items:center;color:var(--dim2);flex:none}.ac i svg{width:15px;height:15px}
.ac b{font:700 12px var(--body)}.ac small{display:block;font-size:10px;color:var(--dim2)}
.ac .bar{height:3px;background:#1c2028;border-radius:3px;margin:9px 0 4px;overflow:hidden}.ac .bar u{display:block;height:100%;background:var(--amber)}
.ac.done{border-color:#4f5f10}.ac.done i{background:var(--amber);color:#10140a}
.ac.lk{opacity:.72}
/* trade */
.tm{display:grid;grid-template-columns:1fr 1fr;gap:26px;max-width:864px;margin:0 auto}
.tm .rs{max-height:260px;overflow:auto}
.tmp{display:flex;align-items:center;gap:10px;width:100%;padding:8px 14px;text-align:left;border-top:1px solid var(--line);cursor:grab}.tmp:hover{background:rgba(255,255,255,.04)}
.tmp b{font-size:12px}.tmp small{margin-left:auto;font-size:10px;color:var(--dim2)}
.dz{margin:10px;border:1px dashed var(--line2);border-radius:8px;min-height:60px;padding:6px;display:flex;flex-direction:column;justify-content:center}
.dz.over{border-color:var(--amber);background:rgba(255,214,10,.05)}.dz .ph{text-align:center;font-size:11px;color:var(--dim)}
.tm-an{max-width:864px;margin:26px auto 0}
.an{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:16px}.an b{font:800 26px var(--disp)}
.vd{padding:14px 18px;border-top:1px solid var(--line);font-size:13px}
/* compare */
.cmp{max-width:864px;margin:0 auto;position:relative}.cmp-in{display:grid;gap:20px;max-width:423px}
.vsb{position:absolute;left:629px;top:12px;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--amber),var(--blue2));color:#10140a;font:800 14px var(--disp);display:grid;place-items:center}
.cm{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:18px}
.cmr{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;padding:9px 18px;border-top:1px solid var(--line);font-size:13px;align-items:center}.cmr span{text-align:center;font-size:10px;color:var(--dim);letter-spacing:.1em}.cmr b:last-child{text-align:right}.cmr .win{color:var(--amber)}
/* playoffs bracket */
.pb{max-width:640px;margin:0 auto;display:grid;gap:16px}
.pb-h{display:flex;align-items:center;gap:14px;padding:24px 0 6px;max-width:640px;margin:0 auto}
.pb-h img{width:58px;height:58px;border-radius:10px;border:1px solid #1e8fff;padding:3px;background:#09132b}
.pb-s{background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.pb-s>header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
.pb-s>header svg{width:14px;height:14px;color:var(--amber)}.pb-s>header b{font:800 14px var(--disp)}.pb-s>header small{display:block;font-size:9px;color:var(--dim2)}
.pb-s .tags{margin-left:auto;display:flex;gap:6px}.pb-s .tag{font:700 8px var(--body);padding:3px 7px;border-radius:4px;background:#1c2028}.pb-s .tag.a{background:rgba(30,110,255,.2);color:#6ea4ff}.pb-s .tag.v{background:rgba(150,80,230,.25);color:#b98aff}
.pb-gr{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 14px;padding:16px}.pb-gr.c2{grid-template-columns:repeat(2,1fr)}
.pb-g h6{font:600 8px var(--body);letter-spacing:.09em;color:var(--dim2);text-transform:uppercase;margin-bottom:6px}
.pb-t{display:flex;align-items:center;gap:7px;border:1px dashed var(--line2);border-radius:6px;padding:7px 8px;margin-bottom:5px;font-size:10px;color:var(--dim2);background:#0d0f14}
.pb-t.f{border-style:solid;color:var(--text)}.pb-t.w{border-color:var(--amber)}.pb-t.l{opacity:.55}
.pb-t .q{width:18px;height:18px;border-radius:5px;background:#1c2028;display:grid;place-items:center;font-size:8px}.pb-t b{margin-left:auto}
.ufb{text-align:center;padding:16px 16px 22px}.ufb h3{font:800 14px var(--disp);letter-spacing:.03em}.ufb .wk{display:inline-block;background:var(--amber);color:#10140a;font:700 8px var(--body);padding:3px 8px;border-radius:4px;margin:8px 0 14px}
.ufb .cup{width:120px;height:120px;margin:10px auto 14px;border-radius:26px;box-shadow:0 0 50px rgba(255,214,10,.3),0 0 90px rgba(30,143,255,.2);background:#09132b url(logo.png) center/78% no-repeat;border:1px solid #1e8fff}
.ufb .slot{max-width:256px;margin:0 auto;text-align:left}
.fmt{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:16px}.fmt div{border:1px solid var(--line2);border-radius:8px;padding:11px;font-size:9px;color:var(--dim)}.fmt b{display:block;font:800 11px var(--disp);color:#1e8fff;margin-bottom:3px}
.fmt div:nth-child(2){border-color:#3c2868;background:rgba(150,80,230,.08)}.fmt div:nth-child(2) b{color:#b98aff}.fmt div:nth-child(3){border-color:#4f5f10;background:rgba(255,214,10,.06)}.fmt div:nth-child(3) b{color:var(--amber)}
/* more menu grid */
.dock .menu{min-width:0;width:300px;right:-56px;grid-template-columns:repeat(3,1fr);gap:2px;padding:10px}
.dock .menu.open{display:grid}
.dock .menu a{display:flex;align-items:center;gap:6px;padding:9px 8px;font-size:10.5px;font-weight:600;color:var(--dim);line-height:1.15}
.dock .menu a svg{width:12px;height:12px;flex:none;stroke-width:1.6}.dock .menu a:hover{color:var(--text);background:rgba(255,255,255,.05)}
.dock .menu a.on{color:var(--blue2)}
.dock .menu a .sp{width:12px;flex:none}
@media(max-width:700px){.acwrap{grid-template-columns:1fr!important}.acl{max-height:240px}.ax-g,.tm,.cm,.an{grid-template-columns:1fr}.ac-g{grid-template-columns:1fr}.pb-gr{grid-template-columns:1fr}.vsb{display:none}.dock .menu{width:min(300px,86vw);right:-70px}.cmp-in{max-width:none}}
`;
document.head.appendChild(css);

const hd=(ic,ey,w,g,sub,cls='')=>`<div class="xh ${cls}"><span class="ey">${I(IC[ic])}${esc(ey)}</span><h1>${w?esc(w)+' ':''}<em>${esc(g)}</em></h1><p>${esc(sub)}</p></div>`;
const tcode=t=>(TEAMS[t]&&(TEAMS[t].code||TEAMS[t].ab))||String(t).slice(0,3).toUpperCase();
const pstat=p=>statsFor(p,season());
const fpOf=p=>n0(pstat(p).fp);

/* ---------- ARCADE ---------- */
function viewArcade(){
  const A=DBX().arcade||{},mk=A.markets||[],picks=A.picks||[],wal=A.wallets||[];
  const side=(o,cls)=>`<div class="${cls}"><span>${esc(o.code||o.name||'')}</span><b>${Math.round(o.price==null?50:o.price)}¢</b><small>${Math.round(o.price==null?50:o.price)}% chance · ${n0(o.shares)} shares out</small></div>`;
  return `<div class="ax"><div class="ax-h"><i>${I(IC.spark)}</i><span><b>UFF Arcade</b><small>Pick Play + UFFmarket. Play in Discord, watch standings here.</small></span></div>
  <div class="ax-g"><section class="xp"><div class="xp-h"><span>${I('<path d="M4 12h16M4 6h16M4 18h10"/>')}Pick Play</span></div><div class="xp-e" style="padding:34px 16px">${A.slate?esc(A.slate):'No active slate right now. Check back when the next week opens.'}</div></section>
  <section class="xp"><div class="xp-h"><span>${I(IC.trophy)}Picks Leaderboard</span></div><div class="xp-b">${picks.length?picks.map(x=>`<div class="lbrow"><span>${esc(x.name)}</span><b>${n0(x.pts)}</b></div>`).join(''):'<div class="xp-e">No picks yet.</div>'}</div></section></div>
  <div class="ax-g"><section class="xp"><div class="xp-h" style="justify-content:flex-start;font:600 13px var(--body);text-transform:none"><span>${I(IC.trend)}UFFmarket <small style="color:var(--dim2);font-size:9px;margin-left:6px">prediction market</small></span></div>
   <div class="xp-b">${mk.map(m=>`<div class="mk"><div class="mk-t"><code>${esc(m.id||'')}</code>${esc(m.title||'')}<span class="st">${esc(m.status||'open')}</span></div><div class="mk-o">${side(m.a||{},'y')}${side(m.b||{},'n')}</div><div class="mk-f"><span>volume: ${n0(m.volume)}¢</span><span>${n0(m.trades)} trades</span>${m.winner?`<span class="w">winner: ${esc(m.winner)}</span>`:'<span></span>'}</div></div>`).join('')||'<div class="xp-e">No markets yet.</div>'}
   <p class="ax-note">Trade in Discord with <code>/predict buy</code> / <code>/predict sell</code>. Claim a daily 100¢ with <code>/predict daily</code>.</p></div></section>
  <section class="xp"><div class="xp-h"><span>${I(IC.wallet)}Wallet Leaderboard</span></div><div class="xp-b">${wal.length?wal.map(x=>`<div class="lbrow"><span>${esc(x.name)}</span><b>${n0(x.bal)}¢</b></div>`).join(''):'<div style="font-size:11px;color:var(--dim)">No wallets yet.</div>'}</div></section></div></div>`;
}

/* ---------- TRADE MACHINE ---------- */
const TM={a:'',b:'',ra:[],rb:[],done:false};
const roster=t=>PLAYERS.filter(p=>p.team===t).sort((x,y)=>fpOf(y)-fpOf(x));
function tmDraw(){const el=$('#tmroot');if(el)el.innerHTML=tmHtml()}
function tmHtml(){
  const T=Object.keys(TEAMS);
  if(!TM.a||!TEAMS[TM.a])TM.a=T[0]||'';
  if(!TM.b||!TEAMS[TM.b]||TM.b===TM.a)TM.b=T.find(t=>t!==TM.a)||'';
  const col=(me,other,rec,k)=>{const r=roster(me);return `<div>
   <label class="xl">Team ${k==='ra'?1:2}</label>
   <select class="xsel" data-tmsel="${k==='ra'?'a':'b'}">${T.map(t=>`<option ${t===me?'selected':''} value="${esc(t)}">${esc(t)}</option>`).join('')}</select>
   <section class="xp" style="margin-top:14px"><div class="xp-h"><span style="color:${k==='ra'?'#f0a0a8':'#8ed2ff'}">${esc(me)} roster</span><span class="pill">${r.length} players</span></div>
    <div class="rs">${r.map(p=>`<button class="tmp" draggable="true" data-tmdrag="${esc(p.name)}" data-from="${k}" data-tmadd="${esc(p.name)}">${badge(p.ini,p.name,'sm')}<b>${esc(p.name)}</b><small>${p.pos} · ${fpOf(p).toFixed(1)}</small></button>`).join('')||'<div class="xp-e">No players on this team</div>'}</div></section>
   <section class="xp" style="margin-top:14px"><div class="xp-h"><span>${esc(tcode(me))} receives</span></div>
    <div class="dz" data-tmdrop="${k}">${(k==='ra'?TM.ra:TM.rb).map(n=>`<button class="tmp" style="border:0" data-tmrm="${esc(n)}" data-side="${k}">${badge(PBY[n].ini,n,'sm')}<b>${esc(n)}</b><small>${PBY[n].pos} · ${fpOf(PBY[n]).toFixed(1)} ✕</small></button>`).join('')||'<div class="ph">Drag players here</div>'}</div></section></div>`};
  let an='';
  if(TM.done){
    const sum=l=>+l.reduce((a,n)=>a+fpOf(PBY[n]),0).toFixed(1),ga=sum(TM.ra),gb=sum(TM.rb),d=+(ga-gb).toFixed(1);
    const who=d===0?'This trade is dead even.':`${esc(d>0?TM.a:TM.b)} wins on fantasy points by ${Math.abs(d)}.`;
    an=`<section class="xp tm-an"><div class="xp-h"><span>${I(IC.spark)}Trade analysis</span></div>
     <div class="an"><div><small class="xl">${esc(tcode(TM.a))} receives</small><b>${ga.toFixed(1)} FP</b><div style="font-size:11px;color:var(--dim);margin-top:4px">${TM.ra.map(esc).join(', ')||'Nothing'}</div></div>
     <div><small class="xl">${esc(tcode(TM.b))} receives</small><b>${gb.toFixed(1)} FP</b><div style="font-size:11px;color:var(--dim);margin-top:4px">${TM.rb.map(esc).join(', ')||'Nothing'}</div></div></div>
     <div class="vd">${TM.ra.length||TM.rb.length?who:'Add players to at least one side.'}<div style="font-size:10px;color:var(--dim2);margin-top:4px">Based on this season's fantasy points only.</div></div></section>`;
  }
  return `<div class="tm">${col(TM.a,TM.b,TM.ra,'ra')}${col(TM.b,TM.a,TM.rb,'rb')}</div>
   <div style="text-align:center;margin-top:18px"><button class="xbtn" data-tmgo>${I(IC.spark)}Analyze Trade</button></div>${an}`;
}
function viewTrade(){return hd('scale','Build & Analyze','Trade','Machine','Drag players to build trades and see instant analysis')+`<div id="tmroot">${tmHtml()}</div>`}

/* ---------- TRANSACTIONS ---------- */
/* Shows every message from the Discord transactions channel (people, bots, webhooks; read by the server's bot) plus anything added in Admin that is not already in that channel. */
const TX={team:''};
const TXF={d:null,at:0,busy:false};
const txFmt=t=>esc(t||'').replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/(https?:\/\/[^\s<&]+(?:&amp;[^\s<&]+)*)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g,'<br>');
const txRich=t=>txChips(t||'',[],txFmt);
const txWhen=ms=>{const d=new Date(ms);return isNaN(d)?'':d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})};
const txText=m=>[m.content,...(m.embeds||[]).flatMap(e=>[e.title,e.description,...(e.fields||[]).map(f=>f.name+' '+f.value)])].join(' ');
function txItems(){
  const feed=(TXF.d&&TXF.d.on)?TXF.d.messages:[],db=(DBX().transactions||[]);
  const seen=new Set();feed.forEach(m=>{seen.add(String(m.content||'').trim().toLowerCase());(m.embeds||[]).forEach(e=>seen.add(String(e.description||'').trim().toLowerCase()))});
  const own=db.filter(x=>!seen.has(String(x.text||'').trim().toLowerCase())).map(x=>({k:'site',x,ms:x.at||Date.parse(x.date)||0}));
  const all=[...feed.map(m=>({k:'dc',m,ms:Date.parse(m.at)||0})),...own].sort((a,b)=>b.ms-a.ms),T=(TX.team||'').toLowerCase();
  return all.filter(i=>!T||(i.k==='dc'?txText(i.m).toLowerCase().includes(T):(i.x.team===TX.team||i.x.team2===TX.team)));
}
function txRow(i){
  if(i.k==='site'){const x=i.x;return `<div class="dp-row" style="padding:12px 16px;border-bottom:1px solid var(--line)"><span class="w"><b style="white-space:normal">${txChips(x.text||'',x.players)}</b><small>${esc(x.type||'')}${x.team?' · '+txTeams(x):''} · ${esc(x.date||'')}</small></span></div>`}
  const m=i.m,a=m.author||{};
  const av=a.avatar?`<img class="av" src="${esc(a.avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`:`<span class="av">${esc((a.name||'?').slice(0,2).toUpperCase())}</span>`;
  const em=(m.embeds||[]).map(e=>`<div class="em" style="border-left-color:${esc(e.color||'#7d8590')}">${e.title?`<div class="et">${e.url?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${txChips(e.title)}</a>`:txChips(e.title)}</div>`:''}${e.description?`<div>${txRich(e.description)}</div>`:''}${(e.fields||[]).map(f=>`<div class="ef"><b>${esc(f.name)}</b>${txRich(f.value)}</div>`).join('')}${e.image?`<img class="pic" src="${esc(e.image)}" alt="" loading="lazy">`:''}${e.footer?`<div class="ft">${esc(e.footer)}</div>`:''}</div>`).join('');
  const fl=(m.files||[]).map(f=>f.image?`<img class="pic" src="${esc(f.url)}" alt="${esc(f.name)}" loading="lazy">`:`<a class="fl" href="${esc(f.url)}" target="_blank" rel="noopener">📎 ${esc(f.name)}</a>`).join('');
  return `<div class="tf">${av}<div class="mb"><div class="hd"><b>${esc(a.name||'Unknown')}</b>${a.bot?'<span class="bot">BOT</span>':''}<span class="ts">${esc(txWhen(m.at))}${m.edited?' · edited':''}${m.forwarded?' · forwarded':''}</span></div>${m.content?`<div class="bd">${txRich(m.content)}</div>`:''}${em}${fl}</div></div>`;
}
function txBody(){
  const l=txItems(),on=TXF.d&&TXF.d.on;
  return {n:l.length,html:l.length?l.map(txRow).join(''):`<div class="xp-e" style="padding:38px"><div style="width:22px;margin:0 auto 10px;color:var(--dim)">${I(IC.swap)}</div>${on?'No messages in the Discord transactions channel yet.':(TXF.d?'No transactions yet.':'Loading…')}</div>`};
}
function txStatus(){const d=TXF.d;return d&&d.on?`<div class="tfs"><i></i>Live from Discord${d.channel?' · #'+esc(d.channel):''} · every message in the channel shows here</div>`:''}
function txRefresh(){
  if(TXF.busy)return;TXF.busy=true;
  fetch('/api/transactions-feed',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{TXF.d=j||TXF.d||{on:false,messages:[]};TXF.at=Date.now()}).catch(()=>{TXF.d=TXF.d||{on:false,messages:[]}}).then(()=>{
    TXF.busy=false;const sec=document.getElementById('txsec');if(!sec)return;
    const b=txBody();sec.innerHTML=b.html;const c=document.getElementById('txcount');if(c)c.textContent=b.n+' entries';const st=document.getElementById('txstat');if(st)st.innerHTML=txStatus()})
}
function viewTx(){
  if(!TXF.busy&&Date.now()-TXF.at>20000)txRefresh();
  const b=txBody();
  return `<div class="xw n">${hd('swap','League Activity','Trans','actions','Signings, releases, trades, offers, and coaching moves across the league.','l')}
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px"><span class="xl" style="margin:0;display:flex;align-items:center;gap:5px"><span style="width:12px;display:inline-block">${I(IC.filter)}</span>Filter</span>
   <select class="xsel" style="width:160px" data-txsel><option value="">All teams</option>${Object.keys(TEAMS).map(t=>`<option ${TX.team===t?'selected':''} value="${esc(t)}">${esc(t)}</option>`).join('')}</select><span id="txcount" style="margin-left:auto;font-size:10px;color:var(--dim)">${b.n} entries</span></div>
  <div id="txstat">${txStatus()}</div>
  <section class="xp" id="txsec">${b.html}</section></div>`;
}
/* keep the page fresh while it is open */
setInterval(()=>{if(location.hash.indexOf('#/transactions')===0&&!document.hidden)txRefresh()},30000);

/* ---------- PLAYER COMPARISON ---------- */
const CM={a:'',b:''};
const pFind=q=>{q=String(q||'').toLowerCase().trim();return q?PLAYERS.filter(p=>p.name.toLowerCase().includes(q)).slice(0,8):[]};
function cmBody(){
  const a=PBY[CM.a],b=PBY[CM.b];
  if(!a||!b)return `<section class="xp" style="margin-top:22px;max-width:864px"><div class="xp-e" style="padding:50px"><div style="width:44px;margin:0 auto 12px;color:var(--dim2)">${I(IC.users)}</div><b style="font:800 14px var(--disp);color:var(--dim)">Select Two Players</b><div style="margin-top:6px">Choose players above to see their head-to-head comparison</div></div></section>`;
  const sa=pstat(a),sb=pstat(b),keys=[...new Set([...(POSCOLS[a.pos]||[]),...(POSCOLS[b.pos]||[])])].filter(k=>sa[k]!==undefined||sb[k]!==undefined);
  const fmt=(k,v)=>v==null?'–':(CL[k]?CL[k][1](+v):v);
  return `<section class="xp" style="margin-top:22px;max-width:864px"><div class="cm"><div style="display:flex;gap:12px;align-items:center">${badge(a.ini,a.name,'lg')}<div><b>${esc(a.name)}</b><br><small style="color:var(--dim)">${a.pos} · ${esc(a.team)}</small></div></div><div style="display:flex;gap:12px;align-items:center;justify-content:flex-end;text-align:right"><div><b>${esc(b.name)}</b><br><small style="color:var(--dim)">${b.pos} · ${esc(b.team)}</small></div>${badge(b.ini,b.name,'lg')}</div></div>
   ${keys.map(k=>{const x=n0(sa[k]),y=n0(sb[k]),bad=k==='int'||k==='fum';const wa=x!==y&&(bad?x<y:x>y),wb=x!==y&&(bad?y<x:y>x);return `<div class="cmr"><b class="${wa?'win':''}">${fmt(k,sa[k])}</b><span>${esc(CL[k]?CL[k][0]:k)}</span><b class="${wb?'win':''}">${fmt(k,sb[k])}</b></div>`}).join('')}</section>`;
}
function viewCompare(){
  const box=(k,n)=>`<div><label class="xl">Player ${n}</label><div class="xsearch">${I(IC.search)}<input class="xin" data-cmq="${k}" placeholder="Search player..." value="${esc(CM[k])}" autocomplete="off"><div class="xdrop" data-cmd="${k}" hidden></div></div></div>`;
  return hd('swap','Head to Head','Player','Comparison','Select two players to compare their stats head-to-head','l').replace('class="xh l"','class="xh l" style="max-width:864px;margin:0 auto"')+
   `<div class="cmp"><div class="cmp-in">${box('a',1)}${box('b',2)}</div><div class="vsb">VS</div><div id="cmbody">${cmBody()}</div></div>`;
}

/* ---------- ACHIEVEMENTS ---------- */
const QBR=s=>{const a=n0(s.att);if(a<20)return 0;const c=v=>Math.max(0,Math.min(2.375,v));return +(((c((n0(s.comp)/a-.3)*5)+c((n0(s.yds)/a-3)*.25)+c(n0(s.td)/a*20)+c(2.375-n0(s.int)/a*25))/6)*100).toFixed(1)};
/* Achievements are CAREER totals: every season added together. */
const seasons=()=>{const l=(window.SEASONS&&window.SEASONS.length)?window.SEASONS:[season()];return [...new Set(l.map(Number))]};
const safe=f=>{try{return f()}catch(e){return 0}};
/* career total of one stat for one position's stat set (QB passing, RB rushing, WR/TE receiving, DB/LB defense). Built-in demo players only count at their own position. */
const car=(p,role,k)=>{if(!p.custom&&!(role===p.pos||(role==='WR'&&p.pos==='TE')))return 0;return safe(()=>seasons().reduce((a,se)=>a+n0(+statsFor(p,se,role)[k]||0),0))};
const careerGp=p=>safe(()=>seasons().reduce((a,se)=>a+n0(+statsFor(p,se,p.pos).gp||0),0));
const careerFp=p=>safe(()=>+seasons().reduce((a,se)=>a+(p.custom&&window.rbxFp?n0(rbxFp.tot(p,se)):n0(+statsFor(p,se).fp||0)),0).toFixed(1));
const careerRoles=p=>{if(!p.custom||!window.rbxRoles)return [p.pos];const s=new Set();seasons().forEach(se=>{try{rbxRoles(p,se).forEach(r=>s.add(r))}catch(e){}});return [...s]};
const rec=p=>car(p,'WR','rec'),isDef=p=>/DB|LB/.test(p.pos);
const roleFpSum=careerFp;
const ACH=[
 ['Scoring','Century Club','Score 100+ fantasy points',p=>careerFp(p),100,'star'],['Scoring','Double Trouble','Score 200+ fantasy points',p=>careerFp(p),200,'star'],['Scoring','Triple Threat','Score 300+ fantasy points',p=>careerFp(p),300,'star'],['Scoring','Legendary','Score 400+ fantasy points',p=>careerFp(p),400,'crown'],
 ['Passing','Gunslinger','3,000+ passing yards',p=>car(p,'QB','yds'),3000,'target'],['Passing','Air Raid','4,000+ passing yards',p=>car(p,'QB','yds'),4000,'target'],['Passing','TD Machine','25+ passing touchdowns',p=>car(p,'QB','td'),25,'bolt'],['Passing','TD King','35+ passing touchdowns',p=>car(p,'QB','td'),35,'crown'],['Passing','Precision','110+ QB Rating (20+ attempts)',p=>QBR({att:car(p,'QB','att'),comp:car(p,'QB','comp'),yds:car(p,'QB','yds'),td:car(p,'QB','td'),int:car(p,'QB','int')}),110,'target'],
 ['Rushing','1K Club','1,000+ rushing yards',p=>car(p,'RB','yds'),1000,'trend'],['Rushing','Ground Pounder','1,500+ rushing yards',p=>car(p,'RB','yds'),1500,'trend'],['Rushing','Goal Line Hero','10+ rushing TDs',p=>car(p,'RB','td'),10,'star'],['Rushing','Touchdown Terror','15+ rushing TDs',p=>car(p,'RB','td'),15,'bolt'],
 ['Receiving','Sticky Hands','1,000+ receiving yards',p=>car(p,'WR','yds'),1000,'star'],['Receiving','Elite Receiver','1,500+ receiving yards',p=>car(p,'WR','yds'),1500,'crown'],['Receiving','Red Zone Target','10+ receiving TDs',p=>car(p,'WR','td'),10,'target'],['Receiving','Chain Mover','100+ receptions',p=>rec(p),100,'trend'],
 ['Defense','Flag Puller','50+ flag pulls',p=>Math.max(car(p,'DB','tkl'),car(p,'LB','tkl')),50,'users'],['Defense','Ballhawk','5+ interceptions',p=>car(p,'DB','int'),5,'eye'],['Defense','Sack Artist','10+ sacks',p=>car(p,'LB','sack'),10,'bolt'],['Defense','QB Hunter','15+ sacks',p=>car(p,'LB','sack'),15,'target'],
 ['Special','Iron Man','Play 30+ games',p=>careerGp(p),30,'users'],['Special','Two-Way Star','Earn stats at 2+ positions',p=>careerRoles(p).length,2,'star'],['Special','Unstoppable','Score 500+ fantasy points',p=>careerFp(p),500,'crown']
];
const AC={p:'',tab:'All'};
const acDone=p=>ACH.filter(a=>safe(()=>a[3](p))>=a[4]).length;
const acPlayers=()=>PLAYERS.slice().map(p=>({p,d:acDone(p)})).sort((x,y)=>y.d-x.d||x.p.name.localeCompare(y.p.name));
function acBody(){
  const p=PBY[AC.p]||acPlayers().map(x=>x.p)[0];if(!p)return '<div class="xp-e">No players yet.</div>';
  const rows=ACH.map(a=>({a,v:safe(()=>a[3](p))})),done=rows.filter(r=>r.v>=r.a[4]).length,pct=Math.round(done/ACH.length*100);
  const cats=['All',...new Set(ACH.map(a=>a[0]))];
  return `<div class="ac-h">${badge(p.ini,p.name,'lg')}<div><b style="font:800 18px var(--disp)">${esc(p.name)}</b><div style="font:700 13px var(--body);color:var(--amber);margin-top:4px">${careerFp(p).toFixed(1)} FP <span style="font-size:10px;color:var(--text);background:#1c2028;border-radius:5px;padding:3px 8px;margin-left:8px">${done}/${ACH.length} Achievements</span></div><div style="font-size:10px;color:var(--dim2);margin-top:4px">Career totals · all seasons</div></div><div class="ring" style="--p:${pct}"><span>${pct}%</span></div></div>
  <div class="ac-tabs">${cats.map(c=>`<button class="${AC.tab===c?'on':''}" data-actab="${c}">${c}</button>`).join('')}</div>
  <div class="ac-g">${rows.filter(r=>AC.tab==='All'||r.a[0]===AC.tab).map(({a,v})=>{const ok=v>=a[4],pc=Math.min(100,Math.round(v/a[4]*100));return `<div class="ac ${ok?'done':'lk'}"><i>${I(ok?IC[a[5]]:IC.lock)}</i><div style="flex:1;min-width:0"><b>${esc(a[1])}</b><small>${esc(a[2])}</small><div class="bar"><u style="width:${pc}%"></u></div><small>${ok?'Unlocked':pc+'% complete'}</small></div></div>`}).join('')}</div>`;
}
function viewAch(){
  const L=acPlayers();
  if(!L.length)return hd('trophy','Player Milestones','Achievement','Tracker','Track player milestones and unlock achievements')+`<div style="max-width:864px;margin:0 auto"><div class="xp-e" style="text-align:center;padding:30px 10px">No players yet.<br><small style="color:var(--dim2)">Players appear here after stat sheets are added in Admin → Stat adder.</small></div></div>`;
  if(!AC.p||!PBY[AC.p])AC.p=L[0].p.name;
  return hd('trophy','Player Milestones','Achievement','Tracker','Track player milestones and unlock achievements')+
  `<div style="display:grid;grid-template-columns:202px 1fr;gap:18px;max-width:864px;margin:0 auto;align-items:start" class="acwrap"><div class="acl"><h4>Select Player</h4><div>${L.map(({p,d})=>`<button data-acp="${esc(p.name)}" class="${p.name===AC.p?'on':''}">${badge(p.ini,p.name,'sm')}<span><b>${esc(p.name)}</b><small>${d}/${ACH.length} unlocked</small></span></button>`).join('')}</div></div><div id="acbody">${acBody()}</div></div>`;
}

/* ---------- PLAYOFFS ---------- */
function viewPo(){
  const P=window.rbxPlayoffs?rbxPlayoffs(season()):null,R=((P&&P.rounds)||[]);
  const t=(nm,sc,st)=>{const T=nm&&TEAMS[nm];return `<div class="pb-t ${nm?'f '+st:''}"><span class="q">${T?badge(T.ab,nm,'xs'):'?'}</span>${nm?esc(nm):'TBD'}${sc!=null?`<b>${sc}</b>`:''}</div>`};
  const game=(lbl,g)=>{const w=g?poWinner(g):'';return `<div class="pb-g"><h6>${lbl}</h6>${t(g&&g.a,g&&g.sa,w?(w===g.a?'w':'l'):'')}${t(g&&g.b,g&&g.sb,w?(w===g.b?'w':'l'):'')}</div>`};
  const r0=(R[0]||{}).games||[],r1=(R[1]||{}).games||[],r2=(R[2]||{}).games||[];
  const L8=['QF Ridge QF Top','QF Ridge QF Bot','QF GC QF Top','QF GC QF Bot'],L4=['Ridge Championship','Grand Central Championship'];
  return `<div class="pb-h"><img src="logo.png" alt="UFF"><div><span class="ey" style="display:flex;gap:6px;font-size:8.5px;letter-spacing:.18em;color:var(--dim)">${'<span style="width:11px;color:var(--amber)">'+I(IC.trophy)+'</span>'}CHAMPIONSHIP BRACKET</span><h1 style="font:800 34px var(--disp);text-transform:uppercase;line-height:1.1">UFF <span style="background:linear-gradient(90deg,var(--amber),var(--blue2));-webkit-background-clip:text;background-clip:text;color:transparent">Playoffs</span></h1><small style="font-size:9px;color:var(--dim2)">Round of 16 · QF · SF · UFB</small></div></div>
  <div class="pb">
   <section class="pb-s"><header><span style="width:14px">${I(IC.target)}</span><div><b>ELITE 8</b><small>Quarterfinals · Top 4 per conference · Seeds 1v4, 2v3</small></div><div class="tags"><span class="tag a">Elite 8</span><span class="tag">Week 9</span></div></header><div class="pb-gr">${L8.map((l,i)=>game(l,r0[i])).join('')}</div></section>
   <section class="pb-s"><header><span style="width:14px">${I(IC.crown)}</span><div><b>F4</b><small>Semifinals · Conference Championships</small></div><div class="tags"><span class="tag v">F4</span><span class="tag">Week 10</span></div></header><div class="pb-gr c2">${L4.map((l,i)=>game(l,r1[i])).join('')}</div></section>
   <section class="pb-s"><div class="ufb"><h3>🏆 UFB · UNITED FLAG BOWL 🏆</h3><span class="wk">Week 11 · UFB</span><div class="cup"></div><div class="slot">${game('United Flag Bowl',r2[0])}</div></div></section>
   <section class="pb-s"><header><b style="font-size:12px">✦ PLAYOFF FORMAT</b></header><div class="fmt"><div><b>Elite 8</b>Quarterfinals · Week 9</div><div><b>F4</b>Semifinals · Week 10</div><div><b>UFB</b>United Flag Bowl · Week 11</div></div></section>
  </div>`;
}

/* ---------- WATCHLIST / ELITE ---------- */
const WK='uff-watch';
const wl=()=>{try{return JSON.parse(localStorage.getItem(WK)||'[]')}catch(e){return[]}};
const wlSave=l=>{try{localStorage.setItem(WK,JSON.stringify(l))}catch(e){}};
const prow=(p,x)=>`<button class="dp-row" data-player="${esc(p.name)}">${badge(p.ini,p.name,'sm')}<span class="w"><b>${pname(p)}</b><small>${p.pos} · ${esc(p.team)}</small></span><span class="v">${fpOf(p).toFixed(1)}</span>${x||''}</button>`;
function viewWatch(){
  const l=wl().filter(n=>PBY[n]);
  return `<div class="xw n">${hd('eye','Your Players','Watch','list','Follow players you care about. Saved on this device.','l')}
  <div class="xsearch" style="margin-bottom:16px">${I(IC.search)}<input class="xin" data-wlq placeholder="Add a player..." autocomplete="off"><div class="xdrop" data-wld hidden></div></div>
  <section class="xp"><div class="xp-b">${l.map(n=>`<div style="display:flex;align-items:center">${prow(PBY[n])}<button data-wlrm="${esc(n)}" style="padding:8px 12px;color:var(--dim)">✕</button></div>`).join('')||'<div class="xp-e">No players on your watchlist yet.</div>'}</div></section></div>`;
}
function viewElite(){
  const l=PLAYERS.slice().sort((a,b)=>fpOf(b)-fpOf(a)).slice(0,25);
  return `<div class="xw n">${hd('star','Top of the League','Elite','Players','The 25 highest scoring players this season.','l')}<section class="xp"><div class="xp-b">${l.map((p,i)=>`<div style="display:flex;align-items:center"><span style="width:26px;text-align:center;font-size:11px;color:var(--dim2)">${i+1}</span>${prow(p)}</div>`).join('')||'<div class="xp-e">No players yet.</div>'}</div></section></div>`;
}

window.XV={arcade:viewArcade,trade:viewTrade,transactions:viewTx,compare:viewCompare,achievements:viewAch,playoffs:viewPo,watchlist:viewWatch,elite:viewElite};
window.XT={arcade:'Arcade',trade:'Trade Machine',transactions:'Transactions',compare:'Player Comparison',achievements:'Achievements',watchlist:'Watchlist',elite:'Elite Players'};

/* ---------- events ---------- */
const dropList=(box,q,attr)=>{const r=pFind(q);box.hidden=!r.length;box.innerHTML=r.map(p=>`<button type="button" ${attr}="${esc(p.name)}">${badge(p.ini,p.name,'xs')}${esc(p.name)}<small>${p.pos} · ${esc(p.team)}</small></button>`).join('')};
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.matches('[data-cmq]')){const k=t.dataset.cmq;CM[k]='';dropList(t.parentNode.querySelector('[data-cmd]'),t.value,'data-cmpick');$('#cmbody').innerHTML=cmBody()}
  if(t.matches('[data-wlq]'))dropList(t.parentNode.querySelector('[data-wld]'),t.value,'data-wlpick');
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.matches('[data-tmsel]')){TM[t.dataset.tmsel]=t.value;TM.ra=[];TM.rb=[];TM.done=false;tmDraw()}
  if(t.matches('[data-txsel]')){TX.team=t.value;route()}
});
document.addEventListener('click',e=>{
  const t=e.target,c=s=>t.closest(s);let el;
  if(el=c('[data-cmpick]')){const box=el.closest('.xsearch'),k=box.querySelector('[data-cmq]').dataset.cmq;CM[k]=el.dataset.cmpick;box.querySelector('input').value=CM[k];box.querySelector('.xdrop').hidden=true;$('#cmbody').innerHTML=cmBody();return}
  if(el=c('[data-wlpick]')){const l=wl();if(!l.includes(el.dataset.wlpick))l.push(el.dataset.wlpick);wlSave(l);route();return}
  if(el=c('[data-wlrm]')){wlSave(wl().filter(n=>n!==el.dataset.wlrm));route();return}
  if(el=c('[data-acp]')){AC.p=el.dataset.acp;$('#acbody').innerHTML=acBody();document.querySelectorAll('[data-acp]').forEach(b=>b.classList.toggle('on',b.dataset.acp===AC.p));return}
  if(el=c('[data-actab]')){AC.tab=el.dataset.actab;$('#acbody').innerHTML=acBody();return}
  if(el=c('[data-tmadd]')){const n=el.dataset.tmadd,from=el.dataset.from,to=from==='ra'?'rb':'ra';const l=TM[to];if(!l.includes(n))l.push(n);TM.done=false;tmDraw();return}
  if(el=c('[data-tmrm]')){const l=TM[el.dataset.side];l.splice(l.indexOf(el.dataset.tmrm),1);TM.done=false;tmDraw();return}
  if(c('[data-tmgo]')){TM.done=true;tmDraw();return}
},true);
document.addEventListener('dragstart',e=>{const b=e.target.closest&&e.target.closest('[data-tmdrag]');if(b){e.dataTransfer.setData('text/plain',b.dataset.tmdrag+'|'+b.dataset.from);e.dataTransfer.effectAllowed='move'}});
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('[data-tmdrop]');if(z){e.preventDefault();z.classList.add('over')}});
document.addEventListener('dragleave',e=>{const z=e.target.closest&&e.target.closest('[data-tmdrop]');if(z)z.classList.remove('over')});
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('[data-tmdrop]');if(!z)return;e.preventDefault();
  const [n,from]=(e.dataTransfer.getData('text/plain')||'|').split('|'),to=z.dataset.tmdrop;
  if(n&&PBY[n]&&from&&from!==to){if(!TM[to].includes(n))TM[to].push(n);TM.done=false;tmDraw()}});
if(typeof route==='function'&&window.SCHED)route();
})();

/* United Flag Football League admin: Teams, Player editor, Stat adder. Loaded before the main script. */
(function(){
const F=[['gp','Games'],['pc','Pass comp'],['pa','Pass att'],['py','Pass yds'],['pt','Pass TD'],['pi','INT thrown'],['ps','Sacked'],['pl','Pass long'],
['ra','Rush att'],['ry','Rush yds'],['rt','Rush TD'],['rf','Fumbles'],['rl','Rush long'],['tg','Targets'],['rc','Receptions'],['cy','Rec yds'],['ct','Rec TD'],['cd','Drops'],['cl','Rec long'],
['tk','Tackles'],['tf','TFL'],['sk','Sacks'],['sf','Safeties'],['sw','Swats'],['di','Def INT'],['pb','PBU'],['dt','Def TD']];
const LONG=['pl','rl','cl'],POS=['QB','RB','WR','TE','DB','LB'];
const KEY='rbx-admin-pw';
let ORIG=null,ORIGT=null;

let DB={teams:{},players:{},games:[]},mode='server',authed=false,A={arm:'',tab:'overview',t:'',p:'',msg:'',txt:'',pv:null,rec:true,logo:null,season:0};
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const pw=()=>sessionStorage.getItem(KEY)||'';
const usr=()=>sessionStorage.getItem(KEY+'-user')||'';
const authH=()=>{const h={'x-admin-password':encodeURIComponent(pw())};if(usr())h['x-admin-user']=encodeURIComponent(usr());return h};
const title=s=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const ini=n=>n.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
const z=(t,k)=>+t[k]||0;

/* ---------- fantasy: every position scores ONLY its own stats ---------- */
const DEMOS=6,ROLES=['QB','RB','WR','TE','DB','LB'];
const PN={QB:'Quarterback',RB:'Running back',WR:'Wide receiver',TE:'Tight end',DB:'Defensive back',LB:'Linebacker / DE'};
const DEFSC={QB:{py:.04,pt:4,pi:-2,pc:0,ps:0},RB:{ry:.1,rt:6,rf:0,ra:0},WR:{cy:.1,ct:6,rc:0,cd:0},TE:{cy:.1,ct:6,rc:0,cd:0},DB:{tk:1,di:4,pb:1,dt:6,sw:0},LB:{tk:1,sk:3,tf:0,sf:0}};
/* which position owns each stat, so a stat is never counted twice (REC = receiving -> WR or TE, TK = tackles -> DB or LB) */
const OWN={py:'QB',pc:'QB',pa:'QB',pt:'QB',pi:'QB',ps:'QB',ra:'RB',ry:'RB',rt:'RB',rf:'RB',tg:'REC',rc:'REC',cy:'REC',ct:'REC',cd:'REC',tf:'LB',sk:'LB',sf:'LB',sw:'DB',di:'DB',pb:'DB',dt:'DB',tk:'TK'};
const SW=r=>Object.assign({},DEFSC[r],(DB.scoring||{})[r]);
const stOf=(p,s)=>((p&&p.ss)||{})[s]||{};
const has=o=>Object.values(o||{}).some(v=>+v);
function owner(p,k,t){const o=OWN[k];if(o==='REC')return p.pos==='TE'?'TE':'WR';if(o==='TK')return p.pos==='LB'?'LB':p.pos==='DB'?'DB':(z(t,'sk')>0||z(t,'tf')>0?'LB':'DB');return o}
function roleFp(t,p,r){const w=SW(r);let s=0;for(const k in OWN)if(z(t,k)&&owner(p,k,t)===r)s+=(w[k]||0)*z(t,k);return +s.toFixed(1)}
const fpBy=(t,p)=>{const o={};ROLES.forEach(r=>o[r]=roleFp(t,p,r));return o};
window.rbxRoles=(p,s)=>{const t=stOf(p,s),set=new Set();for(const k in OWN)if(z(t,k))set.add(owner(p,k,t));
  const r=ROLES.filter(x=>set.has(x));if(r.length)return r;if(has(t))return [p.pos];return Object.values(p.ss||{}).some(has)?[]:[p.pos]};
window.rbxFp={role:(p,s,r)=>roleFp(stOf(p,s),p,r),tot:(p,s)=>{const t=stOf(p,s);return +ROLES.reduce((x,r)=>x+roleFp(t,p,r),0).toFixed(1)}};
window.customStats=function(p,pos,season){
  season=season||S.season;const t=stOf(p,season),r=pos||p.pos,s={fp:pos?roleFp(t,p,pos):rbxFp.tot(p,season),gp:z(t,'gp')};
  if(r==='QB'){Object.assign(s,{comp:z(t,'pc'),att:z(t,'pa'),yds:z(t,'py'),td:z(t,'pt'),int:z(t,'pi')});s.pct=s.att?s.comp/s.att*100:0}
  else if(r==='RB'){Object.assign(s,{att:z(t,'ra'),yds:z(t,'ry'),td:z(t,'rt'),rec:z(t,'rc'),fum:z(t,'rf')});s.ypc=s.att?s.yds/s.att:0}
  else if(r==='WR'||r==='TE'){Object.assign(s,{rec:z(t,'rc'),tgt:z(t,'tg'),yds:z(t,'cy'),td:z(t,'ct')});s.ypr=s.rec?s.yds/s.rec:0;s.cp=s.tgt?s.rec/s.tgt*100:0}
  else if(r==='DB')Object.assign(s,{tkl:z(t,'tk'),int:z(t,'di'),pd:z(t,'pb'),td:z(t,'dt')});
  else Object.assign(s,{tkl:z(t,'tk'),sack:z(t,'sk'),tfl:z(t,'tf'),ff:0});
  return s;
};
/* ---------- seasons ---------- */
/* Standings come from schedule scores; schedule scores come from the game recaps added in the Stat adder (typed scores are only a fallback). */
function linkScores(ser,s){
  const all=(DB.games||[]).filter(g=>(g.season||DB.cur)===s),gs=all.filter(g=>g.sa!=null&&g.sb!=null),used=new Set();
  const pair=(r,g)=>(r.a===g.home&&r.b===g.away)||(r.a===g.away&&r.b===g.home);
  const setG=(g,hit)=>{used.add(hit.id);const fl=hit.a===g.home;g.hs=fl?hit.sa:hit.sb;g.as=fl?hit.sb:hit.sa;g.gid=hit.id};
  /* pass 1: same two teams AND same week; pass 2: same two teams in any week (recap had no week / week differs) */
  [true,false].forEach(strict=>ser.forEach(x=>x.matches.forEach(m=>m.games.forEach(g=>{
    if(g.gid!=null)return;
    const hit=gs.find(r=>!used.has(r.id)&&pair(r,g)&&(!strict||(r.week&&+r.week===+m.week)));
    if(hit)setG(g,hit);
  }))));
  /* recaps saved without a score line: attach their player stats to the game (box score) but leave the score alone */
  const ns=all.filter(g=>g.sa==null||g.sb==null);
  [true,false].forEach(strict=>ser.forEach(x=>x.matches.forEach(m=>m.games.forEach(g=>{
    if(g.gid!=null)return;
    const hit=ns.find(r=>!used.has(r.id)&&pair(r,g)&&(!strict||(r.week&&+r.week===+m.week)));
    if(hit){used.add(hit.id);g.gid=hit.id}
  }))));
  return ser;
}
const linked=s=>linkScores(schedFor(s),s);
function recFromSched(ser){
  const R={},add=(n,f,c)=>{const r=R[n]=R[n]||{w:0,l:0,pf:0,pa:0};r.pf+=f;r.pa+=c;if(f>c)r.w++;else if(f<c)r.l++};
  ser.forEach(x=>x.matches.forEach(m=>m.games.forEach(g=>{if(g.hs==null||g.as==null)return;add(g.home,g.hs,g.as);add(g.away,g.as,g.hs)})));
  return R;
}
const recOf=(n,s)=>recFromSched(linked(s))[n]||{w:0,l:0,pf:0,pa:0};
const tkOf=(pv,n)=>(pv.map&&pv.map[n])||(n?teamKey(n):n);
const SKIP='__skip',okT=k=>!!TEAMS[k];
const findSched=(pv,ser)=>{
  const ka=tkOf(pv,pv.a),kb=tkOf(pv,pv.b),c=[];
  for(const x of ser)for(const m of x.matches)for(const g of m.games)if(g.gid==null&&((g.home===ka&&g.away===kb)||(g.home===kb&&g.away===ka)))c.push({x,m,g});
  return c.find(f=>pv.week&&+f.m.week===+pv.week)||c[0]||null;
};
const matchNote=pv=>priorNote(pv)+matchNote0(pv);
const matchNote0=pv=>{
  const miss=rawNames(pv).some(n=>!okT(tkOf(pv,n))&&tkOf(pv,n)!==SKIP);
  if(miss)return '<p class="sub" style="color:var(--red);margin:8px 0">Some team names were not found. Choose the right team (or skip) in the box above. No new team will be created.</p>';
  if(!pv.a||pv.sa==null)return '<p class="sub" style="color:var(--amber);margin:8px 0">No final score line found, so the schedule score will NOT update, but the player stats will still show in the game’s box score. Add a line like “DORIAN SPARTANS 36 - TOKYO TIGERS 32” to set the score too.</p>';
  const f=findSched(pv,linked(A.season));
  return f?`<p class="sub" style="color:var(--green);margin:8px 0">Will set the schedule score: ${esc(f.x.name)} · ${esc(f.m.name)} (${esc(f.g.home)} vs ${esc(f.g.away)}). Standings, team records and the box score update from it.</p>`
   :`<p class="sub" style="color:var(--amber);margin:8px 0">No open game for ${esc(tkOf(pv,pv.a))} vs ${esc(tkOf(pv,pv.b))} on the Season ${A.season} schedule, so it will be added to ${pv.week?'Week '+esc(pv.week):'the latest week'} of the schedule automatically.</p>`};
/* puts a game into week w (weeks go two per series: 1-2, 3-4, 5-6 ...), creating the week / series if needed */
function placeGame(ser,w,home,away,dedupe){
  let m=null,x=null;
  for(const sr of ser){const f=sr.matches.find(v=>v.week===w);if(f){m=f;x=sr;break}}
  if(!m){ /* weeks go two per series: 1-2, 3-4, 5-6 ... join the series that already holds this week's pair, else start a new one */
    const si=Math.floor((w-1)/2),pair=[2*si+1,2*si+2];
    x=ser.find(sr=>sr.matches.some(v=>pair.includes(v.week)));
    if(!x){const R=['I','II','III','IV','V','VI','VII','VIII','IX','X'];x={name:'Series '+(R[si]||si+1),matches:[]};ser.push(x)}
    m={week:w,name:'Week '+w,games:[]};x.matches.push(m);x.matches.sort((p,q)=>p.week-q.week);
    ser.sort((p,q)=>Math.min(...p.matches.map(v=>v.week),1e9)-Math.min(...q.matches.map(v=>v.week),1e9));
  }
  if(!(dedupe&&m.games.some(g=>(g.home===home&&g.away===away)||(g.home===away&&g.away===home))))m.games.push({home,away,hs:null,as:null});
  return ser;
}
function addToSched(pv,gm){
  const ser=schedFor(A.season),d=sc(A.season);let w=+pv.week||0;
  if(!w)w=Math.max(1,...ser.flatMap(x=>x.matches.map(m=>m.week)));
  /* with Google Sheets auto-sync on, the sheet is the schedule: keep recap games beside it so a sync never wipes them */
  if(d.auto&&d.url)DB.schedules[A.season]=Object.assign({},d,{extra:(d.extra||[]).concat({week:w,home:gm.a,away:gm.b})});
  else{placeGame(ser,w,gm.a,gm.b,false);DB.schedules[A.season]=Object.assign({},d,{series:ser})}
  A.sch=null;
}
/* ---- recorded games: find an earlier recap of the same match, and take a recap back out ---- */
const pairKey=(a,b)=>[a,b].sort().join('|');
function priorRecaps(pv){
  const ta=pv.a&&pv.b?[tkOf(pv,pv.a),tkOf(pv,pv.b)]:(pv.teams||[]).map(n=>tkOf(pv,n));
  const x=ta.filter((n,i)=>okT(n)&&ta.indexOf(n)===i);
  if(x.length!==2)return [];
  const k=pairKey(x[0],x[1]);
  /* same two teams and the same week; a leftover recap with no score (from a recap that could not be read) also counts */
  return (DB.games||[]).filter(g=>(g.season||DB.cur)===A.season&&pairKey(g.a,g.b)===k&&(g.sa==null?(!g.week||!pv.week||+g.week===+pv.week):(g.week&&pv.week&&+g.week===+pv.week)));
}
const priorNote=pv=>{const o=priorRecaps(pv);return o.length?`<p class="sub" style="color:var(--amber);margin:8px 0">${o.length>1?o.length+' earlier recaps':'An earlier recap'} for these teams${pv.week?' in Week '+esc(pv.week):''} ${o.length>1?'are':'is'} already saved. Saving this one replaces ${o.length>1?'them':'it'}: the old stats are taken out first, so nothing is counted twice and the schedule game is filled in again.</p>`:''};
function removeGame(id){
  const i=(DB.games||[]).findIndex(g=>g.id===id);if(i<0)return 0;
  const gm=DB.games[i],season=gm.season||DB.cur;DB.games.splice(i,1);
  const per={};(gm.lines||[]).forEach(l=>{const k=String(l.name).toLowerCase();(per[k]=per[k]||[]).push(l)});
  let gone=0;
  for(const low in per){
    const pk=Object.keys(DB.players).find(k=>k.toLowerCase()===low);if(!pk)continue;
    const p=DB.players[pk],c=(p.ss||{})[season];if(!c)continue;
    per[low].forEach(l=>{for(const k in l.st){if(LONG.includes(k))continue;c[k]=Math.max(0,z(c,k)-l.st[k])}});
    c.gp=Math.max(0,z(c,'gp')-1);
    /* a season-best (long) that this recap set is recomputed from the recaps that are left */
    LONG.forEach(k=>{if(per[low].some(l=>l.st[k]!=null&&l.st[k]===c[k])){let m=0;DB.games.forEach(g=>{if((g.season||DB.cur)===season)(g.lines||[]).forEach(l=>{if(String(l.name).toLowerCase()===low&&l.st[k]>m)m=l.st[k]})});c[k]=m}});
    if(p.auto&&!Object.values(p.ss).some(has)&&!DB.games.some(g=>(g.lines||[]).some(l=>String(l.name).toLowerCase()===low))){delete DB.players[pk];gone++}
  }
  return gone;
}
/* the whole "add this recap" step: replaces an earlier recap of the same match, records the game, puts it on the schedule */
function recordRecap(pv){
  applyMap(pv);
  const old=priorRecaps(pv);old.forEach(g=>removeGame(g.id));
  const before=DB.games.length,r=addGame(pv),gm=DB.games.length>before?DB.games[DB.games.length-1]:null;
  const onSched=!!gm&&linked(A.season).some(x=>x.matches.some(m=>m.games.some(g=>g.gid===gm.id)));
  if(gm&&!onSched)addToSched(pv,gm);
  return {gm,r,onSched,old};
}
function recPanel(){
  const recs=(DB.games||[]).filter(g=>(g.season||DB.cur)===A.season).slice().reverse(),L=linked(A.season);
  const where=g=>{for(const x of L)for(const m of x.matches)for(const y of m.games)if(y.gid===g.id)return {x,m,y};return null};
  return `<div class="panel ad-form" style="margin-top:14px"><h3>Recorded games · Season ${A.season}</h3><p class="sub" style="margin-bottom:12px">Every recap added to this season. A game marked “not on the schedule” will not show a score or box score on the Schedule page. Remove a wrong or old recap to take its stats back out, then add it again.</p>
   ${recs.length?recs.map(g=>{const f=where(g);return `<div class="ad-act" style="margin:0 0 8px;justify-content:space-between"><span><b>${esc(g.a)} ${g.sa??'–'} — ${g.sb??'–'} ${esc(g.b)}</b> <span class="sub">${g.week?'Week '+esc(g.week):'no week'} · ${esc(g.date||'no date')} · ${(g.lines||[]).length} stat lines · ${f?`<span style="color:var(--green)">on the schedule: ${esc(f.x.name)} · ${esc(f.m.name)}${g.sa==null?' (no score)':''}</span>`:'<span style="color:var(--amber)">not on the schedule</span>'}</span></span><span>${f?'':btn('schedrec','Add to schedule',g.id)}${btn('delrec',A.arm==='delrec:'+g.id?'Sure? Removes its stats':'Remove',g.id)}</span></div>`}).join(''):'<p class="sub">No games recorded yet.</p>'}</div>`;
}
const dupGame=pv=>pv.a&&pv.sa!=null&&(DB.games||[]).some(g=>(g.season||DB.cur)===A.season&&g.a===tkOf(pv,pv.a)&&g.b===tkOf(pv,pv.b)&&g.sa===pv.sa&&g.sb===pv.sb&&g.date===pv.date);
function applySeason(){
  const R=recFromSched((window.SCHED&&SCHED.series)||[]);
  for(const n in TEAMS){const t=TEAMS[n];Object.assign(t,{w:0,l:0,pf:0,pa:0},R[n]||{});t.diff=t.pf-t.pa}
}
const sc=s=>DB.schedules[s]||{};
function migrate(){
  DB.seasons=DB.seasons&&DB.seasons.length?DB.seasons.map(Number):[1,2,3,4,5,6];
  DB.cur=DB.cur||Math.max(...DB.seasons);
  for(const n in DB.players){const d=DB.players[n];if(!d.ss){d.ss={};if(d.st)d.ss[DB.cur]=d.st}delete d.st}
  for(const n in DB.teams){const d=DB.teams[n];if(!d.rec){d.rec={};if('w' in d)d.rec[DB.cur]={w:d.w|0,l:d.l|0,pf:d.pf|0,pa:d.pa|0}}['w','l','pf','pa'].forEach(k=>delete d[k])}
  DB.schedules=DB.schedules||{};if(DB.schedule){DB.schedules[DB.cur]=DB.schedule;delete DB.schedule}
  DB.scoring=DB.scoring||{};DB.awardWin=DB.awardWin||{};DB.allFlag=DB.allFlag||{};
}
window.rbxSeason=async()=>{applySched();await syncSheet();applySeason()};
window.rbxGameById=id=>(DB.games||[]).find(g=>g.id===id);
window.rbxAwardDefs=()=>DB.awardDefs||AWARD_DEFS;
window.rbxAwardWin=(s,id)=>((DB.awardWin||{})[s]||{})[id]||'';
window.rbxOne=()=>DB.oneEach!==false;
window.rbxAFPick=(s,t,id)=>((((DB.allFlag||{})[s]||{})[t])||{})[id]||'';
window.rbxAFAuto=()=>DB.afAuto!==false;
window.rbxPlayoffs=s=>((DB.playoffs||{})[s])||null;
window.rbxGames=s=>(DB.games||[]).filter(g=>(g.season||DB.cur)===s);
window.rbxDB=()=>DB;

/* ---------- storage ---------- */
async function load(){ /* migrate() below upgrades old single-season data */
  try{const r=await fetch('/api/data');if(!r.ok)throw 0;DB=await r.json();mode='server'}
  catch(e){mode='local';try{DB=JSON.parse(localStorage.getItem('rbx-db'))||DB}catch(_){}}
  DB.teams=DB.teams||{};DB.players=DB.players||{};DB.games=DB.games||[];DB.live=DB.live||[];DB.vods=DB.vods||[];migrate();
}
async function save(){
  if(mode==='local'){try{localStorage.setItem('rbx-db',JSON.stringify(DB));return true}catch(e){return false}}
  try{const r=await fetch('/api/data',{method:'PUT',headers:{'Content-Type':'application/json',...authH()},body:JSON.stringify(DB)});return r.ok}catch(e){return false}
}
async function chk(){try{return (await fetch('/api/login',{method:'POST',headers:authH()})).ok}catch(e){return false}}

/* push admin data into the site's live TEAMS / PLAYERS */
function merge(){
  if(!ORIG){ORIG={};PLAYERS.forEach(p=>ORIG[p.name]=p)}
  if(!ORIGT){ORIGT={};for(const n in TEAMS){const t=TEAMS[n];ORIGT[n]={w:t.w|0,l:t.l|0,pf:t.pf|0,pa:t.pa|0}}}
  window.LOGO=window.LOGO||{};window.TCOL=window.TCOL||{};
  for(const n in DB.teams){
    const d=DB.teams[n];let t=TEAMS[n];
    if(!t){t=TEAMS[n]={name:n};TEAM_DATA.push([n,'','','','',0,0,0,''])}
    Object.assign(t,{name:n,ab:d.ab||ini(n),code:d.code||n.slice(0,3).toUpperCase(),conf:d.conf||'TRC',div:d.div||'North',venue:d.venue||'TBD'});
    if(d.logo)LOGO[n]=d.logo;else delete LOGO[n];
    if(d.colors&&d.colors[0])TCOL[n]=d.colors;else delete TCOL[n];
  }
  /* rebuild the player list: originals (only if shown) + admin players */
  for(const n in ORIG)PBY[n]=ORIG[n];
  PLAYERS.length=0;
  if(DB.showDemo)PLAYERS.push(...Object.values(ORIG));
  for(const n in DB.players){
    const d=DB.players[n];
    const p={name:n,raw:{},ini:n.slice(0,2).toUpperCase(),pos:d.pos,team:d.team,custom:true,ss:d.ss||{},fp:0};
    PLAYERS.push(p);PBY[n]=p;
  }
  window.SEASONS=[...DB.seasons].sort((x,y)=>y-x);
  if(!merge.init){merge.init=1;S.season=DB.cur}else if(!DB.seasons.includes(S.season))S.season=DB.cur;
  applySched();applySeason();
}

/* ---------- stat parser (Discord recap format) ---------- */
const MAP={pass:{YDS:'py',TD:'pt',INT:'pi',SCKED:'ps'},rush:{ATT:'ra',YDS:'ry',TD:'rt',FUM:'rf'},rec:{TGT:'tg',REC:'rc',YDS:'cy',TD:'ct',DROP:'cd'},def:{TAK:'tk',TFL:'tf',SCK:'sk',SAF:'sf',SWAT:'sw',INT:'di',PBU:'pb',TD:'dt'}};
const LNG={pass:'pl',rush:'rl',rec:'cl'};
const SM=/^(.+?)\s+(\d+)\s*(?:-+|:|vs\.?|v\.?|def\.?)\s*(.+?)\s+(\d+)$/i;
const SM2=/^(.+?)\s+(\d+)\s*,?\s+(.+?)\s+(\d+)$/; /* no separator: "Dorian Spartans 36 Tokyo Tigers 32" */
const teamish=n=>!!(matchTeam(n)||isPH(n));
const SM3=/^(.+?)\s+(\d+)\s*(?:-+|:|vs\.?|v\.?)\s*(\d+)\s+(.+)$/i; /* "SINALOA RED DEVILS 36 - 32 ROSE CITY REAPERS": both scores in the middle */
function scoreLine(ln){
  ln=ln.replace(/^(?:final(?: score)?|score|result)\s*[:\-]?\s*/i,'');
  let m=ln.match(SM3);if(m&&!/\b(?:YDS|TGT|REC|ATT|TAK|LNG)\b/i.test(ln))return [m[0],m[1],m[2],m[4],m[3]];
  m=ln.match(SM);if(m)return m;
  m=ln.match(SM2);if(m&&teamish(m[1].trim())&&teamish(m[3].trim()))return m;
  return null;
}
function parse(txt){
  const o={lines:[],teams:[],a:'',b:'',sa:null,sb:null,week:'',date:'',potg:''};
  let team='',sec='',m,wantP=0;
  for(const raw of txt.split('\n')){
    const ln=raw.replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\x7E]/g,' ').replace(/\s+/g,' ').trim();
    if(!ln)continue;
    if(!o.date&&(m=ln.match(/\d{1,2}\/\d{1,2}\/\d{4}/)))o.date=m[0];
    if(!o.week&&(m=ln.match(/week (\d+)/i)))o.week=m[1];
    if(wantP){wantP=0;if(!ln.includes('|')&&/^[\w.\- ]{2,40}$/.test(ln)){o.potg=ln;continue}}
    if(m=ln.match(/^player of the (?:game|match)\s*[:\-]?\s*(.*)$/i)){if(m[1]&&/^[\w.\- ]{2,40}$/.test(m[1]))o.potg=m[1];else wantP=1;continue}
    if(/^\d+\s+players?\s+recorded$/i.test(ln))continue;
    if(ln.includes('|')&&!o.a&&!/\b(YDS|TD|INT|TGT|REC|ATT|TAK|LNG)\b/i.test(ln)){let hit=0;for(const seg of ln.split('|'))if(m=scoreLine(seg.trim())){o.a=title(m[1]);o.sa=+m[2];o.b=title(m[3]);o.sb=+m[4];hit=1;break}if(hit)continue}
    if(!ln.includes('|')){
      if(m=scoreLine(ln)){o.a=title(m[1]);o.sa=+m[2];o.b=title(m[3]);o.sb=+m[4];continue}
      if((m=ln.match(/^(.+?)\s+(?:team\s+)?stats$/i))||(m=ln.match(/^stats\s*(?:for|-|:)\s*(.+)$/i))){team=title(m[1]);sec='';if(!o.teams.includes(team))o.teams.push(team);continue}
      const s=/passing/i.test(ln)?'pass':/rushing/i.test(ln)?'rush':/receiving/i.test(ln)?'rec':/defen[sc]/i.test(ln)?'def':'';
      if(s)sec=s;
      continue;
    }
    if(!team||!sec)continue;
    const parts=ln.split('|'),name=parts.shift().trim();
    if(!/^[\w.\- ]{2,40}$/.test(name))continue;
    const body=parts.join('|'),st={};
    if(sec==='pass'&&(m=body.match(/(\d+)\s*\/\s*(\d+)/))){st.pc=+m[1];st.pa=+m[2]}
    for(const L in MAP[sec])if(m=body.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*'+L+'\\b','i')))st[MAP[sec][L]]=+m[1];
    if(LNG[sec]&&(m=body.match(/LNG\s*(\d+)/i)))st[LNG[sec]]=+m[1];
    o.lines.push({name,team,sec,st});
  }
  return o;
}
window.rbxParse=parse;window.__rec={recordRecap,removeGame,priorRecaps};
window.rbxTeamKey=n=>matchTeam(n)||String(n);
/* Work out which real site team every name in the recap means (typos, nicknames, cities, codes, "Team A/Team B"). */
const rawNames=pv=>{const r=[];[pv.a,pv.b,...pv.teams,...pv.lines.map(l=>l.team)].forEach(n=>{if(n&&!r.includes(n))r.push(n)});return r};
const ordOf=n=>/(?:^|\s)(?:a|1|home|one)$/i.test(n.trim())?0:/(?:^|\s)(?:b|2|away|two)$/i.test(n.trim())?1:-1;
function resolveRecap(pv){
  const map={},how={},names=rawNames(pv);
  names.forEach(n=>{const k=matchTeam(n);if(k){map[n]=k;how[n]=k===n?'exact':'close'}});
  /* still unknown (e.g. "Team A"): the team most of its players already belong to */
  names.filter(n=>!map[n]).forEach(n=>{
    const v={};pv.lines.filter(l=>l.team===n).forEach(l=>{const pl=Object.values(DB.players).find(x=>x.name.toLowerCase()===l.name.toLowerCase());if(pl&&TEAMS[pl.team]&&!isPH(pl.team))v[pl.team]=(v[pl.team]||0)+1});
    const top=Object.entries(v).sort((x,y)=>y[1]-x[1])[0];if(top){map[n]=top[0];how[n]='roster'}
  });
  /* a stats block named after a team that is NOT in the score line (recap names do not agree): pair it with the score-line team that has no block, in order */
  const e0=[pv.a&&map[pv.a],pv.b&&map[pv.b]];
  if(e0[0]&&e0[1]&&e0[0]!==e0[1]&&pv.teams.length&&pv.teams.length<=2){
    const out=pv.teams.filter(n=>!e0.includes(map[n])),free=e0.filter(e=>!pv.teams.some(n=>map[n]===e));
    out.forEach(n=>{const e=free.shift();if(e){map[n]=e;how[n]='guess'}});
  }
  /* "Team A/B" headers with a real-name score line: A = first team in the score line, B = second */
  const ends=[pv.a&&map[pv.a],pv.b&&map[pv.b]];
  names.filter(n=>!map[n]&&isPH(n)).forEach(n=>{const o=ordOf(n);if(o>-1&&ends[o]&&okT(ends[o])){map[n]=ends[o];how[n]='guess'}});
  /* placeholders everywhere: if the recap's week has exactly one open game, that is the match */
  if(names.some(n=>!map[n]&&isPH(n))&&pv.week){
    const open=[];linked(A.season).forEach(x=>x.matches.forEach(m=>{if(+m.week===+pv.week)m.games.forEach(g=>{if(g.gid==null)open.push(g)})}));
    if(open.length===1)names.filter(n=>!map[n]&&isPH(n)).forEach(n=>{const o=ordOf(n);if(o>-1){map[n]=o===0?open[0].home:open[0].away;how[n]='guess'}});
  }
  pv.map=map;pv.how=how;return pv;
}
function applyMap(pv){
  const m=pv.map||{},f=n=>(n&&m[n])||n;
  pv.a=f(pv.a);pv.b=f(pv.b);pv.teams=[...new Set(pv.teams.map(f))].filter(t=>t!==SKIP);
  pv.lines=pv.lines.map(l=>Object.assign({},l,{team:f(l.team)})).filter(l=>l.team!==SKIP&&okT(l.team));
  if(pv.a===SKIP||pv.b===SKIP||!okT(pv.a)||!okT(pv.b)){pv.a='';pv.b='';pv.sa=null;pv.sb=null} /* one side skipped: no score to record */
  if(!pv.teams.length)pv.teams=[...new Set(pv.lines.map(l=>l.team))];
}
function teamsBox(pv){
  const names=rawNames(pv),tn=Object.keys(TEAMS).sort();if(!names.length)return '';
  const why={exact:'',close:'matched by name',roster:'matched by its players’ roster',guess:'guessed from order/schedule – please check'};
  return `<div class="panel" style="padding:12px 14px;margin:12px 0"><div class="label" style="margin-bottom:8px">Teams found in this recap</div><div class="fm-grid">${names.map(n=>{
    const cur=pv.map[n]||'';
    return `<label><span class="label">Recap says “${esc(n)}”</span><select data-tm="${esc(n)}"><option value="">Not matched – choose a team…</option>${tn.map(t=>`<option ${t===cur?'selected':''}>${esc(t)}</option>`).join('')}<option value="${SKIP}" ${cur===SKIP?'selected':''}>Skip – do not add these stats</option></select>${cur?'':`<small class="sub" style="color:var(--red)">No team found for this name. No team will be created; pick one or skip.</small>`}${(why[pv.how[n]]?`<small class="sub" style="color:${pv.how[n]==='guess'?'var(--amber)':'var(--green)'}">${why[pv.how[n]]}</small>`:'')}</label>`}).join('')}</div></div>`;
}
/* current win/loss streak of a team, from schedule results (else from games recorded by the Stat adder) -> ['W',n] | null */
window.rbxStreak=function(team){
  const res=[];
  const add=(a,b,sa,sb)=>{if(a!==team&&b!==team)return;if(sa==null||sb==null)return;const m=a===team?sa:sb,t=a===team?sb:sa;res.push(m>t?'W':m<t?'L':'T')};
  ((window.SCHED&&SCHED.series)||[]).forEach(s=>s.matches.forEach(m=>m.games.forEach(g=>add(g.home,g.away,g.hs,g.as))));
  if(!res.length)(DB.games||[]).filter(g=>(g.season||DB.cur)===S.season).forEach(g=>add(g.a,g.b,g.sa,g.sb));
  const c=res[res.length-1];if(!c||c==='T')return null;
  let n=0;for(let i=res.length-1;i>=0&&res[i]===c;i--)n++;
  return [c,n];
};

/* ---------- mutations ---------- */
/* ---------- team detection: exact, code, nickname, city, partial, typo-tolerant ---------- */
const isPH=n=>/^(?:(?:team|tm|club)\s*)?(?:[a-d]|[1-4]|home|away|one|two)$/i.test(String(n||'').trim()); /* "Team A", "Team B", "Home"... are placeholders, never real teams */
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\b(?:the|team|stats|fc|club)\b/g,' ').replace(/\s+/g,' ').trim();
function matchTeam(n){
  const raw=String(n==null?'':n).trim();if(!raw||isPH(raw))return null;
  if(TEAMS[raw])return raw;
  const a=norm(raw);if(!a)return null;
  const aw=a.split(' '),res=[];
  for(const k of Object.keys(TEAMS)){
    const t=norm(k),tw=t.split(' '),nick=tw[tw.length-1],city=tw.slice(0,-1).join(' '),T=TEAMS[k]||{};
    let sc=0;
    if(a===t)sc=100;
    else if(a===String(T.code||'').toLowerCase())sc=96;
    else if(a===nick)sc=92;
    else if(city&&a===city)sc=88;
    else{
      const r=1-lev(a,t)/Math.max(a.length,t.length);if(r>=.7)sc=Math.round(60+r*30);
      if(a.length>=4&&t.includes(a))sc=Math.max(sc,80);
      if(t.length>=4&&a.includes(t))sc=Math.max(sc,80);
      for(const w of aw){if(w.length<4)continue;for(const x of tw){if(x.length<4)continue;const d=lev(w,x);if(d===0)sc=Math.max(sc,78);else if(d<=(x.length>=7?2:1))sc=Math.max(sc,72)}}
      if(a===String(T.ab||'').toLowerCase())sc=Math.max(sc,74);
    }
    if(sc)res.push([sc,k]);
  }
  res.sort((x,y)=>y[0]-x[0]);
  if(!res.length||res[0][0]<70)return null;
  if(res.length>1&&res[1][0]>=70&&res[0][0]-res[1][0]<6)return null; /* two teams look equally close: do not guess */
  return res[0][1];
}
function teamKey(n){return matchTeam(n)||String(n).trim()}
function ensureTeam(n){ /* never invents a team: only creates the admin record for a team that already exists on the site */
  const k=teamKey(n);
  if(!TEAMS[k])return null;
  if(!DB.teams[k]){
    const t=TEAMS[k];
    DB.teams[k]={ab:t.ab,code:t.code,conf:t.conf,div:t.div,venue:t.venue,logo:'',rec:ORIGT&&ORIGT[k]?{[DEMOS]:Object.assign({},ORIGT[k])}:{}};
  }
  return k;
}
function addGame(pv){
  const secs={},added={teams:0,players:0},gl=[];pv.teams=pv.teams||[];
    for(const l of pv.lines){
    const tk=ensureTeam(l.team);if(!tk)continue;
    const pk=Object.keys(DB.players).find(k=>k.toLowerCase()===l.name.toLowerCase())||l.name;
    let p=DB.players[pk];
    if(!p){p=DB.players[pk]={name:pk,team:tk,pos:'DB',ss:{},_new:1,auto:1};added.players++}
    p.team=tk;p.ss=p.ss||{};const c=p.ss[A.season]=p.ss[A.season]||{};
    (secs[pk]=secs[pk]||new Set()).add(l.sec);gl.push({name:pk,team:tk,sec:l.sec,st:Object.assign({},l.st)});
    for(const k in l.st)c[k]=LONG.includes(k)?Math.max(z(c,k),l.st[k]):z(c,k)+l.st[k];
  }
  for(const pk in secs){
    const p=DB.players[pk],c=p.ss[A.season];c.gp=z(c,'gp')+1;
    if(p._new){const s=secs[pk];p.pos=s.has('pass')?'QB':s.has('rush')?'RB':s.has('rec')?'WR':'DB';delete p._new}
  }
  const ta=pv.a&&pv.sa!=null?[pv.a,pv.b]:(pv.teams.length===2?pv.teams:null),sc2=pv.a&&pv.sa!=null;
  if(ta&&gl.length){
    const a=ensureTeam(ta[0]),b=ensureTeam(ta[1]);
    if(a&&b&&a!==b)DB.games.push({id:Date.now(),season:A.season,week:pv.week,date:pv.date,potg:pv.potg?(Object.keys(DB.players).find(k=>k.toLowerCase()===pv.potg.toLowerCase())||pv.potg):'',a,b,sa:sc2?pv.sa:null,sb:sc2?pv.sb:null,lines:gl});
  }
  return added;
}
function resize(file,cb){
  const fr=new FileReader();
  fr.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=128;
    const m=Math.min(im.width,im.height);c.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,128,128);cb(c.toDataURL('image/png'))};im.src=fr.result};
  fr.readAsDataURL(file);
}


/* ---------- schedule ---------- */
const DEFSER=['Series I','Series II','Series III'];
/* Matches are weeks. Default layout: Series I = weeks 1-2, Series II = weeks 3-4, Series III = weeks 5-6. Every week number can be edited in Admin > Schedule. */
const defSched=()=>DEFSER.map((n,si)=>({name:n,matches:[0,1].map(j=>({week:si*2+j+1,name:'Week '+(si*2+j+1),games:[]}))}));
function fixWeeks(ser){
  let i=0;
  ser.forEach(s=>s.matches.forEach(m=>{i++;
    let w=+m.week;
    if(!w){const mm=String(m.name||'').match(/^week\s*(\d+)/i);w=mm?+mm[1]:i}
    m.week=w;m.name='Week '+w;
  }));
  return ser;
}
const clone=o=>JSON.parse(JSON.stringify(o));
function lev(a,b){const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return d[b.length]}
function rt(n){
  let f=matchTeam(n);
  if(!f){f=n;TEAMS[n]={name:n,ab:ini(n),code:n.slice(0,3).toUpperCase(),conf:'TRC',div:'North',w:0,l:0,pf:0,pa:0,diff:0,venue:'TBD'}}
  return f;
}
/* the same two teams twice in one week is never a real fixture: keep the one with a score, drop repeated open ones (left by earlier recaps) */
function dedupeOpen(s){
  s.forEach(x=>x.matches.forEach(m=>{
    const open=g=>g.hs==null&&g.as==null,key=g=>pairKey(g.home,g.away),scored=new Set(m.games.filter(g=>!open(g)).map(key)),seen=new Set();
    m.games=m.games.filter(g=>{if(!open(g))return true;const k=key(g);if(scored.has(k)||seen.has(k))return false;seen.add(k);return true});
  }));
  return s;
}
/* any team name on the schedule that is not a known team becomes a real team (saved in Admin > Teams) */
function ensureTeams(series){
  const made=[];
  (series||[]).forEach(s=>s.matches.forEach(m=>m.games.forEach(g=>[g.home,g.away].forEach(nm=>{
    nm=String(nm||'').trim();if(!nm||isPH(nm)||DB.teams[nm]||(ORIGT&&ORIGT[nm]))return;
    DB.teams[nm]=newTeam(nm);made.push(nm)
  }))));
  const u=[...new Set(made)];if(u.length)merge();return u;
}
function newTeam(nm){return {ab:ini(nm),code:nm.replace(/[^a-z0-9]/gi,'').slice(0,3).toUpperCase()||'TBD',conf:'TRC',div:'North',venue:'TBD',colors:[],rec:{},logo:''}}
const madeMsg=u=>u.length?` Created ${u.length} new team${u.length>1?'s':''} that ${u.length>1?'were':'was'} not found: ${u.join(', ')}. Edit them in Admin > Teams.`:'';
const SYNC={}; /* last schedule read from Google Sheets, per season */
function schedFor(n){
  const d=DB.schedules[n]||{};
  const s=d.auto&&d.url&&SYNC[n]?clone(SYNC[n]):d.series&&d.series.length?clone(d.series):defSched();
  s.forEach(x=>x.matches.forEach(m=>m.games.forEach(g=>{g.home=rt(g.home);g.away=rt(g.away)})));
  fixWeeks(s);
  (d.extra||[]).forEach(e=>placeGame(s,+e.week,rt(e.home),rt(e.away),true));
  return dedupeOpen(s);
}
function applySched(){window.SCHED={series:linked(S.season)}}
function csv(t,D=','){
  const R=[];let r=[],c='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;else if(ch===D){r.push(c);c=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);R.push(r);r=[];c=''}else c+=ch}
  if(c||r.length){r.push(c);R.push(r)}
  return R;
}
/* reads one "Series" tab laid out like the UFF sheet: MATCH ONE header, then rows of  #seed | home | score - score | away | #seed */
function parseSheet(text,sname,D){return parseRows(csv(text,D),sname)}
function parseRows(rows,sname){
  const ser={name:sname,matches:[]};let m=null,mm;
  for(const r of rows){
    const c=r.map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean).filter(x=>!/^(home|away)$/i.test(x));
    if(!c.length)continue;
    if(c.length<3&&(mm=c.join(' ').match(/^(match|week) (.+)$/i))){m={name:title(mm[1]+' '+mm[2]),games:[]};ser.matches.push(m);continue}
    const names=c.filter(x=>/[a-z]/i.test(x)&&x.length>2&&!/^#\d+$/.test(x)&&!/^(bye|tbd)$/i.test(x)&&!/^=|:\/\/|^image\b/i.test(x));
    if(names.length<2)continue;
    const nums=c.filter(x=>/^\d+$/.test(x)).map(Number);
    if(!m){m={name:'Week 1',games:[]};ser.matches.push(m)}
    m.games.push({home:rt(names[0]),away:rt(names[names.length-1]),hs:nums.length>=2?nums[0]:null,as:nums.length>=2?nums[1]:null});
  }
  return ser;
}
/* ---------- .ods import (unzips the file in the browser, no libraries) ---------- */
async function odsContent(buf){
  const v=new DataView(buf),u=new Uint8Array(buf);let e=-1;
  for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw new Error('That does not look like an .ods file. In Google Sheets use File > Download > OpenDocument (.ods).');
  let n=v.getUint16(e+10,true),p=v.getUint32(e+16,true);
  for(;n>0&&v.getUint32(p,true)===0x02014b50;n--){
    const meth=v.getUint16(p+10,true),csz=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),off=v.getUint32(p+42,true);
    if(new TextDecoder().decode(u.subarray(p+46,p+46+nl))==='content.xml'){
      const ds=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true),data=u.subarray(ds,ds+csz);
      if(meth===0)return new TextDecoder().decode(data);
      if(meth!==8)break;
      if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot open zip files. Use a current Chrome, Edge, Firefox or Safari, or paste the sheet instead.');
      return new TextDecoder().decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    }
    p+=46+nl+el+cl;
  }
  throw new Error('Could not find the spreadsheet data inside that file.');
}
function odsSheets(xml){
  const sheets=[],re=/<(\/?)([\w.-]+:[\w.-]+)([^>]*?)(\/?)>|([^<]+)/g;
  const attr=(a,n)=>{const m=a.match(new RegExp('(?:^|\\s)'+n+'="([^"]*)"'));return m?m[1]:null};
  const dec=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/&#(\d+);/g,(_,d)=>String.fromCharCode(+d)).replace(/&amp;/g,'&');
  let sh=null,row=null,cell=null,inP=0,m;
  const open=(tag,at)=>{
    if(tag==='table:table'){if(!sh){sh={name:dec(attr(at,'table:name')||''),rows:[]};sheets.push(sh)}}
    else if(tag==='table:table-row'&&sh)row={cells:[],rep:+attr(at,'table:number-rows-repeated')||1};
    else if((tag==='table:table-cell'||tag==='table:covered-table-cell')&&row)cell={t:'',rep:+attr(at,'table:number-columns-repeated')||1,p:0};
    else if(tag==='text:p'&&cell){if(cell.p++)cell.t+=' ';inP++}
    else if(tag==='text:s'&&cell&&inP)cell.t+=' '.repeat(+attr(at,'text:c')||1);
    else if((tag==='text:tab'||tag==='text:line-break')&&cell&&inP)cell.t+=' ';
  };
  const end=tag=>{
    if(tag==='text:p'){if(inP)inP--}
    else if((tag==='table:table-cell'||tag==='table:covered-table-cell')&&row&&cell){const t=cell.t.trim();for(let i=0;i<(t?Math.min(cell.rep,50):1);i++)row.cells.push(t);cell=null}
    else if(tag==='table:table-row'&&sh&&row){const c=row.cells,empty=!c.some(Boolean);for(let i=0;i<(empty?1:Math.min(row.rep,50));i++)sh.rows.push(c);row=null}
    else if(tag==='table:table')sh=null;
  };
  while(m=re.exec(xml)){
    if(m[5]!==undefined){if(cell&&inP)cell.t+=dec(m[5]);continue}
    if(m[1]==='/')end(m[2]);else{open(m[2],m[3]);if(m[4]==='/')end(m[2])}
  }
  return sheets;
}
/* every tab that contains games becomes one series named after the tab */
window.rbxParseOds=async function(buf){
  const isHead=r=>{const c=r.filter(Boolean);return c.length<3&&/^(match|week) .+$/i.test(c.join(' '))};
  /* only tabs with a MATCH / WEEK header are schedules; notes/other tabs are ignored (and never create teams) */
  return odsSheets(await odsContent(buf)).filter(s=>s.rows.some(isHead)).map(s=>parseRows(s.rows,s.name||'Series')).filter(s=>s.matches.some(m=>m.games.length));
};
async function importOds(file){
  try{
    const ser=await rbxParseOds(await file.arrayBuffer()),n=ser.reduce((t,x)=>t+x.matches.reduce((u,m)=>u+m.games.length,0),0);
    if(!n){A.msg='No games found in that file. Each tab should be one series with MATCH ONE / MATCH TWO headers, then rows like  #seed | home | score | score | away | #seed.';return draw()}
    fixWeeks(ser);const made=ensureTeams(ser);DB.schedules[A.season]=Object.assign({},sc(A.season),{series:ser,auto:false});A.sch=null;
    return commit(`Imported ${n} games from ${ser.length} tab${ser.length>1?'s':''} (${ser.map(s=>s.name).join(', ')}). Open the Schedule page to see them.`+madeMsg(made)+(sc(A.season).url?' Google Sheets auto-sync was turned off so it does not overwrite the file.':''));
  }catch(e){A.msg=e.message||'Could not read that file.';draw()}
}
const sheetId=u=>((u||'').match(/\/d\/([\w-]+)/)||[])[1];
async function getTab(id,n){
  /* try the site's own server first, then Google directly from the browser; report why each failed */
  const why=[];
  try{const r=await fetch(`/api/sheet?id=${id}&name=${encodeURIComponent(n)}`);if(r.ok){const t=await r.text();if(!/^\s*</.test(t))return t;why.push('site server: got a web page instead of data')}else why.push('site server: HTTP '+r.status)}catch(e){why.push('site server: not reachable')}
  try{const r=await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(n)}`);const t=await r.text();if(r.ok&&!/^\s*</.test(t))return t;why.push('Google: HTTP '+r.status)}catch(e){why.push('Google: blocked by the browser')}
  const err=new Error(why.join(' | '));err.why=1;throw err;
}
async function fetchSheet(url,names){
  const id=sheetId(url);if(!id)throw new Error('That does not look like a Google Sheets link.');
  return Promise.all(names.map(async n=>{
    let t;try{t=await getTab(id,n)}catch(e){throw new Error(`Could not read the tab "${n}" (${e.message}). Check the tab name, or use “Paste the sheet instead” below.`)}
    return parseSheet(t,n);
  }));
}
async function syncSheet(){
  const d=DB.schedules[S.season];if(!d||!d.auto||!d.url)return;
  try{const ser=await fetchSheet(d.url,d.names||DEFSER);if(ser.some(s=>s.matches.some(m=>m.games.length))){SYNC[S.season]=fixWeeks(ser);applySched()}}catch(e){}
}
window.rbxParseSheet=parseSheet;
function collectSched(){
  if(!A.sch)return;
  qa('[data-f]').forEach(el=>{
    const ser=A.sch[+el.dataset.s],f=el.dataset.f;if(!ser)return;
    if(f==='sname')ser.name=el.value;
    else if(f==='week'){const m=ser.matches[+el.dataset.m];if(m){m.week=+el.value||m.week;m.name='Week '+m.week}}
    else{const g=(ser.matches[+el.dataset.m]||{games:[]}).games[+el.dataset.g];if(!g)return;g[f]=(f==='hs'||f==='as')?(el.value===''?null:+el.value):el.value}
  });
}
function schedTab(){
  if(!A.sch)A.sch=schedFor(A.season);
  const d=DB.schedules[A.season]||{},tn=Object.keys(TEAMS).sort();
  const tsel=(v,at)=>`<select ${at}><option value="">Choose team…</option>${tn.map(t=>`<option ${t===v?'selected':''}>${esc(t)}</option>`).join('')}<option value="__new__">+ New team…</option></select>`;
  return `<div class="panel ad-form" style="margin-bottom:16px"><h3>Import from an .ods file</h3>
    <p class="sub" style="margin-bottom:12px">Upload your schedule spreadsheet (OpenDocument .ods). Every tab becomes one series, named after the tab, with “WEEK 1 / WEEK 2” headers (old “MATCH ONE / MATCH TWO” headers are turned into weeks automatically). This replaces the current schedule.</p>
    <div class="ad-act" style="margin-top:0"><label class="chip btn-amber" style="display:inline-block;padding:11px 16px;cursor:pointer">Choose .ods file<input type="file" id="sh_file" accept=".ods,application/vnd.oasis.opendocument.spreadsheet" hidden></label></div></div>
   <div class="panel ad-form" style="margin-bottom:16px"><h3>Import from Google Sheets</h3>
    <p class="sub" style="margin-bottom:12px">Paste the link to your schedule sheet (shared as “Anyone with the link can view”). Each tab is one series, with “WEEK 1 / WEEK 2” headers (or the old “MATCH ONE / MATCH TWO”, which become weeks automatically).</p>
    <div class="fm-grid" style="grid-template-columns:2fr 1fr">${fld('sh_url','Sheet link',d.url||'','placeholder="https://docs.google.com/spreadsheets/d/…"')}${fld('sh_names','Tab names (comma separated)',(d.names||DEFSER).join(', '))}</div>
    <div class="ad-act">${btn('import','Import schedule','','btn-amber')}<label class="ad-chk"><input type="checkbox" id="sh_auto" ${d.auto?'checked':''}> Keep the site in sync with the sheet automatically</label></div>
    <details style="margin-top:14px"><summary class="sub" style="cursor:pointer">Import not working? Paste the sheet instead</summary>
     <p class="sub" style="margin:8px 0">In Google Sheets open one series tab, press Ctrl+A then Ctrl+C, and paste it here. Repeat for each series.</p>
     <div class="fm-grid" style="grid-template-columns:1fr 3fr">${fld('ps_name','Series name','','placeholder="Series I"')}<label><span class="label">Pasted cells</span><textarea id="ps_txt" rows="4"></textarea></label></div>
     <div class="ad-act">${btn('pastesheet','Import pasted tab')}</div></details>
    ${d.auto?'<p class="sub" style="margin-top:8px">Auto-sync is on: the sheet overrides anything you edit by hand below.</p>':''}</div>
   <div class="panel ad-form"><h3>Schedule editor · Season ${A.season}</h3>
    ${A.sch.map((s,si)=>`<div class="ad-series"><div class="ad-act" style="margin:0 0 10px"><input data-f="sname" data-s="${si}" value="${esc(s.name)}" style="max-width:220px">${btn('addmatch','+ Add week',si)}${btn('delseries',A.arm==='delseries:'+si?'Sure?':'Delete series',si)}</div>
      ${s.matches.map((m,mi)=>`<div class="ad-match"><div class="ad-act" style="margin:0 0 8px"><span class="label" style="margin:0">Week</span><input type="number" min="1" data-f="week" data-s="${si}" data-m="${mi}" value="${m.week}" style="max-width:80px">${btn('addgame','+ Add game',si+','+mi)}${btn('delmatch',A.arm==='delmatch:'+si+','+mi?'Sure?':'Delete week',si+','+mi)}</div>
        ${m.games.map((g,gi)=>`<div class="ad-game">${tsel(g.home,`data-f="home" data-s="${si}" data-m="${mi}" data-g="${gi}"`)}<input type="number" data-f="hs" data-s="${si}" data-m="${mi}" data-g="${gi}" value="${g.hs??''}" placeholder="–"><span>vs</span><input type="number" data-f="as" data-s="${si}" data-m="${mi}" data-g="${gi}" value="${g.as??''}" placeholder="–">${tsel(g.away,`data-f="away" data-s="${si}" data-m="${mi}" data-g="${gi}"`)}${btn('delgame','✕',si+','+mi+','+gi)}</div>`).join('')||'<p class="sub">No games yet.</p>'}</div>`).join('')}</div>`).join('')}
    <div class="ad-act">${btn('addseries','+ Add series')}${btn('savesched','Save schedule','','btn-amber')}</div>
    <p class="sub" style="margin-top:8px">Scores fill in automatically when you add a game recap in the Stat adder for those two teams. Only type a score here if you have no recap.</p></div>`;
}

/* ---------- views ---------- */

/* ---------- live streams + VODs (YouTube / Twitch links -> embeds) ---------- */
const TW_RES=/^(videos|directory|downloads|jobs|turbo|settings|p|search|friends|subscriptions|inventory|wallet|drops|u)$/i;
window.rbxEmbed=function(url){
  url=String(url||'').trim();if(!url)return null;
  if(!/^https?:\/\//i.test(url))url='https://'+url;
  let u;try{u=new URL(url)}catch(e){return null}
  const h=u.hostname.replace(/^(www|m|music|gaming)\./,''),path=u.pathname.split('/').filter(Boolean),host=location.hostname||'localhost';
  const yt=id=>/^[\w-]{11}$/.test(id||'')?{site:'youtube',src:'https://www.youtube.com/embed/'+id+'?rel=0',thumb:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',url}:null;
  if(h==='youtu.be')return yt(path[0]);
  if(h==='youtube.com'||h==='youtube-nocookie.com'){
    if(path[0]==='watch')return yt(u.searchParams.get('v'));
    if(['live','shorts','embed','v'].includes(path[0])&&path[1])return yt(path[1]);
    if(path[0]==='playlist'&&u.searchParams.get('list'))return {site:'youtube',src:'https://www.youtube.com/embed/videoseries?list='+encodeURIComponent(u.searchParams.get('list')),thumb:'',url};
    if(path[0]==='channel'&&/^UC[\w-]{22}$/.test(path[1]||''))return {site:'youtube',src:'https://www.youtube.com/embed/live_stream?channel='+path[1],thumb:'',url}; /* channel's current live stream */
    return {site:'youtube',src:'',thumb:'',url,noembed:1}; /* @handle pages cannot be embedded: shown as a link */
  }
  if(h==='clips.twitch.tv'&&path[0])return {site:'twitch',src:'https://clips.twitch.tv/embed?clip='+encodeURIComponent(path[0])+'&parent='+host+'&autoplay=false',thumb:'',url};
  if(h==='twitch.tv'){
    if(path[0]==='videos'&&/^\d+$/.test(path[1]||''))return {site:'twitch',src:'https://player.twitch.tv/?video=v'+path[1]+'&parent='+host+'&autoplay=false',thumb:'',url};
    if(path[1]==='clip'&&path[2])return {site:'twitch',src:'https://clips.twitch.tv/embed?clip='+encodeURIComponent(path[2])+'&parent='+host+'&autoplay=false',thumb:'',url};
    if(path[0]&&!TW_RES.test(path[0])&&/^\w{3,25}$/.test(path[0]))return {site:'twitch',src:'https://player.twitch.tv/?channel='+path[0]+'&parent='+host+'&autoplay=false',thumb:'',url};
  }
  return null;
};
window.rbxLive=()=>DB.live||[];
window.rbxVods=()=>[...(DB.vods||[])].sort((a,b)=>(b.id||0)-(a.id||0));
const rid=()=>Date.now()+Math.floor(Math.random()*1000);
function liveTab(){
  const L=DB.live||[];
  return `<div class="panel ad-form"><h3>Live streams</h3><p class="sub" style="margin-bottom:12px">Add a live YouTube or Twitch stream. It appears at the top of the public <b>Live</b> page. Paste a Twitch channel link (twitch.tv/name), a YouTube video/stream link (watch?v=… or youtu.be/…), or a YouTube <b>/channel/UC…</b> link. Remove it when the broadcast ends.</p>
   <div class="fm-grid" style="grid-template-columns:1fr 2fr">${fld('lv_title','Title','','placeholder="Week 3 · Spartans vs Tigers"')}${fld('lv_url','YouTube or Twitch link','','placeholder="https://www.twitch.tv/…"')}</div>
   <div class="ad-act">${btn('addlive','Add live stream','','btn-amber')}</div>
   <div class="label" style="margin:18px 0 8px">On the Live page now (${L.length})</div>
   <div style="display:grid;gap:8px">${L.map(x=>{const e=rbxEmbed(x.url);return `<div class="ad-act" style="margin:0"><b style="min-width:180px">${esc(x.title||'Live stream')}</b><span class="sub" style="flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis">${esc(x.url)}</span><span class="label" style="margin:0;color:${e&&e.src?'var(--green)':'var(--amber)'}">${e?(e.src?e.site:'link only'):'bad link'}</span>${btn('dellive','Remove',x.id)}</div>`}).join('')||'<p class="sub">No live streams added.</p>'}</div></div>`;
}
function vodsTab(){
  const V=window.rbxVods();
  return `<div class="panel ad-form"><h3>VODs</h3><p class="sub" style="margin-bottom:12px">Add YouTube highlight videos or Twitch past broadcasts (twitch.tv/videos/…) and clips. They appear on the public <b>VODs</b> page, newest first.</p>
   <div class="fm-grid" style="grid-template-columns:1fr 2fr">${fld('vd_title','Title','','placeholder="Week 1 highlights"')}${fld('vd_url','YouTube or Twitch link','','placeholder="https://www.youtube.com/watch?v=…"')}</div>
   <div class="fm-grid" style="margin-top:12px"><label><span class="label">Type</span><select id="vd_type"><option value="">Auto-detect</option><option value="highlight">Highlight</option><option value="broadcast">Past broadcast</option></select></label>${fld('vd_note','Note (optional)','','placeholder="Season 6 · Week 1"')}</div>
   <div class="ad-act">${btn('addvod','Add VOD','','btn-amber')}</div>
   <div class="label" style="margin:18px 0 8px">Added VODs (${V.length})</div>
   <div style="display:grid;gap:8px">${V.map(x=>{const e=rbxEmbed(x.url);return `<div class="ad-act" style="margin:0"><b style="min-width:180px">${esc(x.title||'Video')}</b><span class="label" style="margin:0">${x.kind==='broadcast'?'Past broadcast':'Highlight'}</span><span class="sub" style="flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis">${esc(x.url)}</span><span class="label" style="margin:0;color:${e&&e.src?'var(--green)':'var(--amber)'}">${e?(e.src?e.site:'link only'):'bad link'}</span>${btn('delvod','Remove',x.id)}</div>`}).join('')||'<p class="sub">No VODs added yet.</p>'}</div></div>`;
}
const opt=(list,sel)=>list.map(v=>`<option ${v===sel?'selected':''}>${esc(v)}</option>`).join('');
const fld=(id,label,val,extra='')=>`<label><span class="label">${label}</span><input id="${id}" value="${esc(val??'')}" ${extra}></label>`;
const btn=(a,txt,v='',cls='chip')=>`<button class="${cls}" data-a="${a}" data-v="${esc(v)}">${txt}</button>`;

function teamsTab(){
  const names=Object.keys(TEAMS).sort(),n=A.t,d=n?(DB.teams[n]||TEAMS[n]):{ab:'',code:'',conf:'GCC',div:'North',venue:''},r=recOf(n,A.season);
  const logo=A.logo!==null?A.logo:(LOGO[n]||''),tc=TCOL[n]||PAL[hash(n||'x')%PAL.length];
  return `<div class="ad-cols"><div class="ad-list">${btn('newteam','+ New team','','btn-amber')}
    ${names.map(k=>`<button class="ad-item ${k===n?'on':''}" data-a="team" data-v="${esc(k)}">${badge(TEAMS[k].ab,k,'sm')}<span>${esc(k)}</span></button>`).join('')}</div>
   <div class="panel ad-form"><h3>${n?esc(n):'New team'}</h3><p class="sub" style="margin:-8px 0 12px">Season ${A.season} record: <b>${r.w}-${r.l}</b> · PF ${r.pf} · PA ${r.pa}. Calculated automatically from schedule scores.</p>
    <div class="ad-logo"><span class="badge xl" id="logoprev" style="background:${grad(n||'x')}">${logo?`<img src="${logo}" alt="">`:esc(d.ab||'?')}</span>
     <label class="chip">Upload logo<input type="file" accept="image/*" hidden data-a="logo"></label>${logo?btn('clearlogo','Remove logo'):''}</div>
    <div class="fm-grid">${n?`<label><span class="label">Team name</span><input value="${esc(n)}" disabled></label>`:fld('t_name','Team name','')}
     ${fld('t_ab','Badge letters',d.ab,'maxlength="3"')}${fld('t_code','Short code',d.code,'maxlength="4"')}
     <label><span class="label">Conference</span><select id="t_conf"><option value="GCC" ${d.conf==='GCC'?'selected':''}>GCC</option><option value="TRC" ${d.conf==='TRC'?'selected':''}>TRC</option></select></label>
     <label><span class="label">Division</span><select id="t_div">${opt(['North','South'],d.div)}</select></label>
     ${fld('t_venue','Venue',d.venue)}<label><span class="label">Primary color</span><input type="color" id="t_c1" value="${tc[0]}" style="padding:2px;height:34px"></label><label><span class="label">Secondary color</span><input type="color" id="t_c2" value="${tc[1]}" style="padding:2px;height:34px"></label></div>
    <div class="ad-act">${btn('saveteam','Save team','','btn-amber')}${n&&DB.teams[n]?btn('delteam',A.arm==='delteam'?'Click again to delete':'Delete / reset team'):''}</div></div></div>`;
}
function playerItems(){
  const k=(A.q||'').trim().toLowerCase();
  const ps=Object.values(DB.players).filter(p=>!k||p.name.toLowerCase().includes(k)||p.team.toLowerCase().includes(k)||p.pos.toLowerCase()===k).sort((a,b)=>a.name.localeCompare(b.name));
  return ps.map(p=>`<div class="ad-row"><button class="ad-item ${p.name===A.p?'on':''}" data-a="player" data-v="${esc(p.name)}">${badge(p.name.slice(0,2).toUpperCase(),p.name,'sm')}<span>${esc(p.name)}<small>${p.pos} · ${esc(p.team)}</small></span></button>${btn('delrow',A.arm==='delrow:'+p.name?'Sure?':'✕',p.name)}</div>`).join('')||`<p class="sub">${k?'No players match.':'No players yet. Add one, or use the Stat adder.'}</p>`;
}
/* award roles: give or take any award for the player in the season being edited */
function awardRolesPanel(n){
  const defs=rbxAwardDefs(),win=(DB.awardWin||{})[A.season]||{},auto=computeAwards(A.season);
  return `<div class="label" style="margin:22px 0 4px">Award roles · Season ${A.season}</div>
   <p class="sub" style="margin-bottom:8px">Tick an award to make ${esc(n)} its winner this season. Unticked awards go back to Auto (most fantasy points). Change the season in the bar above to edit other seasons.</p>
   <div style="display:grid;gap:6px">${defs.map(d=>{const mine=win[d.id]===n,other=win[d.id]&&!mine,c=auto.find(x=>x.d.id===d.id),autoMe=!win[d.id]&&c&&c.p&&c.p.name===n;
     return `<label class="ad-chk"><input type="checkbox" data-awrole="${esc(d.id)}" ${mine?'checked':''}> <b style="color:${esc(d.color||'#f2b632')}">${esc(d.code)}</b> ${esc(d.name)}${other?` <span class="sub">(set to ${esc(win[d.id])}; ticking replaces them)</span>`:''}${autoMe?' <span class="sub">(currently wins automatically)</span>':''}</label>`}).join('')}</div>`;
}
function playersTab(){
  const n=A.p,d=DB.players[n]||{team:Object.keys(TEAMS)[0],pos:'QB',ss:{}};
  return `<div class="ad-cols"><div class="ad-list">${btn('newplayer','+ Add player','','btn-amber')}
    <input id="p_q" type="search" placeholder="Search players, team or position…" value="${esc(A.q||'')}" autocomplete="off">
    ${btn('demo',DB.showDemo?'Hide demo players on Stats':'Show demo players on Stats')}
    ${Object.keys(DB.players).length||DB.showDemo?btn('delall',A.arm==='delall'?'Click again: delete ALL players':'Delete all players'):''}
    <div id="p_items" style="display:flex;flex-direction:column;gap:6px">${playerItems()}</div></div>
   <div class="panel ad-form"><h3>${n?esc(n):'Add player'}</h3>
    <div class="fm-grid">${n?`<label><span class="label">Roblox username</span><input value="${esc(n)}" disabled></label>`:fld('p_name','Roblox username','')}
     <label><span class="label">Team (roster)</span><select id="p_team">${opt(Object.keys(TEAMS).sort(),d.team)}</select></label>
     <label><span class="label">Position</span><select id="p_pos">${opt(POS,d.pos)}</select></label></div>
    <div class="label" style="margin:16px 0 8px">Season ${A.season} stats</div>${n?fpLine(d):''}
    <div class="fm-grid s">${F.map(([k,l])=>`<label><span class="label">${l}</span><input type="number" data-st="${k}" value="${z(stOf(d,A.season),k)}"></label>`).join('')}</div>
    ${n?awardRolesPanel(n):'<p class="sub" style="margin-top:18px">Save the player first, then you can give them award roles here.</p>'}
    <div class="ad-act">${btn('saveplayer','Save player','','btn-amber')}${n?btn('clearstats',A.arm==='clearstats'?'Click again to clear':'Clear all stats')+btn('delplayer',A.arm==='delplayer'?'Click again to delete':'Delete player'):''}</div></div></div>`;
}
const EX=`UFF | Week 1 Game Recap
SINALOA RED DEVILS 36 — 32 ROSE CITY REAPERS
 Player of the Game
breakxu
 Game Date
09/13/2026
SINALOA RED DEVILS
2 players recorded
ROSE CITY REAPERS
2 players recorded
SINALOA RED DEVILS Stats
 Passing
breakxu | 18/27 | 558 YDS | 5 TD | 3 INT | 110.0 RTG | 67.0% CMP | 21.0 AVG | LNG 96 | 0 SCKED
 Receiving
stupidaffinity | 7 TGT | 7 REC | 285 YDS | 4 TD | 0 DROP | LNG 96
 Defense
breakxu | 9 TAK | 0 TFL | 0 SCK | 0 SAF | 0 SWAT | 1 INT | 0 PBU | 0 TD
ROSE CITY REAPERS Stats
 Passing
YoungvTee | 19/29 | 520 YDS | 4 TD | 2 INT | 120.0 RTG | 66.0% CMP | 18.0 AVG | LNG 54 | 3 SCKED
 Rushing
YoungvTee | 2 ATT | 29 YDS | 0 TD | 15.00 YPC | 0 FUM | 1 20+ | LNG 21
 Receiving
goodnoob9870 | 11 TGT | 11 REC | 226 YDS | 2 TD | 0 DROP | LNG 42`;
function statsTab(){
  const pv=A.pv;
  return `<div class="panel ad-form"><p class="sub" style="margin-bottom:10px">Paste the game recap in the same format as the Discord bot post. Team names come from the score line and the “<b>TEAM Stats</b>” lines, and are matched to your real teams even with typos, nicknames, cities or codes (“Spartans”, “Dorian”, “DOR”). “Team A / Team B” recaps are matched by the players’ rosters or the schedule, and you can fix any match in the preview. A name that matches no team is never turned into a new team: you pick the right team or skip it. Unknown players are created automatically. Stats are added to <b>Season ${A.season}</b> (change it in the season bar above).</p>
   <textarea id="a_txt" rows="14" placeholder="Paste recap here…">${esc(A.txt)}</textarea>
   <div class="ad-act">${btn('parse','Preview','','btn-amber')}${btn('example','Insert example')}
    <span class="sub">The schedule score, standings and box score update automatically from this recap.</span></div>
   ${pv?(pv.lines.length?`<div class="ad-prev"><b>${esc(okT(tkOf(pv,pv.a))?tkOf(pv,pv.a):(pv.a||'?'))} ${pv.sa??''} — ${esc(okT(tkOf(pv,pv.b))?tkOf(pv,pv.b):(pv.b||'?'))} ${pv.sb??''}</b> <span class="sub">${pv.date||'no date'}${pv.week?' · Week '+esc(pv.week):''}${pv.potg?' · Player of the game '+esc(pv.potg):''} · ${pv.lines.length} stat lines · ${new Set(pv.lines.map(l=>l.name.toLowerCase())).size} players</span>
     ${teamsBox(pv)}${matchNote(pv)}<div class="tablewrap"><table class="st"><thead><tr><th>PLAYER</th><th>TEAM</th><th>TYPE</th><th>STATS</th><th></th><th></th></tr></thead><tbody>${pv.lines.map((l,i)=>{
       const isNew=!Object.keys(DB.players).some(k=>k.toLowerCase()===l.name.toLowerCase());
       return `<tr><td class="pl">${esc(l.name)}</td><td>${tkOf(pv,l.team)===SKIP?'<i>skipped</i>':okT(tkOf(pv,l.team))?esc(tkOf(pv,l.team)):'<span style="color:var(--red)">unmatched</span>'}</td><td>${l.sec}</td><td>${Object.entries(l.st).map(([k,v])=>k+' '+v).join(' · ')}</td><td>${isNew?'<span style="color:var(--green)">NEW</span>':''}</td><td>${btn('dropline','Remove',i)}</td></tr>`}).join('')}</tbody></table></div>
     <div class="ad-act">${btn('savegame','Add stats to season','','btn-amber')}</div></div>`
     :'<p class="sub" style="margin-top:12px">No stat lines found. Each row needs “name | stat | stat…” under a “TEAM Stats” heading and a Passing / Rushing / Receiving / Defense heading.</p>'):''}</div>`+recPanel();
}
const fpLine=d=>{const by=fpBy(stOf(d,A.season),d),tot=ROLES.reduce((x,r)=>x+by[r],0);
  return `<p class="sub" style="margin-bottom:10px">Fantasy (each position separate): ${ROLES.filter(r=>by[r]).map(r=>r+' <b>'+by[r]+'</b>').join(' · ')||'none yet'} · Leaderboard total <b>${tot.toFixed(1)}</b></p>`};
const seasonBar=()=>`<div class="ad-seas"><span class="label">Editing season</span><select id="a_season">${[...DB.seasons].sort((x,y)=>y-x).map(n=>`<option value="${n}" ${n===A.season?'selected':''}>Season ${n}${n===DB.cur?' (current)':''}</option>`).join('')}</select></div>`;
function seasonsTab(){
  return `<div class="panel ad-form"><h3>Seasons</h3><p class="sub" style="margin-bottom:14px">Every panel (Teams, Player editor, Stat adder, Schedule, Awards) has a season bar, so each season keeps its own records, stats, schedule and award winners. The <b>current</b> season is the one the public site opens on.</p>
   <div style="display:grid;gap:8px">${[...DB.seasons].sort((x,y)=>y-x).map(n=>`<div class="ad-act" style="margin:0"><b style="min-width:100px">Season ${n}</b>${n===DB.cur?'<span class="label" style="color:var(--green)">Current season</span>':btn('setcur','Make current',n)}${btn('delseason',A.arm==='delseason:'+n?'Sure? Deletes its stats, records, schedule & winners':'Delete',n)}</div>`).join('')}</div>
   <div class="fm-grid" style="margin-top:18px;max-width:420px">${fld('s_new','New season number',Math.max(...DB.seasons)+1,'type="number"')}</div><div class="ad-act">${btn('addseason','+ Add season','','btn-amber')}</div></div>`;
}
function fantasyTab(){
  const L=Object.fromEntries(F);
  return `<div class="panel ad-form"><h3>Fantasy scoring</h3><p class="sub" style="margin-bottom:6px">Every position has its own fantasy score, built only from that position’s stats (points per unit). A player who plays two positions earns separate fantasy for each. Only the <b>leaderboard</b> and <b>MVP</b> add all positions together; <b>OPOY</b> adds QB+RB+WR+TE and <b>DPOY</b> adds DB+LB (DE slot) by default. Change which positions each award adds up in the Awards panel.</p>
   ${ROLES.map(r=>`<div class="label" style="margin:16px 0 8px">${PN[r]} (${r})</div><div class="fm-grid s">${Object.keys(DEFSC[r]).map(k=>`<label><span class="label">${L[k]}</span><input type="number" step="0.01" data-sc="${r}:${k}" value="${SW(r)[k]}"></label>`).join('')}</div>`).join('')}
   <div class="ad-act">${btn('savescoring','Save scoring','','btn-amber')}${btn('resetscoring','Reset to defaults')}</div></div>`;
}
function collectAw(){
  if(!A.aw)return;
  qa('[data-af]').forEach(el=>{const d=A.aw[+el.dataset.i];if(d)d[el.dataset.af]=el.value});
  qa('[data-asc]').forEach(el=>{const [i,r]=el.dataset.asc.split(':'),d=A.aw[+i];if(!d)return;d.scope=(d.scope||[]).filter(x=>x!==r);if(el.checked)d.scope.push(r)});
  qa('[data-aw]').forEach(el=>{const d=A.aw[+el.dataset.aw];if(!d)return;const m=A.aww[A.season]=A.aww[A.season]||{};if(el.value)m[d.id]=el.value;else delete m[d.id]});
  const o=q('#aw_one');if(o)A.one=o.checked;
}
function awardsTab(){
  if(!A.aw){A.aw=clone(rbxAwardDefs());A.aww=clone(DB.awardWin||{});A.one=DB.oneEach!==false}
  const cur=computeAwards(A.season),names=PLAYERS.map(p=>p.name).sort(),win=A.aww[A.season]||{};
  return `<div class="panel ad-form"><h3>Awards · Season ${A.season}</h3><p class="sub" style="margin-bottom:14px">Each award adds up the fantasy points of the positions ticked below. The top scorer wins automatically, or pick a winner by hand for this season.</p>
   <label class="ad-chk" style="margin-bottom:14px"><input type="checkbox" id="aw_one" ${A.one?'checked':''}> One award per player (skip anyone who already won an earlier award)</label>
   ${A.aw.map((d,i)=>{const c=cur.find(x=>x.d.id===d.id);return `<div class="ad-series"><div class="fm-grid">
     <label><span class="label">Award name</span><input data-af="name" data-i="${i}" value="${esc(d.name)}"></label>
     <label><span class="label">Short code</span><input data-af="code" data-i="${i}" value="${esc(d.code)}" maxlength="5"></label>
     <label><span class="label">Color</span><input type="color" data-af="color" data-i="${i}" value="${esc(d.color||'#f2b632')}" style="padding:2px;height:34px"></label>
     <label><span class="label">Winner, Season ${A.season}</span><select data-aw="${i}"><option value="">Auto (most points)</option>${PLAYERS.map(p=>({n:p.name,v:scopeFp(p,A.season,d.scope||[])})).sort((x,y)=>y.v-x.v||x.n.localeCompare(y.n)).map(x=>`<option value="${esc(x.n)}" ${x.n===win[d.id]?'selected':''}>${esc(x.n)} · ${x.v} pts</option>`).join('')}</select></label></div>
     <div class="ad-act"><span class="label" style="margin:0">Adds up fantasy from</span>${ROLES.map(r=>`<label class="ad-chk"><input type="checkbox" data-asc="${i}:${r}" ${(d.scope||[]).includes(r)?'checked':''}> ${r}</label>`).join('')}${btn('delaward',A.arm==='delaward:'+i?'Sure?':'Delete award',i)}</div>
     <p class="sub" style="margin-top:8px">Saved result: ${c&&c.p?esc(c.p.name)+' · '+c.val+' fantasy pts':'no candidate yet'}</p></div>`}).join('')}
   <div class="ad-act">${btn('addaward','+ Add award')}${btn('saveawards','Save awards','','btn-amber')}${btn('resetawards',A.arm==='resetawards'?'Click again to reset':'Reset awards to defaults')}</div></div>`;
}

/* ---------- All Flag teams (1st gold / 2nd silver / 3rd bronze) ---------- */
function afInit(){if(!A.afd){A.afd=clone(DB.allFlag||{});A.afa=DB.afAuto!==false}}
function collectAF(){
  if(!A.afd)return;const se=A.season;
  qa('[data-af2]').forEach(el=>{const [t,id]=el.dataset.af2.split(':'),m=(A.afd[se]=A.afd[se]||{}),tm=(m[t]=m[t]||{});if(el.value)tm[id]=el.value;else delete tm[id]});
  const c=q('#af_auto');if(c)A.afa=c.checked;
}
function allFlagTab(){
  afInit();const se=A.season,picks=(A.afd[se]||{});
  const cur=computeAllFlag(se,{pick:(s,t,id)=>((A.afd[s]||{})[t]||{})[id]||'',auto:A.afa}),RK={};
  const rk=sl=>RK[sl.role+sl.kind]||(RK[sl.role+sl.kind]=afRank(se,sl));
  const sel=(T,ti,sl,side)=>{
    const chosen=((picks[T.n]||{})[sl.id])||'',now=cur[ti][side].find(x=>x.s.id===sl.id),ranked=rk(sl),rn=new Set(ranked.map(x=>x.p.name));
    const others=PLAYERS.filter(p=>!rn.has(p.name)).map(p=>p.name).sort((a,b)=>a.localeCompare(b));
    const autoTxt=A.afa?('Auto'+(now&&now.p&&!now.manual?' · '+now.p.name:' · nobody left')):'Empty (auto-fill is off)';
    return `<label><span class="label">${sl.label}${sl.id==='LB'?' (by tackles)':sl.id==='DE'?' (by sacks)':/^WR|^DB/.test(sl.id)?' '+sl.id.slice(2):''}</span><select data-af2="${T.n}:${sl.id}"><option value="">${esc(autoTxt)}</option>
      ${ranked.length?`<optgroup label="Top ${sl.role==='LB'?'LB / DE':sl.role} by ${sl.kind==='sack'?'sacks':sl.kind==='tkl'?'tackles':'fantasy'}">${ranked.map(x=>`<option value="${esc(x.p.name)}" ${x.p.name===chosen?'selected':''}>${esc(x.p.name)} · ${esc(x.p.team)} · ${x.fp.toFixed(1)} pts</option>`).join('')}</optgroup>`:''}
      ${others.length?`<optgroup label="Everyone else">${others.map(n=>`<option value="${esc(n)}" ${n===chosen?'selected':''}>${esc(n)}</option>`).join('')}</optgroup>`:''}</select></label>`};
  const grp=(T,ti,side,title,slots)=>`<div class="label" style="margin:14px 0 8px;color:${T.col}">${T.short} Team All Flag ${title}</div><div class="fm-grid">${slots.map(sl=>sel(T,ti,sl,side)).join('')}</div>`;
  return `<div class="panel ad-form"><h3>All Flag teams · Season ${se}</h3>
   <p class="sub" style="margin-bottom:14px">Pick who is on the 1st team (gold medals), 2nd team (silver) and 3rd team (bronze). Leave a spot on <b>Auto</b> and the site fills it with the best remaining player by fantasy points (DE by sacks, LB by tackles). A player can only be on one team at each position group. Press <b>Save</b> to publish.</p>
   <label class="ad-chk" style="margin-bottom:6px"><input type="checkbox" id="af_auto" ${A.afa?'checked':''}> Auto-fill spots I leave empty</label>
   ${AF_TIERS.map((T,ti)=>`<div class="ad-series" style="border-top:3px solid ${T.col};margin-top:14px"><div class="ad-act" style="margin:0 0 4px;gap:12px">${medal(T.n,'lg')}<b style="font-family:var(--disp);font-size:24px;text-transform:uppercase;letter-spacing:.02em">${T.short} Team · ${MEDALN[T.n]} medals</b></div>
     ${grp(T,ti,'off','Offense',AF_OFF)}${grp(T,ti,'def','Defense',AF_DEF)}</div>`).join('')}
   <div class="ad-act">${btn('saveaf','Save All Flag teams','','btn-amber')}${btn('resetaf',A.arm==='resetaf'?'Click again to clear':'Clear this season’s picks')}</div></div>`;
}
/* ---------- Playoffs: any number of rounds and games, you choose who advances ---------- */
const poBlank=()=>({a:'',b:'',sa:null,sb:null,win:''});
function poInit(){if(!A.po||A.poS!==A.season){A.po=clone((DB.playoffs||{})[A.season]||{name:'Playoffs',rounds:[]});A.poS=A.season}}
function collectPO(){
  if(!A.po)return;const P=A.po,nm=q('#po_name');if(nm)P.name=nm.value;
  qa('[data-po]').forEach(el=>{const k=el.dataset.po.split(':');
    if(k[0]==='r'){const r=P.rounds[+k[1]];if(r)r.name=el.value}
    else{const g=(P.rounds[+k[1]]||{games:[]}).games[+k[2]];if(!g)return;const f=k[3];g[f]=(f==='sa'||f==='sb')?(el.value===''?null:+el.value):el.value}});
}
const poWin=g=>g.win==='a'&&g.a?g.a:g.win==='b'&&g.b?g.b:(g.sa!=null&&g.sb!=null&&g.sa!==g.sb&&g.a&&g.b?(g.sa>g.sb?g.a:g.b):'');
function playoffsTab(){
  poInit();const P=A.po,tn=Object.keys(TEAMS).sort();
  const tsel=(v,at)=>`<select ${at}><option value="">TBD</option>${tn.map(t=>`<option ${t===v?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
  return `<div class="panel ad-form"><h3>Playoffs · Season ${A.season}</h3>
   <p class="sub" style="margin-bottom:14px">Build the bracket round by round. Add as many rounds and games as you need, pick the two teams, type the score if you like, then choose <b>Advances</b> to say who moves on. <b>Send winners to next round</b> fills the next round for you (a game with no pick uses the higher score). Press <b>Save playoffs</b> to publish; it shows on the Playoffs page.</p>
   <div class="fm-grid" style="max-width:420px;margin-bottom:14px"><label><span class="label">Bracket title</span><input id="po_name" value="${esc(P.name||'Playoffs')}"></label></div>
   ${P.rounds.map((r,ri)=>`<div class="ad-series"><div class="ad-act" style="margin:0 0 10px"><input data-po="r:${ri}" value="${esc(r.name)}" style="max-width:220px">${btn('pogame','+ Add game',ri+',0')}${btn('posend','Send winners to next round',ri)}${btn('podelround',A.arm==='podelround:'+ri?'Sure?':'Delete round',ri)}</div>
     ${r.games.map((g,gi)=>`<div class="po-game">${tsel(g.a,`data-po="g:${ri}:${gi}:a"`)}<input type="number" data-po="g:${ri}:${gi}:sa" value="${g.sa??''}" placeholder="–"><span>vs</span><input type="number" data-po="g:${ri}:${gi}:sb" value="${g.sb??''}" placeholder="–">${tsel(g.b,`data-po="g:${ri}:${gi}:b"`)}
       <select data-po="g:${ri}:${gi}:win"><option value="">Advances: choose…</option><option value="a" ${g.win==='a'?'selected':''}>${esc(g.a||'Team 1')} advances</option><option value="b" ${g.win==='b'?'selected':''}>${esc(g.b||'Team 2')} advances</option></select>${btn('podelgame','✕',ri+','+gi)}</div>`).join('')||'<p class="sub">No games in this round yet.</p>'}</div>`).join('')||'<p class="sub">No rounds yet. Press “+ Add round” to start the bracket.</p>'}
   <div class="ad-act">${btn('poround','+ Add round')}${btn('posave','Save playoffs','','btn-amber')}${P.rounds.length?btn('poclear',A.arm==='poclear'?'Click again to clear':'Clear bracket'):''}</div></div>`;
}
window.viewAdmin=function(){
  if(!DB.seasons.includes(A.season))A.season=DB.cur;
  const head=pageHead('Commissioner tools','Admin','Manage seasons, teams, rosters, stats, schedule, live streams, VODs, fantasy scoring, awards and All Flag teams.');
  if(!authed){const um=A.lm!=='key';return head+`<div class="panel ad-form" style="max-width:380px;padding:16px"><div style="display:flex;gap:8px;margin-bottom:12px"><button class="${um?'btn-amber':''}" style="flex:1;padding:10px;border:1px solid var(--line);border-radius:6px;font-size:11px;font-weight:700;color:inherit;${um?'':'background:transparent'}" data-a="lmode" data-v="user">Username/Password</button><button class="${um?'':'btn-amber'}" style="flex:1;padding:10px;border:1px solid var(--line);border-radius:6px;font-size:11px;font-weight:700;color:inherit;${um?'background:transparent':''}" data-a="lmode" data-v="key">Admin Key</button></div>${um?`<label><span class="label">Username</span><input id="a_user" autocomplete="username"></label><label><span class="label">Password</span><input id="a_pw" type="password" autocomplete="current-password"></label>`:`<label><span class="label">Admin key</span><input id="a_pw" type="password" autocomplete="current-password"></label>`}<div class="ad-act">${btn('login','Access admin panel','','btn-amber')}</div><p class="sub" id="a_err">${esc(A.msg)}</p></div>`}
  const tabs=[['overview','Overview'],['teams','Teams'],['players','Player editor'],['stats','Stat adder'],['schedule','Schedule'],['live','Live streams'],['vods','VODs'],['awards','Awards'],['allflag','All Flag teams'],['playoffs','Playoffs'],['fantasy','Fantasy scoring'],['seasons','Seasons'],...(window.ADX?ADX.tabs:[])];
  let localData=false;
  if(mode==='server'){try{const L=JSON.parse(localStorage.getItem('rbx-db')||'null'),has=o=>Object.keys(o||{}).length>0;
    localData=!!L&&(has(L.teams)||has(L.players)||(L.games||[]).length||Object.values(L.schedules||{}).some(x=>x&&x.series&&x.series.some(y=>y.matches.some(m=>m.games.length))))&&!has(DB.teams)&&!has(DB.players)&&!(DB.games||[]).length&&!Object.values(DB.schedules||{}).some(x=>x&&x.series&&x.series.length)}catch(e){}}
  return head+`<div class="ad">${localData?`<div class="panel" style="padding:14px 16px;margin-bottom:12px"><p class="sub" style="margin-bottom:10px">This browser has admin data (teams, players, schedule, stats) saved from before the server was connected. The server is empty, so visitors cannot see it yet.</p>${btn('importlocal','Copy this browser’s data to the server','','btn-amber')}</div>`:''}${mode==='local'?'<p class="sub" style="margin-bottom:10px">Server not detected, so changes save in this browser only. Run the site with <b>npm start</b> to save for everyone.</p>':''}
   <div class="srow">${tabs.map(([k,l])=>`<button class="pbtn ${A.tab===k?'on':''}" data-a="tab" data-v="${k}"><b>${l}</b></button>`).join('')}${mode==='server'?btn('logout','Sign out'):''}</div>
   ${A.msg?`<div class="ad-msg">${esc(A.msg)}</div>`:''}
   ${(window.ADX&&ADX.has(A.tab))?ADX.view(A.tab):''}${['seasons','fantasy','live','vods'].includes(A.tab)||(window.ADX&&ADX.has(A.tab))?'':seasonBar()}${(window.ADX&&ADX.has(A.tab))?'':A.tab==='teams'?teamsTab():A.tab==='players'?playersTab():A.tab==='schedule'?schedTab():A.tab==='live'?liveTab():A.tab==='vods'?vodsTab():A.tab==='awards'?awardsTab():A.tab==='allflag'?allFlagTab():A.tab==='playoffs'?playoffsTab():A.tab==='fantasy'?fantasyTab():A.tab==='seasons'?seasonsTab():statsTab()}</div>`;
};
function confirmed(k){if(A.arm===k){A.arm='';return true}A.arm=k;A.msg='Click the button again to confirm.';draw();return false}
function draw(){if(location.hash.startsWith('#/admin'))q('#app').innerHTML=viewAdmin()}
async function commit(ok_msg){
  const ok=await save();A.msg=ok?ok_msg:'Save failed. Check your admin password and connection.';
  if(ok){merge();}
  draw();
}

/* ---------- events ---------- */
const val=id=>(q('#'+id)||{}).value;
document.addEventListener('input',e=>{if(e.target.id==='t_c1'||e.target.id==='t_c2'){const p=q('#logoprev');if(p&&!p.querySelector('img'))p.style.background=`linear-gradient(135deg,${val('t_c1')},${val('t_c2')})`}if(e.target.id==='a_txt')A.txt=e.target.value;if(e.target.id==='p_q'){A.q=e.target.value;q('#p_items').innerHTML=playerItems()}});
document.addEventListener('change',async e=>{
  const t=e.target;
  if(t.value==='__new__'&&t.dataset&&(t.dataset.f==='home'||t.dataset.f==='away')){
    collectSched();const g=((A.sch[+t.dataset.s]||{matches:[]}).matches[+t.dataset.m]||{games:[]}).games[+t.dataset.g];
    const nm=(prompt('New team name:')||'').trim();
    if(g){g[t.dataset.f]=''; if(nm){const f=matchTeam(nm)||nm;if(!TEAMS[f]&&!DB.teams[f]){DB.teams[f]=newTeam(f);await save();merge();A.msg='Team “'+f+'” created. Edit its logo and colors in Admin > Teams.'}g[t.dataset.f]=f}}
    return draw();
  }
  if(e.target.id==='a_season'){collectAw();collectAF();A.po=null;A.season=+e.target.value;A.sch=null;A.pv=null;A.logo=null;return draw()}
  if(e.target.id==='sh_file'&&e.target.files[0]){const f=e.target.files[0];A.msg='Reading file…';draw();importOds(f);return}
  if(e.target.id==='a_rec')A.rec=e.target.checked;
  if((e.target.dataset&&e.target.dataset.af2!==undefined)||e.target.id==='af_auto'){collectAF();return draw()}
  if(e.target.dataset&&e.target.dataset.tm!==undefined&&A.pv){const n=e.target.dataset.tm,v=e.target.value;A.pv.map=A.pv.map||{};A.pv.how=A.pv.how||{};if(v)A.pv.map[n]=v;else delete A.pv.map[n];delete A.pv.how[n];return draw()}
  if(e.target.dataset&&e.target.dataset.a==='logo'&&e.target.files[0])resize(e.target.files[0],u=>{A.logo=u;draw()});
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-a]');if(!b||b.tagName==='INPUT')return;
  const a=b.dataset.a,v=b.dataset.v;A.msg='';if(A.arm&&!A.arm.startsWith(a))A.arm='';
  if(window.ADX&&await ADX.act(a,v))return;
  if(a==='lmode'){A.lm=v;A.msg='';return draw()}
  if(a==='login'){sessionStorage.setItem(KEY,val('a_pw')||'');if(A.lm==='key')sessionStorage.removeItem(KEY+'-user');else sessionStorage.setItem(KEY+'-user',(val('a_user')||'').trim());if(mode==='local'){await load();merge()} /* the server may be reachable now */
    authed=await chk();A.msg=authed?'':(mode==='local'?'Cannot reach the site server, so the passcode cannot be checked. Open the site from the running Node server (the Run button on Replit, or npm start), not as a static page.':'Wrong username/password or admin key.');return draw()}
  if(a==='importlocal'){
    try{const L=JSON.parse(localStorage.getItem('rbx-db')||'null');if(!L)throw 0;DB=L;DB.teams=DB.teams||{};DB.players=DB.players||{};DB.games=DB.games||[];DB.live=DB.live||[];DB.vods=DB.vods||[];migrate();
      if(await save()){merge();A.msg='Your browser’s saved data was copied to the server. It now shows for everyone.';return draw()}}catch(e){}
    await load();merge();A.msg='Could not copy the browser data to the server. Nothing was changed.';return draw()}
  if(a==='logout'){sessionStorage.removeItem(KEY);sessionStorage.removeItem(KEY+'-user');authed=false;return draw()}
  if(a==='tab'){A.tab=v;A.po=null;A.pv=null;A.sch=null;A.aw=null;A.afd=null;return draw()}
  if(a==='team'){A.t=v;A.logo=null;return draw()}
  if(a==='newteam'){A.t='';A.logo=null;return draw()}
  if(a==='clearlogo'){A.logo='';return draw()}
  if(a==='saveteam'){
    const n=A.t||(val('t_name')||'').trim();if(!n){A.msg='Enter a team name.';return draw()}
    const old=DB.teams[n]||{rec:ORIGT[n]?{[DEMOS]:Object.assign({},ORIGT[n])}:{}};
    DB.teams[n]={ab:(val('t_ab')||ini(n)).toUpperCase(),code:(val('t_code')||n.slice(0,3)).toUpperCase(),conf:val('t_conf'),div:val('t_div'),venue:val('t_venue')||'TBD',
      colors:[val('t_c1'),val('t_c2')],rec:old.rec||{},logo:A.logo!==null?A.logo:(old.logo||'')};
    A.t=n;A.logo=null;return commit('Team saved.');
  }
  if(a==='delteam'){if(!confirmed('delteam'))return;delete DB.teams[A.t];await save();return location.reload()}
  if(['poround','podelround','pogame','podelgame','posend','posave','poclear'].includes(a)){
    collectPO();poInit();const P=A.po,[ri,gi]=(v||'').split(',').map(Number);
    if(a==='poround'){P.rounds.push({name:'Round '+(P.rounds.length+1),games:[poBlank()]});return draw()}
    if(a==='podelround'){if(!confirmed('podelround:'+v))return;P.rounds.splice(ri,1);return draw()}
    if(a==='pogame'){P.rounds[ri].games.push(poBlank());return draw()}
    if(a==='podelgame'){P.rounds[ri].games.splice(gi,1);return draw()}
    if(a==='poclear'){if(!confirmed('poclear'))return;P.rounds=[];A.msg='Bracket cleared. Press Save playoffs to keep this change.';return draw()}
    if(a==='posend'){
      const cur=P.rounds[ri],w=cur.games.map(poWin);
      if(cur.games.length===1&&!P.rounds[ri+1]){A.msg=w[0]?w[0]+' wins it all. This is the final, so there is no next round.':'Pick who advances in the final.';return draw()}
      if(!w.some(Boolean)){A.msg='Choose who advances in at least one game of this round first.';return draw()}
      const nx=P.rounds[ri+1]||(P.rounds.push({name:'Round '+(ri+2),games:[]}),P.rounds[ri+1]);
      for(let k=0;k*2<w.length;k++){const x=w[k*2]||'',y=w[k*2+1]||'';let g=nx.games[k];if(!g){g=poBlank();nx.games.push(g)}
        if(g.a!==x||g.b!==y){g.a=x;g.b=y;g.sa=g.sb=null;g.win=''}}
      A.msg=`${w.filter(Boolean).length} winner${w.filter(Boolean).length>1?'s':''} sent to ${nx.name}.`+(w.some(x=>!x)?' Some games had no winner yet, so their spot is TBD.':'');return draw();
    }
    if(a==='posave'){DB.playoffs=DB.playoffs||{};DB.playoffs[A.season]=clone(P);A.po=null;return commit('Playoffs saved. They show on the Playoffs page.')}
  }
  if(a==='player'){A.p=v;return draw()}
  if(a==='newplayer'){A.p='';return draw()}
  if(a==='saveplayer'){
    const n=A.p||(val('p_name')||'').trim();if(!n){A.msg='Enter a Roblox username.';return draw()}
    const st={};qa('[data-st]').forEach(i=>{if(+i.value)st[i.dataset.st]=+i.value});
    const aw=DB.awardWin=DB.awardWin||{},sw=aw[A.season]=aw[A.season]||{};
    qa('[data-awrole]').forEach(i=>{const id=i.dataset.awrole;if(i.checked)sw[id]=n;else if(sw[id]===n)delete sw[id]});
    DB.players[n]={name:n,team:val('p_team'),pos:val('p_pos'),ss:Object.assign({},(DB.players[n]||{}).ss,{[A.season]:st})};A.p=n;return commit('Player saved.');
  }
  if(a==='clearstats'){
    if(!confirmed('clearstats'))return;
    (DB.players[A.p].ss=DB.players[A.p].ss||{})[A.season]={};return commit('Season '+A.season+' stats cleared for '+A.p+'.');
  }
  if(a==='delplayer'||a==='delrow'){
    const n=a==='delrow'?v:A.p;if(!confirmed(a==='delrow'?'delrow:'+n:'delplayer'))return;
    delete DB.players[n];if(A.p===n)A.p='';
    return commit(n+' deleted.');
  }
  if(a==='delall'){
    if(!confirmed('delall'))return;
    const c=Object.keys(DB.players).length;DB.players={};DB.showDemo=false;A.p='';
    return commit(`All players deleted (${c}). The Stats page is now empty.`);
  }
  if(a==='demo'){DB.showDemo=!DB.showDemo;return commit(DB.showDemo?'Demo players are shown on the Stats page.':'Demo players hidden. The Stats page now shows only players you added.')}
  if(['addseries','addmatch','addgame','delseries','delmatch','delgame'].includes(a)){
    collectSched();const [si,mi,gi]=(v||'').split(',').map(Number);
    if(a==='addseries'){const w=Math.max(0,...A.sch.flatMap(x=>x.matches.map(m=>m.week)))+1;A.sch.push({name:'Series '+(A.sch.length+1),matches:[{week:w,name:'Week '+w,games:[]}]})};
    if(a==='addmatch'){const w=Math.max(0,...A.sch.flatMap(x=>x.matches.map(m=>m.week)))+1;A.sch[si].matches.push({week:w,name:'Week '+w,games:[]})}
    if(a==='addgame')A.sch[si].matches[mi].games.push({home:'',away:'',hs:null,as:null});
    if(a==='delgame')A.sch[si].matches[mi].games.splice(gi,1);
    if(a==='delseries'){if(!confirmed('delseries:'+v))return;A.sch.splice(si,1)}
    if(a==='delmatch'){if(!confirmed('delmatch:'+v))return;A.sch[si].matches.splice(mi,1)}
    return draw();
  }
  if(a==='savesched'){
    collectSched();let bad=0,dropped=0;
    A.sch.forEach(s=>s.matches.forEach(m=>{m.games=m.games.filter(g=>{if(!g.home||!g.away){dropped++;return false}if(g.home===g.away)bad++;return true})}));
    if(bad){A.msg='A game has the same team on both sides. Fix it and save again.';return draw()}
    fixWeeks(A.sch);dedupeOpen(A.sch);const made=ensureTeams(A.sch);
    const wasAuto=!!sc(A.season).auto;
    DB.schedules[A.season]=Object.assign({},sc(A.season),{series:clone(A.sch),extra:[],auto:false});A.sch=null;
    return commit('Schedule saved.'+madeMsg(made)+(wasAuto?' Google Sheets auto-sync was turned off so it does not overwrite your edits (tick it again and re-import to go back to the sheet).':'')+(dropped?` ${dropped} incomplete game${dropped>1?'s were':' was'} skipped.`:''));
  }
  if(a==='import'){
    collectSched();const url=(val('sh_url')||'').trim(),names=(val('sh_names')||'').split(',').map(x=>x.trim()).filter(Boolean);
    try{
      const ser=await fetchSheet(url,names),n=ser.reduce((t,x)=>t+x.matches.reduce((u,m)=>u+m.games.length,0),0);
      if(!n){A.msg='No games found in those tabs. Check the tab names and layout.';return draw()}
      fixWeeks(ser);const made=ensureTeams(ser);DB.schedules[A.season]={series:ser,url,names,auto:q('#sh_auto').checked,extra:sc(A.season).extra||[]};SYNC[A.season]=clone(ser);A.sch=null;
      return commit(`Imported ${n} games from ${ser.length} tab${ser.length>1?'s':''}. Open the Schedule page to see them.`+madeMsg(made));
    }catch(e){A.msg=e.message;return draw()}
  }
  if(a==='pastesheet'){
    collectSched();const nm=(val('ps_name')||'').trim()||'Series I',ser=parseSheet(val('ps_txt')||'',nm,'\t');
    const n=ser.matches.reduce((t,m)=>t+m.games.length,0);
    if(!n){A.msg='No games found in what you pasted. Copy the whole tab (Ctrl+A, Ctrl+C) from Google Sheets.';return draw()}
    const base=schedFor(A.season),i=base.findIndex(x=>x.name.toLowerCase()===nm.toLowerCase());
    if(i>-1)base[i]=ser;else base.push(ser);
    fixWeeks(base);const made=ensureTeams(base);
    DB.schedules[A.season]=Object.assign({},sc(A.season),{series:base});A.sch=null;
    return commit(`Imported ${n} games into ${nm}. Open the Schedule page to see them.`+madeMsg(made));
  }
  if(a==='addseason'){const n=+val('s_new');if(!n||n<1||DB.seasons.includes(n)){A.msg='Enter a season number that does not exist yet.';return draw()}DB.seasons.push(n);A.season=n;A.aw=null;A.sch=null;return commit('Season '+n+' added. Use the season bar in any panel to edit its teams, players, stats, schedule and awards.')}
  if(a==='setcur'){DB.cur=+v;return commit('Season '+v+' is now the current season on the public site.')}
  if(a==='delseason'){const n=+v;if(DB.seasons.length<2){A.msg='You need at least one season.';return draw()}if(!confirmed('delseason:'+v))return;
    DB.seasons=DB.seasons.filter(x=>x!==n);Object.values(DB.players).forEach(p=>{if(p.ss)delete p.ss[n]});Object.values(DB.teams).forEach(t=>{if(t.rec)delete t.rec[n]});delete DB.schedules[n];delete DB.awardWin[n];if(DB.playoffs)delete DB.playoffs[n];if(DB.allFlag)delete DB.allFlag[n];
    if(DB.cur===n)DB.cur=Math.max(...DB.seasons);if(A.season===n)A.season=DB.cur;A.aw=null;A.sch=null;return commit('Season '+n+' deleted.')}
  if(a==='savescoring'){const s={};qa('[data-sc]').forEach(i=>{const [r,k]=i.dataset.sc.split(':');(s[r]=s[r]||{})[k]=+i.value||0});DB.scoring=s;return commit('Fantasy scoring saved.')}
  if(a==='resetscoring'){DB.scoring={};return commit('Fantasy scoring reset to defaults.')}
  if(a==='saveaf'){collectAF();afInit();DB.allFlag=A.afd;DB.afAuto=A.afa;A.afd=null;return commit('All Flag teams saved. They show on the Awards page and on each player’s profile.')}
  if(a==='resetaf'){collectAF();if(!confirmed('resetaf'))return;afInit();delete A.afd[A.season];A.msg='Season '+A.season+' picks cleared. Press Save to keep this change.';return draw()}
  if(a==='addaward'){collectAw();A.aw.push({id:'a'+Date.now().toString(36),name:'New award',code:'NEW',color:'#f2b632',scope:['QB']});return draw()}
  if(a==='delaward'){collectAw();if(!confirmed('delaward:'+v))return;const d=A.aw.splice(+v,1)[0];Object.values(A.aww).forEach(m=>delete m[d.id]);return draw()}
  if(a==='saveawards'){collectAw();DB.awardDefs=A.aw.map(d=>Object.assign({},d,{name:d.name.trim()||'Award',code:(d.code||'').trim()||'AWD',scope:ROLES.filter(r=>(d.scope||[]).includes(r))}));DB.awardWin=A.aww;DB.oneEach=A.one;A.aw=null;return commit('Awards saved.')}
  if(a==='resetawards'){if(!confirmed('resetawards'))return;DB.awardDefs=null;DB.awardWin={};A.aw=null;return commit('Awards reset to the defaults.')}
  if(a==='addlive'||a==='addvod'){
    const v=a==='addlive'?'lv':'vd',url=(val(v+'_url')||'').trim(),e=rbxEmbed(url);
    if(!e){A.msg='That is not a YouTube or Twitch link. Paste the full link from the address bar.';return draw()}
    let title=(val(v+'_title')||'').trim();
    if(a==='addlive'){DB.live.push({id:rid(),title:title||'Live stream',url});return commit('Live stream added. It shows on the Live page.'+(e.noembed?' Note: this kind of YouTube page cannot be embedded, so visitors will get a link to open it.':''))}
    const kind=val('vd_type')||(e.site==='twitch'&&/\/videos\//.test(url)?'broadcast':'highlight');
    DB.vods.push({id:rid(),title:title||'Video',url,kind,note:(val('vd_note')||'').trim()});
    return commit('VOD added. It shows on the VODs page.'+(e.noembed?' Note: this kind of YouTube page cannot be embedded, so visitors will get a link to open it.':''));
  }
  if(a==='dellive'){DB.live=DB.live.filter(x=>String(x.id)!==String(v));return commit('Live stream removed.')}
  if(a==='delvod'){DB.vods=DB.vods.filter(x=>String(x.id)!==String(v));return commit('VOD removed.')}
  if(a==='delrec'){const gm=DB.games.find(g=>String(g.id)===String(v));if(!gm)return draw();if(!confirmed('delrec:'+v))return;const n=removeGame(gm.id);return commit('Recap removed and its stats taken back out.'+(n?` ${n} player${n>1?'s':''} created by it ${n>1?'were':'was'} removed too.`:''))}
  if(a==='schedrec'){const gm=DB.games.find(g=>String(g.id)===String(v));if(!gm)return draw();addToSched({week:gm.week},gm);return commit('Game added to the Season '+A.season+' schedule.')}
  if(a==='dropline'){A.pv.lines.splice(+v,1);return draw()}
  if(a==='example'){A.txt=EX;A.pv=null;return draw()}
  if(a==='parse'){A.txt=val('a_txt')||'';A.pv=resolveRecap(parse(A.txt));return draw()}
  if(a==='savegame'){
    const bad=rawNames(A.pv).find(n=>!okT(tkOf(A.pv,n))&&tkOf(A.pv,n)!==SKIP);
    if(bad){A.msg='No team was found for “'+bad+'”. Pick the right team (or Skip) in the “Teams found in this recap” box. New teams are never created from stats.';return draw()}
    if(A.pv.a&&A.pv.b&&tkOf(A.pv,A.pv.a)===tkOf(A.pv,A.pv.b)&&tkOf(A.pv,A.pv.a)!==SKIP){A.msg='Both sides of the score line matched the same team. Fix the team matches in the preview.';return draw()}
    const {gm,r,onSched,old}=recordRecap(A.pv),rep=old.length?'Replaced the earlier recap for these teams (its stats were taken out first, nothing is counted twice). ':'';
    if(gm&&A.season===S.season){linked(A.season).forEach((x,xi)=>x.matches.forEach((m,mi)=>m.games.forEach(g=>{if(g.gid===gm.id){S.series=xi+1;S.week=mi+1;S.sel=0}})))}const names=[...new Set(A.pv.lines.map(l=>l.name.toLowerCase()))];A.pv=null;A.txt='';
    const by={};Object.values(DB.players).filter(p=>names.includes(p.name.toLowerCase())).forEach(p=>(by[p.pos]=by[p.pos]||[]).push(p.name));
    if(by[Object.keys(by)[0]])S.pos=Object.keys(by)[0];
    return commit(rep+(!gm?'No game was recorded (need both teams found), so the schedule and box score were NOT updated. ':gm.sa==null?'Stats added to the game’s box score (no score line, so the schedule score was not changed). ':onSched?'Schedule score updated. ':'Game added to the Season '+A.season+' schedule with its score. ')+`Stats added (${r.players} new player${r.players===1?'':'s'}). On the Stats page, pick the position tab: `+Object.entries(by).map(([k,v])=>k+': '+v.join(', ')).join(' | '));
  }
});

const st=document.createElement('style');
st.textContent=`.ad-cols{display:grid;grid-template-columns:240px 1fr;gap:18px;align-items:start}@media(max-width:800px){.ad-cols{grid-template-columns:1fr}}
.ad-list{display:flex;flex-direction:column;gap:6px;max-height:70vh;overflow:auto}.ad-list .btn-amber{padding:11px}
.ad-row{display:flex;gap:6px}.ad-row .ad-item{flex:1;min-width:0}.ad-row .chip{border:1px solid var(--line);border-radius:6px;padding:0 10px}
.ad-item{display:flex;align-items:center;gap:10px;text-align:left;padding:8px;border:1px solid var(--line);border-radius:6px;font-size:13px}.ad-item.on{border-color:var(--amber);background:rgba(255,214,10,.07)}
.ad-item small{display:block;color:var(--dim);font-size:11px}
.ad-form{padding:20px}.ad-form h3{font-family:var(--disp);font-size:26px;text-transform:uppercase;margin-bottom:14px}
.ad input:not([type=checkbox]),.ad select,.ad textarea,#a_pw,#a_user{width:100%;background:var(--panel2);border:1px solid var(--line2);color:var(--text);border-radius:4px;padding:8px 10px;font:13px var(--body)}
.ad-form label{display:block;margin-bottom:12px}.ad-form .label{display:block;margin-bottom:4px}
.ad textarea{font-family:var(--code);font-size:12px}.ad label{display:block}.ad .label{display:block;margin-bottom:4px}
.fm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}.fm-grid.s{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}
.ad-act{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:16px}.ad-act .btn-amber{display:inline-block;padding:11px 16px}
.ad-logo{display:flex;align-items:center;gap:12px;margin-bottom:16px}.ad-chk{display:flex!important;gap:8px;align-items:center;font-size:12px;color:var(--dim)}
.ad-msg{background:rgba(95,191,155,.1);border:1px solid var(--green);color:var(--green);padding:10px 14px;border-radius:6px;margin-bottom:14px;font-size:13px}
.ad-series{border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:14px}.ad-match{background:var(--panel2);border-radius:6px;padding:12px;margin-bottom:10px}
.ad-game{display:grid;grid-template-columns:1fr 64px auto 64px 1fr auto;gap:8px;align-items:center;margin-bottom:8px}.ad-game span{color:var(--dim);font-size:11px}@media(max-width:700px){.ad-game{grid-template-columns:1fr 60px 60px}}
.vframe{position:relative;aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden}.vframe iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.vgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}.vcard{padding:12px}.vcard h3{font-size:15px;margin:10px 0 2px}.vcard .sub{font-size:12px}
.vplay{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background-size:cover;background-position:center;background-color:#151b26;cursor:pointer;border:0;color:#fff}
.vplay span{width:54px;height:54px;border-radius:50%;background:rgba(255,214,10,.92);color:#000;display:flex;align-items:center;justify-content:center;font-size:20px;padding-left:4px}
.vplay small{position:absolute;left:10px;bottom:8px;font:9px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:#fff;text-shadow:0 1px 3px #000}
.ad-prev{margin-top:18px}.ad-prev .tablewrap{margin-top:10px;max-height:340px;overflow:auto}
.po-game{display:grid;grid-template-columns:1fr 64px auto 64px 1fr 170px auto;gap:8px;align-items:center;margin-bottom:8px}.po-game span{color:var(--dim);font-size:11px}@media(max-width:900px){.po-game{grid-template-columns:1fr 60px 60px}}
.ad-seas{display:flex;align-items:center;gap:10px;margin:0 0 14px}.ad .ad-seas select{width:auto;min-width:190px}`;
document.head.appendChild(st);

async function resync(){
  if(mode!=='server')return;
  await load();
  merge();await syncSheet();applySeason();
}
window.addEventListener('hashchange',async()=>{if(location.hash.startsWith('#/admin'))return;await resync();route()});
window.ADC={get DB(){return DB},A,draw:()=>draw(),save:()=>save(),esc:s=>esc(s),btn:(...a)=>btn(...a),authH:()=>authH()};
window.rbxBoot=async function(){
  await load();merge();await syncSheet();applySeason();
  authed=!!pw()&&await chk(); /* a passcode is always required; if the site server cannot be reached the check fails and admin stays locked */
  route();
};
})();

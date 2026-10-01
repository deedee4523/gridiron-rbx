/* Crowns & Titles (shown on the Awards page, edited in Admin > Crowns & Titles).
   CROWN = a player leads EVERY stat category of a position ("Leading all QB category's").
   TITLE = a player leads ONE stat category of a position ("Leading all DB's in interceptions").
   A player who holds a position's crown does not also get that position's titles.
   Winners are worked out from the season's player stats. An admin can override any single crown/title per season. */
(function(){
const DBx=()=>(window.rbxDB?rbxDB():{})||{};
/* role = which stat table the numbers come from; cats = [stat key, wording on the title]. */
const POS={
 QB:{role:'QB',cats:[['yds','passing yards'],['td','passing touchdowns'],['comp','completions']]},
 RB:{role:'RB',cats:[['yds','yards'],['td','touchdowns']]},
 WR:{role:'WR',cats:[['rec','receptions'],['yds','yards'],['td','touchdowns']]},
 TE:{role:'TE',cats:[['rec','receptions'],['yds','yards'],['td','touchdowns']]},
 DB:{role:'DB',cats:[['int','interceptions'],['pd',"PBU's"],['tkl','tackles']]},
 LB:{role:'LB',cats:[['tkl','tackles'],['sack','sacks'],['int','interceptions']]},
 DE:{role:'LB',cats:[['sack','sacks'],['tfl','tackles for loss'],['ff','forced fumbles']],crownOnly:true}
};
const CROWN_ORDER=['QB','RB','WR','TE','DB','LB','DE'],TITLE_ORDER=['DB','RB','LB','QB','WR','TE'];
const roles=(p,se)=>(p.custom&&window.rbxRoles)?rbxRoles(p,se):[p.pos];
function val(p,se,role,key){
  if(role==='LB'&&key==='int'){            /* interceptions by a linebacker live in the Def INT stat */
    if(p.custom){if(p.pos!=='LB')return 0;return +(((p.ss||{})[se]||{}).di)||0}
    return p.pos==='LB'?(+(statsFor(p,se).int)||0):0;
  }
  if(key==='tkl'&&p.custom){               /* tackles belong to ONE position (same rule as the fantasy score), not both */
    const t=((p.ss||{})[se])||{},own=p.pos==='LB'?'LB':p.pos==='DB'?'DB':((+t.sk>0||+t.tf>0)?'LB':'DB');
    if(own!==role)return 0;
  }
  const s=statsFor(p,se,role);return +(s&&s[key])||0;
}
const nm=x=>x&&x.name;
function compute(se,useOv,manual){
  se=se||S.season;const ov=useOv===false?{}:((DBx().crownWin||{})[se]||{});
  const out={crowns:[],titles:[],rows:[]};const crownBy={};
  const pick=(id,auto)=>{const o=ov[id];if(o==='-')return [];if(o&&window.PBY&&PBY[o])return [PBY[o]];return manual?[]:auto};
  CROWN_ORDER.forEach(pos=>{
    const d=POS[pos],pool=PLAYERS.filter(p=>roles(p,se).includes(d.role));
    const lead=d.cats.map(([k,lab])=>{const v=pool.map(p=>({p,v:val(p,se,d.role,k)})),mx=Math.max(0,...v.map(x=>x.v));
      return {k,lab,leaders:mx>0?v.filter(x=>x.v===mx).map(x=>x.p):[]}});
    const act=lead.filter(l=>l.leaders.length);
    const autoCrown=act.length>=2?act[0].leaders.filter(p=>act.every(l=>l.leaders.includes(p))):[];
    const cw=pick('crown:'+pos,autoCrown);crownBy[pos]=new Set(cw.map(nm));
    cw.forEach(p=>out.crowns.push({id:'crown:'+pos,pos,p,text:'Leading all '+pos+" category's"}));
    out.rows.push({id:'crown:'+pos,kind:'crown',pos,label:pos+' crown (leads every '+pos+' category)',auto:autoCrown,now:cw});
    if(!d.crownOnly)lead.forEach(l=>{
      const id='title:'+pos+':'+l.k,w=pick(id,l.leaders.filter(p=>!crownBy[pos].has(p.name)));
      w.forEach(p=>{if(!crownBy[pos].has(p.name)||ov[id])out.titles.push({id,pos,p,text:'Leading all '+l.lab+' in '+pos})});
      out.rows.push({id,kind:'title',pos,label:pos+' title: '+l.lab,auto:l.leaders.filter(p=>!crownBy[pos].has(p.name)),now:w});
    });
  });
  out.titles.sort((a,b)=>TITLE_ORDER.indexOf(a.pos)-TITLE_ORDER.indexOf(b.pos));
  return out;
}
window.rbxCT={compute,POS};
/* ---------- look: same cards, colours and fonts as the rest of the site ---------- */
const css=document.createElement('style');css.textContent=`
.cx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.cx-sub{display:flex;align-items:center;gap:8px;margin:20px 0 0;font:700 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.cx-sub svg{width:14px;height:14px;flex:none}.cx-sub.cr{color:var(--amber)}.cx-sub.ti{color:var(--teal)}
.cx-sub i{font-style:normal;color:var(--dim2);letter-spacing:.06em}
.cx-c{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:10px 12px;text-align:left;color:var(--text);position:relative;overflow:hidden;transition:border-color .15s;font-family:var(--body)}
.cx-c::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--cc,var(--line2))}
button.cx-c{cursor:pointer}.cx-c:hover{border-color:var(--line2)}
.cx-c.crown{--cc:var(--amber);background:linear-gradient(120deg,rgba(255,214,10,.10),rgba(255,214,10,0) 60%),var(--panel);border-color:var(--amber-d)}
.cx-c .w{flex:1;min-width:0}
.cx-c .w b{display:block;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-c .w small{display:block;font-size:9.5px;color:var(--dim);margin-top:1px}
.cx-c .pos{font:700 8px var(--mono);letter-spacing:.12em;border:1px solid var(--line2);color:var(--dim);padding:3px 6px;border-radius:2px}
.cx-c.crown .pos{border-color:var(--amber-d);color:var(--amber)}
.cx-race{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:10px 12px 6px}
.cx-race .h{display:flex;align-items:center;gap:6px;font:600 10px var(--body);color:#d5d7db;margin-bottom:6px}
.cx-race .h svg{width:12px;height:12px;flex:none}
.cx-race .h em{margin-left:auto;font-style:normal;font:700 7px var(--mono);letter-spacing:.1em;border:1px solid var(--line2);padding:3px 5px;border-radius:2px;color:var(--dim)}
.cx-r{display:grid;grid-template-columns:18px 1fr auto;grid-template-areas:"n b e" ". s s";align-items:center;column-gap:8px;width:100%;padding:5px 0;border-top:1px solid var(--line);background:none;color:var(--text);text-align:left;font-family:var(--body)}
.cx-r:first-of-type{border-top:0}button.cx-r{cursor:pointer}button.cx-r:hover b{color:var(--amber)}
.cx-r .n{grid-area:n;font:600 8px var(--mono);color:var(--dim2)}
.cx-r b{grid-area:b;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cx-r em{grid-area:e;font-style:normal;font:700 14px var(--disp);color:var(--dim)}
.cx-r:first-of-type em{color:var(--text)}
.cx-r small{grid-area:s;font-size:9px;color:var(--dim);margin-top:1px}
.cx-e{color:var(--dim2);font-size:13px;padding:10px 0}
@media(max-width:820px){.cx-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.cx-grid{grid-template-columns:1fr}}
`;document.head.appendChild(css);
const ICO={crown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/></svg>',trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M12 14v4M8 21h8"/></svg>'};
const card=(x,kind)=>{const p=x.p,n=esc(p.name),can=window.PBY&&PBY[p.name];
  const inner=`${typeof badge==='function'?badge(p.ini||p.name.slice(0,2).toUpperCase(),p.name,'md'):''}<div class="w"><b>${n}</b><small>${esc(x.text)}</small></div><span class="pos">${esc(x.pos)}</span>`;
  return can?`<button class="cx-c ${kind}" data-player="${n}">${inner}</button>`:`<div class="cx-c ${kind}">${inner}</div>`};
const grid=(a,kind,none)=>a.length?`<div class="cx-grid">${a.map(x=>card(x,kind)).join('')}</div>`:`<div class="cx-e">${none}</div>`;

/* Candidates: who is closest to each crown, and the top three in every title category (worked out from the same season stats). */
function race(se){
  se=se||S.season;const crowns=[],titles=[];
  CROWN_ORDER.forEach(pos=>{
    const d=POS[pos],pool=PLAYERS.filter(p=>roles(p,se).includes(d.role));
    const tabs=d.cats.map(([k,lab])=>{const v=pool.map(p=>({p,v:val(p,se,d.role,k)})),mx=Math.max(0,...v.map(x=>x.v));return {k,lab,v,mx}});
    const rows=pool.map(p=>{let led=0,part=0;const per=tabs.map(t=>{const x=t.v.find(y=>y.p===p).v;if(t.mx>0&&x===t.mx)led++;part+=t.mx>0?x/t.mx:0;return x});
      return {p,led,score:part/tabs.length,per}}).filter(r=>r.score>0).sort((a,b)=>b.led-a.led||b.score-a.score||a.p.name.localeCompare(b.p.name)).slice(0,3);
    crowns.push({pos,n:d.cats.length,labs:d.cats.map(c=>c[1]),rows});
    if(!d.crownOnly)tabs.forEach(t=>{
      const rows2=t.v.filter(x=>x.v>0).sort((a,b)=>b.v-a.v||a.p.name.localeCompare(b.p.name)).slice(0,3);
      titles.push({pos,lab:t.lab,rows:rows2});
    });
  });
  titles.sort((a,b)=>TITLE_ORDER.indexOf(a.pos)-TITLE_ORDER.indexOf(b.pos));
  return {crowns,titles};
}
const fv=v=>Number.isInteger(v)?v.toLocaleString():(+v).toFixed(1);
const cand=(r,i,right,sub)=>{const n=esc(r.p.name),can=window.PBY&&PBY[r.p.name];
  const inner=`<span class="n">0${i+1}</span><b>${n}</b>${sub?`<small>${sub}</small>`:''}<em>${right}</em>`;
  return can?`<button class="cx-r" data-player="${n}">${inner}</button>`:`<div class="cx-r">${inner}</div>`};
function raceHTML(){
  const R=race(S.season),has=R.crowns.some(c=>c.rows.length)||R.titles.some(t=>t.rows.length);
  if(!has)return '';
  const crownCards=R.crowns.filter(c=>c.rows.length).map(c=>`<div class="cx-race"><div class="h"><span style="color:var(--amber)">${ICO.crown}</span>${c.pos} crown<em>${c.n} categories</em></div>${c.rows.map((r,i)=>cand(r,i,r.led+'/'+c.n,r.per.map((v,j)=>fv(v)+' '+esc(c.labs[j])).join(' · '))).join('')}</div>`).join('');
  const titleCards=R.titles.filter(t=>t.rows.length).map(t=>`<div class="cx-race"><div class="h"><span style="color:var(--teal)">${ICO.trophy}</span>${t.pos} · ${esc(t.lab)}<em>${t.pos}</em></div>${t.rows.map((r,i)=>cand(r,i,fv(r.v),'')).join('')}</div>`).join('');
  return `<div class="cx-sub cr">${ICO.crown}Crown candidates <i>· closest to every category</i></div><div class="cx-grid">${crownCards}</div>
  <div class="cx-sub ti">${ICO.trophy}Title candidates <i>· top 3 in each category</i></div><div class="cx-grid">${titleCards}</div>`;
}
function section(){
  const c=compute(S.season,true,true),any=c.crowns.length||c.titles.length;
  return `<section class="sect" id="crowns"><div class="label">Honor roll</div><h2>Crowns &amp; Titles</h2>
  <p class="sub" style="font-size:12px;margin-top:4px">Candidates only, ranked from Season ${S.season} stats. A crown means leading every stat category of a position; a title means leading one category. Nobody is crowned automatically.</p>
  ${any?`<div class="cx-sub cr">${ICO.crown}Crowned by the league <i>· ${c.crowns.length}</i></div>${grid(c.crowns,'crown','')}<div class="cx-sub ti">${ICO.trophy}Titles awarded <i>· ${c.titles.length}</i></div>${grid(c.titles,'title','')}`:''}
  ${raceHTML()||'<div class="cx-e">No stats recorded for this season yet.</div>'}</section>`;
}
Object.assign(window.XV=window.XV||{},{awards:()=>{
  const h=viewAwards(),m='<section class="sect" id="allflag">',i=h.indexOf(m);
  return i<0?h+section():h.slice(0,i)+section()+h.slice(i);
}});
if(location.hash.startsWith('#/awards')&&typeof route==='function')route();
})();

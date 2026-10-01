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
function compute(se,useOv){
  se=se||S.season;const ov=useOv===false?{}:((DBx().crownWin||{})[se]||{});
  const out={crowns:[],titles:[],rows:[]};const crownBy={};
  const pick=(id,auto)=>{const o=ov[id];if(o==='-')return [];if(o&&window.PBY&&PBY[o])return [PBY[o]];return auto};
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
/* ---------- look: copies the Discord post ---------- */
const css=document.createElement('style');css.textContent=`
.cx-box{background:#313338;border:1px solid #1e1f22;border-radius:10px;padding:18px 20px;color:#f2f3f5;font-family:'gg sans','Inter','Segoe UI',system-ui,sans-serif;max-width:640px}
.cx-h{display:flex;align-items:center;gap:7px;font-weight:800;font-style:italic;font-size:15px;letter-spacing:.01em;text-transform:uppercase;margin:0 0 8px}
.cx-h+.cx-l{margin-top:0}.cx-sp{height:16px}
.cx-l{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:2px 0;font-weight:700;font-size:14px;line-height:1.5}
.cx-m{display:inline-block;background:rgba(88,101,242,.3);color:#c9cdfb;border-radius:3px;padding:0 4px;font-weight:500;cursor:default;border:0;font-size:14px;font-family:inherit;line-height:1.35}
button.cx-m{cursor:pointer}button.cx-m:hover{background:#5865f2;color:#fff}
.cx-e{color:#949ba4;font-size:13px;font-weight:500;padding:2px 0}
.cx-bar{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}
`;document.head.appendChild(css);
const pill=p=>{const n=esc(p.name);return window.PBY&&PBY[p.name]?`<button class="cx-m" data-player="${n}">@${n}</button>`:`<span class="cx-m">@${n}</span>`};
const rows=(a,none)=>a.length?a.map(x=>`<div class="cx-l">${pill(x.p)}<span>${esc(x.text)}</span></div>`).join(''):`<div class="cx-e">${none}</div>`;
function discordText(c){
  const part=(h,a)=>a.length?h+'\n'+a.map(x=>'@'+x.p.name+' '+x.text).join('\n'):'';
  return [part('👑 ***CROWNS***',c.crowns),part('🏆 ***TITLES***',c.titles)].filter(Boolean).join('\n\n');
}
function section(){
  const c=compute(S.season);
  return `<section class="sect" id="crowns"><div class="label">Honor roll</div><h2>Crowns &amp; Titles</h2>
  <div class="cx-box"><div class="cx-h">👑 Crowns</div>${rows(c.crowns,'No crowns this season yet.')}<div class="cx-sp"></div>
  <div class="cx-h">🏆 Titles</div>${rows(c.titles,'No titles this season yet.')}</div>
  <div class="cx-bar"><button class="chip" data-cx-copy>Copy for Discord</button><span class="sub" style="font-size:12px">A crown means leading every stat category of a position. A title means leading one category.</span></div></section>`;
}
Object.assign(window.XV=window.XV||{},{awards:()=>{
  const h=viewAwards(),m='<section class="sect" id="allflag">',i=h.indexOf(m);
  return i<0?h+section():h.slice(0,i)+section()+h.slice(i);
}});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-cx-copy]');if(!b)return;
  const t=discordText(compute(S.season));if(!t)return;
  try{await navigator.clipboard.writeText(t)}catch(_){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(__){}a.remove()}
  const o=b.textContent;b.textContent='Copied!';setTimeout(()=>{b.textContent=o},1500);
});
if(location.hash.startsWith('#/awards')&&typeof route==='function')route();
})();

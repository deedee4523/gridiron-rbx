/* UFF admin extras: Overview, Trades, Admins, Analytics, Game control, Bans, Activity, Master admin. Works alongside admin.js (stat adder, schedule etc. unchanged). */
(function(){
const NEW=[['legacy','Legacy'],['crowns','Crowns & Titles'],['trades','Trades'],['tx','Transactions'],['hist','Bowl & award history'],['adm','Admins'],['analytics','Analytics'],['control','Game control'],['bans','Bans'],['activity','Activity'],['master','Master admin']];
const ALL=['overview',...NEW.map(t=>t[0])],X={st:null,mx:'',coll:'teams'};
const C=()=>window.ADC,e=s=>C().esc(String(s??'')),v=id=>(document.getElementById(id)||{}).value||'';
const tile=(l,n)=>`<div class="panel" style="padding:12px 16px;min-width:110px;text-align:center"><div class="sub">${l}</div><div style="font:800 26px var(--disp);color:var(--blue2)">${n}</div></div>`;
const box=(t,b)=>`<div class="panel ux-form" style="margin-bottom:14px"><div class="label" style="font:800 15px var(--disp);letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px">${t}</div>${b}</div>`;
const opts=(a,ph)=>`<option value="">${ph}</option>`+a.map(x=>`<option>${e(x)}</option>`).join('');
const inp=(id,ph,t='text')=>`<input id="${id}" type="${t}" placeholder="${ph}" style="margin-bottom:8px">`;
const dl=(name,txt)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv'}));a.download=name;a.click()};
const csv=rows=>rows.map(r=>r.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\n');
async function api(m,body){const r=await fetch('/api/admin-store',{method:m,headers:{'Content-Type':'application/json',...C().authH()},body:body?JSON.stringify(body):undefined});return r}
async function load(){try{const r=await api('GET');X.st=r.ok?await r.json():{admins:[],bans:[],activity:[],master:[]}}catch(_){X.st={admins:[],bans:[],activity:[],master:[]}}C().draw()}
const log=(action,detail)=>api('POST',{op:'log',action,detail}).catch(()=>{});
const lines=()=>{const D=C().DB,m={};(D.games||[]).filter(g=>(g.season||D.cur)===C().A.season).forEach(g=>(g.lines||[]).forEach(l=>{const o=m[l.name]=m[l.name]||{name:l.name};for(const k in l.st)if(!/^(pl|rl|cl)$/.test(k))o[k]=(o[k]||0)+(+l.st[k]||0)}));return Object.values(m)};
const leaders=(k,t)=>{const r=lines().filter(p=>p[k]>0).sort((a,b)=>b[k]-a[k]).slice(0,5);return `<div class="panel" style="padding:14px 16px"><div class="label">${t}</div>${r.length?r.map((p,i)=>`<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${i+1}. ${e(p.name)}</span><b>${p[k]}</b></div>`).join(''):'<p class="sub">No stats yet.</p>'}</div>`};
function validate(){const D=C().DB,T=D.teams||{},out=[];(D.games||[]).forEach((g,i)=>{if(!T[g.a])out.push('Game '+(i+1)+': unknown team '+g.a);if(!T[g.b])out.push('Game '+(i+1)+': unknown team '+g.b)});Object.values(D.players||{}).forEach(p=>{if(p.team&&!T[p.team])out.push('Player '+p.name+': unknown team '+p.team)});return out}
const LK=['ufb','mvp','pa','va','first','second','crowns','titles','cc','fo'];
const lflat=()=>X.leg?X.leg.tiers.flatMap(t=>t.players):[];
function lcollect(){const r=[...document.querySelectorAll('[data-lrow]')];if(!r.length)return;X.lrows=r.map(tr=>{const g=k=>tr.querySelector('[data-lf="'+k+'"]');return{name:g('name').value.trim(),score:+g('score').value||0,hof:g('hof').checked,s:LK.map((_,i)=>+g('s'+i).value||0)}})}
async function lreq(m,u,b){X.lerr='';try{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',...C().authH()},body:b?JSON.stringify(b):undefined});
 const ct=r.headers.get('content-type')||'';
 if(!/json/i.test(ct)){X.lerr=r.status===401?'Not signed in as admin.':'The server did not return Legacy data. It is probably running an old server.js. Redeploy server.js and legacy-import.js.';return false}
 const j=await r.json();if(!r.ok){X.lerr=j.error||('Server answered '+r.status);return false}
 X.leg=j;X.lrows=lflat().map(p=>({name:p.name,score:p.score,hof:!!p.hof,s:p.s}));return true}catch(err){X.lerr='Could not reach the server.';return false}}
async function lload(){X.leg=null;C().draw();await lreq('GET','/api/legacy');C().draw()}
const b64=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=()=>no(r.error);r.readAsDataURL(f)});

/* ---- Discord ranking roles (Legacy tab) ---- */
async function dreq(m,u,b){X.dcerr='';try{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',...C().authH()},body:b?JSON.stringify(b):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok){X.dcerr=r.status===401?'Not signed in as admin.':(j.error||('Server answered '+r.status));return false}
 if(j.status){X.dc=j.status;X.dcrep=j.report||null}else X.dc=j;return true}catch(err){X.dcerr='Could not reach the server.';return false}}
const ctNames=()=>{try{const D=C().DB,c=rbxCT.compute(D.cur||S.season,true,true),u=a=>[...new Set(a.map(x=>x.p.name))];return {crown:u(c.crowns),title:u(c.titles)}}catch(_){return null}};
window.rbxCTSync=()=>{const n=ctNames();if(n)dreq('PUT','/api/discord/ct',{ct:n})};
const dcload=async()=>{await dreq('GET','/api/discord');C().draw()};
const dcReport=r=>{if(!r)return '';if(r.rolesOnly)return `<p class="sub" style="margin-top:10px">${(r.createdRoles||[]).length?'Created: '+e(r.createdRoles.join(', '))+'.':'All the roles already exist.'}</p>`;if(r.error)return `<p class="sub" style="color:var(--red)">Last run failed: ${e(r.error)}</p>`;
 const L=[`${r.dry?'PREVIEW':'LAST SYNC'} · ${new Date(r.at).toLocaleString()}`,`${r.matched} legacy players matched to a Discord member (${r.members} members in the server).`,
  r.dry?`${r.wouldChange} role change(s) would be made.`:`${r.changed} member(s) updated.`];
 if((r.createdRoles||[]).length)L.push('Roles created: '+r.createdRoles.join(', ')+'.');
 if((r.preview||[]).length)L.push('',...r.preview);
 if((r.unmatched||[]).length)L.push('','Not found in Discord ('+r.unmatched.length+'): '+r.unmatched.slice(0,40).join(', ')+(r.unmatched.length>40?' …':''));
 if(r.stale)L.push(r.stale+' member(s) hold a rank role but are not on the Legacy sheet.');
 (r.problems||[]).forEach(x=>L.push('⚠ '+x));(r.errors||[]).forEach(x=>L.push('✖ '+x));
 return `<p class="sub" style="white-space:pre-line;margin-top:10px">${e(L.join('\n'))}</p>`};
const dcBox=()=>{const s=X.dc;
 if(!s)return box('Discord ranking roles',X.dcerr?`<p class="sub" style="color:var(--red)">${e(X.dcerr)}</p>`:'<p class="sub">Loading…</p>');
 const state=s.configured?`<p class="sub">Connected to the Discord server. Each player gets the role for their Legacy tier (${s.tiers.map(e).join(', ')}) and loses their old rank role. Only these rank roles are ever added or removed.</p>`
  :`<p class="sub" style="color:var(--red)">Not connected yet. ${s.tokenSet?'':'<b>DISCORD_BOT_TOKEN</b> is missing. '}${s.guildSet?'':'<b>DISCORD_GUILD_ID</b> is missing. '}Add them as environment variables (Replit: Tools → Secrets), then restart the app. The bot needs the Manage Roles permission and the Server Members intent.</p>`;
 return box('Discord ranking roles',state+(X.dcerr?`<p class="sub" style="color:var(--red)">${e(X.dcerr)}</p>`:'')+
 `<label class="sub" style="display:block;margin:6px 0"><input id="x_dcauto" type="checkbox" ${s.auto?'checked':''}> Update roles automatically when Legacy changes (checked every 5 minutes)</label>
  <label class="sub" style="display:block;margin:6px 0"><input id="x_dcstale" type="checkbox" ${s.removeStale?'checked':''}> Also take rank roles away from members who are not on the Legacy sheet</label>
  <div class="label" style="margin:12px 0 6px">Roles</div>
  <p class="sub" style="margin-bottom:8px">Rank roles: ${s.tiers.map(e).join(', ')}. Holder roles: <b>${s.extra.map(e).join('</b> and <b>')}</b> (given to everyone who currently holds a crown / a title, taken away when they lose it). ${s.have.length}/${s.tiers.length+s.extra.length} exist in the server.</p>
  <div class="ux-act" style="margin:0 0 10px">${C().btn('xdcmake','Create rank + Crown + Title roles','','btn-amber')}</div>
  <div style="display:grid;grid-template-columns:1fr 110px;gap:8px">${inp('x_dcname','New role name (any role)')}${inp('x_dccolor','#hex color')}</div>
  <div class="ux-act" style="margin-top:0">${C().btn('xdcnew','Create this role')}</div>
  <div class="label" style="margin:12px 0 6px">Manual links (optional)</div>
  <p class="sub" style="margin-bottom:8px">Players are matched by their Discord nickname, display name or username (a nickname like <b>Zach (@exanious)</b> matches <b>exanious</b>). For anyone who can’t be matched, add a line: <b>robloxname = discord username or user ID</b>.</p>
  <textarea id="x_dclinks" rows="5" style="width:100%;margin-bottom:8px" placeholder="exanious = 123456789012345678">${e(s.links||'')}</textarea>
  <div class="ux-act" style="margin-top:0">${C().btn('xdcsave','Save settings')}${C().btn('xdcdry','Preview changes')}${C().btn('xdcsync','Sync roles now','','btn-amber')}</div>`+dcReport(X.dcrep||s.last))};
const dcSettings=()=>({auto:!!(document.getElementById('x_dcauto')||{}).checked,removeStale:!!(document.getElementById('x_dcstale')||{}).checked,links:v('x_dclinks')});
/* ---- Crowns & Titles tab ---- */
const cwView=()=>{const se=C().A.season||S.season,ct=window.rbxCT?rbxCT.compute(se,true):{rows:[]},ov=((C().DB.crownWin||{})[se])||{},names=PLAYERS.map(p=>p.name).sort((a,b)=>a.localeCompare(b));
 const nm=a=>a.length?a.map(p=>e(p.name)).join(', '):'nobody';
 const row=r=>`<tr><td style="padding:5px 8px 5px 0">${e(r.label)}</td><td class="sub" style="padding:5px 8px">Top candidate: ${nm(r.auto)}</td><td style="padding:5px 0"><select data-cw="${e(r.id)}"><option value="">Nobody (candidates only)</option>${names.map(n=>`<option ${ov[r.id]===n?'selected':''}>${e(n)}</option>`).join('')}</select></td></tr>`;
 return box('Crowns &amp; Titles · Season '+se,`<p class="sub" style="margin-bottom:10px">A <b>crown</b> goes to the player who leads every stat category of a position. A <b>title</b> goes to the player who leads one category. The Awards page lists candidates automatically from the season’s stats, but nobody is crowned or titled until you choose a player here (or tick it in Admin &gt; Players). Chosen players show as “Crowned by the league” and get the Discord Crown / Title role.</p>
  <div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px"><tbody>${ct.rows.map(row).join('')}</tbody></table></div>
  <div class="ux-act">${C().btn('xcwsave','Save crowns &amp; titles','','btn-amber')}${C().btn('xcwreset','Clear all')}</div>`)};

/* ---- Transactions: Discord webhook window + transaction log ---- */
async function wreq(m,u,b){X.wherr='';X.whskip=false;try{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',...C().authH()},body:b?JSON.stringify(b):undefined});
 const j=await r.json().catch(()=>({}));if(j&&typeof j.set==='boolean')X.wh=j;X.whskip=!!j.skipped;
 if(!r.ok){X.wherr=r.status===401?'Not signed in as admin.':r.status===404?'The server is running an old server.js. Redeploy server.js, then try again.':(j.error||('Server answered '+r.status));return false}return true}catch(_){X.wherr='Could not reach the server.';return false}}
async function treq(m,b){X.tferr='';try{const r=await fetch('/api/transactions-feed/admin',{method:m,headers:{'Content-Type':'application/json',...C().authH()},body:b?JSON.stringify(b):undefined});
 const j=await r.json().catch(()=>({}));if(j&&typeof j.bot==='boolean')X.tf=j;
 if(!r.ok){X.tferr=r.status===401?'Not signed in as admin.':r.status===404?'The server is running an old server.js. Redeploy server.js, then try again.':(j.error||('Server answered '+r.status));return false}return true}catch(_){X.tferr='Could not reach the server.';return false}}
const whModal=()=>X.whModal?`<div style="position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px"><div class="panel ux-form" style="width:100%;max-width:500px;padding:22px">
 <div style="font:800 17px var(--disp);letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px">Transactions webhook</div>
 <p class="sub" style="margin-bottom:12px">Paste the webhook for the UFF Discord transactions channel. Every transaction added here (and every trade you execute) is posted to that channel and shows on the site's Transactions page.</p>
 <p class="sub" style="margin-bottom:12px">Get it in Discord: <b>Server Settings → Integrations → Webhooks → New Webhook</b>, choose the transactions channel, then <b>Copy Webhook URL</b>.</p>
 <input id="x_whurl" type="text" autocomplete="off" spellcheck="false" placeholder="https://discord.com/api/webhooks/…" style="width:100%;margin-bottom:8px">
 ${X.wherr?`<p class="sub" style="color:var(--red);margin-bottom:8px">${e(X.wherr)}</p>`:''}
 <div class="ux-act" style="margin:0">${C().btn('xwhsave','Save webhook','','btn-amber')}${C().btn('xwhclose','Cancel')}</div></div></div>`:'';
const tfBox=()=>{const F=X.tf;
 if(!F)return X.tferr?`<p class="sub" style="color:var(--red)">${e(X.tferr)}</p>`:'<p class="sub">Loading…</p>';
 const ok=F.bot&&F.channelId;
 return `<p class="sub" style="margin-bottom:8px">The public Transactions page shows <b>every message</b> posted in the Discord transactions channel (people, bots and webhooks). The server reads it with the same bot as the ranking roles, about every 2 minutes.</p>`
 +(!F.bot?`<p class="sub" style="color:var(--red)">The bot is not connected. Set <b>DISCORD_BOT_TOKEN</b> (Replit: Tools → Secrets) and restart.</p>`:'')
 +(F.bot&&!F.channelId?`<p class="sub" style="color:var(--red)">No channel yet. Save the webhook above (the channel is taken from it) or type the channel ID below.</p>`:'')
 +(ok?`<p class="sub">Reading: <b>${F.channelName?'#'+e(F.channelName):'channel '+e(F.channelId)}</b>${F.manualId?' (set by hand)':F.fromWebhook?' (from the webhook)':''} · ${F.count} message${F.count===1?'':'s'} stored${F.at?' · last read '+new Date(F.at).toLocaleString():''}</p>`:'')
 +(F.error?`<p class="sub" style="color:var(--red)">${e(F.error)}</p>`:'')
 +(F.warn?`<p class="sub" style="color:var(--red)">${e(F.warn)}</p>`:'')
 +(X.tferr?`<p class="sub" style="color:var(--red)">${e(X.tferr)}</p>`:'')
 +`<div style="display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:8px"><input id="x_tfch" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="Channel ID (optional, only if it is not the webhook's channel)" value="${e(F.manualId||'')}"><span class="ux-act" style="margin:0">${C().btn('xtfsave','Save channel')}</span></div>
 <div class="ux-act" style="margin-top:8px">${C().btn('xtfsync','Sync now','','btn-amber')}</div>
 <p class="sub" style="margin-top:8px">In the Discord developer portal turn ON <b>Message Content Intent</b> (Bot page) and give the bot <b>View Channel</b> + <b>Read Message History</b> on the transactions channel. Without the intent Discord sends empty message text.</p>`};
const TXTYPES=['Signing','Release','Trade','Offer','Coaching move','Other'];
/* ---- Import past awards: a Google Sheet / Doc / Drive link or an .ods / .xlsx / .csv with SEASON headings across the top and award names (MVP, OPOY ...) down the side ---- */
const aiNorm=t=>String(t||'').toUpperCase().replace(/\(.*?\)/g,'').replace(/[^A-Z0-9]/g,'');
const AINAMES={ROTY:'Rookie of the Year',HCOTY:'Head Coach of the Year',EXEOTY:'Executive of the Year',TOTY:'Team of the Year'};
const aiDefFor=(label,defs)=>{const n=aiNorm(label);if(!n)return null;const k=n.replace(/OFTHEYEAR$/,'').replace(/OTY$/,'');
 return defs.find(d=>{const c=aiNorm(d.code),nm=aiNorm(d.name);return c===n||c===k||nm===n||nm.replace(/OFTHEYEAR$/,'')===k})||null};
const aiCell=t=>{t=String(t||'').trim();if(!t||/^(n\/?a|none|tbd|nobody|\?+|[-–—]+)$/i.test(t))return null;const m=/^(.*?)\s*\(([^)]*)\)\s*$/.exec(t);return {full:t,name:((m?m[1]:t)||t).trim(),rec:!!(m&&/^\s*\d+\s*-\s*\d+(\s*-\s*\d+)?\s*$/.test(m[2]))}};
function aiPlan(){
 const D=C().DB,I=X.ai,defs=hDefs(),keys={};Object.keys(D.players||{}).forEach(k=>keys[k.toLowerCase()]=k);
 const rows=[],items=[],newDefs=[],ids=new Set(defs.map(d=>d.id));
 (I.data.rows||[]).forEach((r,ri)=>{
  let d=aiDefFor(r.label,defs),isNew=false;
  if(!d){const code=(aiNorm(r.label)||'AWD').slice(0,8);let id=code.toLowerCase(),n=2;const ex=newDefs.find(x=>x.code===code);
   if(ex)d=ex;else{while(ids.has(id))id=code.toLowerCase()+(n++);ids.add(id);d={id,name:AINAMES[aiNorm(r.label)]||String(r.label).replace(/\s*\(.*?\)\s*/g,' ').trim()||code,code,color:'#9aa4b2',scope:[],manual:true};newDefs.push(d)}
   isNew=true}
  const off=isNew&&I.skip[ri],row={ri,label:r.label,d,isNew,off,n:0,linked:0,text:0,same:0,diff:0};rows.push(row);if(off)return;
  Object.keys(r.cells).forEach(se=>{const c=aiCell(r.cells[se]);if(!c)return;
   const player=keys[c.name.toLowerCase()]||'',teamish=!player&&(c.rec||/^(TOTY|TEAMOFTHEYEAR)$/.test(aiNorm(r.label))),text=player?'':(teamish?c.full:c.name);
   const cur=((D.awardWin||{})[se]||{})[d.id]||((D.awardHist||{})[se]||{})[d.id]||'',want=player||text;
   const status=!cur?'new':String(cur).toLowerCase()===want.toLowerCase()?'same':'diff';
   items.push({s:+se,id:d.id,player,text,status,name:want,label:r.label});row.n++;if(player)row.linked++;else row.text++;row[status==='same'?'same':status==='diff'?'diff':'n']+=status==='new'?0:1});
 });
 const todo=items.filter(x=>x.status==='new'||(x.status==='diff'&&I.over));
 return {rows,items,todo,newDefs:newDefs.filter(d=>rows.some(r=>r.d===d&&!r.off)),unmatched:[...new Set(items.filter(x=>!x.player).map(x=>x.name))]};
}
const aiPanel=()=>{const I=X.ai;if(!I.data)return '';const P=aiPlan(),seas=I.data.seasons||[];
 const lines=P.rows.map(r=>`<div style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)">
   ${r.isNew?`<input type="checkbox" data-aisk="${r.ri}" ${r.off?'':'checked'} title="Add as a new award">`:'<span style="width:13px"></span>'}
   <span><b>${e(r.label)}</b> <span class="sub">${r.isNew?(r.off?'skipped':'new award: '+e(r.d.name)+' (history only)'):'→ '+e(r.d.name)}</span></span>
   <span class="sub">${r.off?'':r.linked+r.text+r.same+r.diff===0?'nothing to import':(r.linked+r.text)+' winner'+((r.linked+r.text)===1?'':'s')+(r.linked?' · '+r.linked+' on the site':'')+(r.same?' · '+r.same+' already there':'')+(r.diff?' · '+r.diff+' differ':'')}</span></div>`).join('');
 const nd=P.items.filter(x=>x.status==='diff').length;
 return `<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px"><p class="sub">Read ${P.rows.length} awards across ${seas.length} season${seas.length===1?'':'s'} (S${seas[0]}–S${seas[seas.length-1]}) from “${e(I.data.sheet||'sheet')}”. Winners that match a player on the site link to their profile; other names (older players, teams) show as plain text in Legacy > Award history. Rows that are not one of your awards can be added as new awards (they only appear in history and on profiles).</p>
  <div style="max-height:300px;overflow:auto;margin:8px 0">${lines}</div>
  ${nd?`<label class="ux-chk" style="margin:6px 0"><input type="checkbox" id="x_aiover" ${I.over?'checked':''}> Replace the ${nd} winner${nd===1?'':'s'} already set to someone else</label>`:''}
  ${P.unmatched.length?`<details style="margin:6px 0"><summary class="sub" style="cursor:pointer">${P.unmatched.length} name${P.unmatched.length===1?'':'s'} not on the site (kept as text)</summary><div class="sub" style="margin-top:4px">${P.unmatched.slice(0,60).map(e).join(', ')}${P.unmatched.length>60?', …':''}</div></details>`:''}
  <div class="ux-act">${P.todo.length?C().btn('xaiapply','Add '+P.todo.length+' award'+(P.todo.length===1?'':'s'),'','btn-amber'):'<span class="sub">Everything in this sheet is already on the site.</span>'}${C().btn('xaiclear','Close')}</div></div>`};
const awImport=()=>{const I=X.ai=X.ai||{url:'',data:null,err:'',skip:{},over:false,busy:false};
 return box('Import past awards from a Google Sheet, Doc or file',`<p class="sub" style="margin-bottom:8px">Paste a link to a Google Sheet or Google Doc (shared as “Anyone with the link can view”) or upload an .ods, .xlsx or .csv. It needs <b>SEASON I, SEASON II …</b> across the top and award names (<b>MVP, OPOY, DPOY, QBOTY …</b>) down the left. You see a preview first; nothing is saved until you press Add.</p>
  <div style="display:grid;grid-template-columns:1fr auto;gap:8px"><input id="x_aiurl" type="text" autocomplete="off" spellcheck="false" placeholder="https://docs.google.com/spreadsheets/d/… (use the link of the Awards tab)" value="${e(I.url)}"><span class="ux-act" style="margin:0">${C().btn('xairead',I.busy?'Reading…':'Read link')}</span></div>
  <div class="ux-act" style="margin-top:8px"><input type="file" id="x_aifile" accept=".ods,.xlsx,.csv,.html,.htm,.txt" style="max-width:260px">${C().btn('xaiup','Read file')}</div>
  ${I.err?`<p class="sub" style="color:var(--red);margin-top:8px">${e(I.err)}</p>`:''}${aiPanel()}`)};
async function aiRead(body){const I=X.ai;I.busy=true;I.err='';I.data=null;I.skip={};C().draw();
 try{const r=await fetch('/api/awards-import',{method:'POST',headers:{'Content-Type':'application/json',...C().authH()},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));
  if(!r.ok)I.err=r.status===401?'Not signed in as admin.':r.status===404?'The server is running an old server.js. Redeploy it, then try again.':(j.error||('Server answered '+r.status));else I.data=j}catch(_){I.err='Could not reach the server.'}
 I.busy=false;C().draw()}
async function aiApply(){const D=C().DB,I=X.ai,P=aiPlan();
 if(P.newDefs.length){const base=JSON.parse(JSON.stringify(hDefs()));P.newDefs.forEach(d=>base.push(d));D.awardDefs=base;D.awardDefsV=2}
 D.awardWin=D.awardWin||{};D.awardHist=D.awardHist||{};let linked=0,text=0;
 P.todo.forEach(it=>{const aw=D.awardWin[it.s]=D.awardWin[it.s]||{},ah=D.awardHist[it.s]=D.awardHist[it.s]||{};
  if(it.player){aw[it.id]=it.player;delete ah[it.id];linked++}else{ah[it.id]=it.text;delete aw[it.id];text++}});
 Object.keys(D.awardWin).forEach(se=>{if(!Object.keys(D.awardWin[se]).length)delete D.awardWin[se]});Object.keys(D.awardHist).forEach(se=>{if(!Object.keys(D.awardHist[se]).length)delete D.awardHist[se]});
 const ok=await C().save();C().A.aw=null;C().A.aww=null;
 C().A.msg=ok?'Added '+(linked+text)+' awards ('+linked+' linked to players on the site, '+text+' as text)'+(P.newDefs.length?', plus '+P.newDefs.length+' new award'+(P.newDefs.length===1?'':'s'):'')+'. See Legacy > Award history.':'Save failed. Check your admin password and connection.';
 if(ok){I.data=null;log('AWARDS_IMPORT','Imported '+(linked+text)+' past awards')}C().draw()}
document.addEventListener('change',e=>{const t=e.target;if(!t||!X.ai)return;if(t.id==='x_aiover'){X.ai.over=t.checked;C().draw()}else if(t.dataset&&t.dataset.aisk!==undefined){X.ai.skip[t.dataset.aisk]=!t.checked;C().draw()}});
/* ---- Bowl & award history editor ---- */
const hDefs=()=>(window.rbxAwardDefs?rbxAwardDefs():[]);
const hSeasons=()=>{const D=C().DB;return [...new Set([...(window.SEASONS||[]),...(D.bowlHistory||[]).map(x=>x.se),...Object.keys(D.awardHist||{}),...Object.keys(D.awardWin||{}),...(X.hextra||[])].map(Number).filter(n=>n>0))].sort((a,b)=>b-a)};
const hName=(D,se,id)=>{const m=((D.awardWin||{})[se]||{})[id];return m||((D.awardHist||{})[se]||{})[id]||''};
function hCollect(){const D=C().DB;if(!document.querySelector('[data-hb]')&&!document.querySelector('[data-ha]'))return;
 const bh=[];document.querySelectorAll('[data-hb]').forEach(r=>{const g=k=>(r.querySelector('[data-hf="'+k+'"]')||{}).value||'';const w=g('w').trim();if(!w)return;
  const nt=x=>x===''?'':+x,o={se:+r.dataset.hb,w,l:g('l').trim()};const ws=g('ws'),ls=g('ls');if(ws!==''&&ls!==''){o.ws=nt(ws);o.ls=nt(ls)}bh.push(o)});
 D.bowlHistory=bh;
 const keys={};Object.keys(D.players||{}).forEach(k=>keys[k.toLowerCase()]=k);
 D.awardWin=D.awardWin||{};D.awardHist=D.awardHist||{};
 document.querySelectorAll('[data-ha]').forEach(i=>{const [se,id]=i.dataset.ha.split('|'),val=i.value.trim();
  const aw=D.awardWin[se]=D.awardWin[se]||{},ah=D.awardHist[se]=D.awardHist[se]||{};
  if(!val){delete aw[id];delete ah[id]}
  else if(keys[val.toLowerCase()]){aw[id]=keys[val.toLowerCase()];delete ah[id]}
  else{ah[id]=val;delete aw[id]}});
 Object.keys(D.awardWin).forEach(se=>{if(!Object.keys(D.awardWin[se]).length)delete D.awardWin[se]});
 Object.keys(D.awardHist).forEach(se=>{if(!Object.keys(D.awardHist[se]).length)delete D.awardHist[se]});
 if(C().A.aww)C().A.aww=JSON.parse(JSON.stringify(D.awardWin))}
const V={
hist(){const D=C().DB,T=Object.keys(D.teams||{}).sort(),SE=hSeasons(),df=hDefs(),bh=D.bowlHistory||[];
 const tl=`<datalist id="x_hteams">${T.map(t=>`<option value="${e(t)}">`).join('')}</datalist><datalist id="x_hplayers">${Object.keys(D.players||{}).sort().map(n=>`<option value="${e(n)}">`).join('')}</datalist>`;
 const bowl=SE.map(se=>{const r=bh.find(x=>Number(x.se)===se)||{};return `<div data-hb="${se}" style="display:grid;grid-template-columns:54px 1fr 1fr 70px 70px;gap:8px;align-items:center;margin-bottom:6px"><b>S${se}</b><input data-hf="w" list="x_hteams" placeholder="Champion" value="${e(r.w||'')}"><input data-hf="l" list="x_hteams" placeholder="Runner-up" value="${e(r.l||'')}"><input data-hf="ws" type="number" placeholder="Score" value="${e(r.ws??'')}"><input data-hf="ls" type="number" placeholder="Score" value="${e(r.ls??'')}"></div>`}).join('');
 const awd=SE.map(se=>`<div class="panel" style="padding:12px 14px;margin-bottom:10px"><div class="label" style="margin-bottom:8px">Season ${se}</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px">${df.map(d=>`<label style="display:block"><span class="sub" style="display:block;margin-bottom:3px">${e(d.name)} <b>${e(d.code||'')}</b></span><input data-ha="${se}|${e(d.id)}" list="x_hplayers" placeholder="Winner" value="${e(hName(D,se,d.id))}" style="width:100%"></label>`).join('')}</div></div>`).join('');
 return tl+awImport()+box('United Flag Bowl history',`<p class="sub" style="margin-bottom:10px">Type the champion for any season. It replaces what the playoff bracket would show for that season. Leave Champion empty to go back to the bracket result.</p>${bowl||'<p class="sub">No seasons yet. Add one below.</p>'}`)
 +box('Award history',`<p class="sub" style="margin-bottom:10px">Type the winner of each award for any season. Names that match a player on the site link to their profile; other names (older players) show as plain text. Leave a box empty to remove that winner.</p>${awd||'<p class="sub">No seasons yet. Add one below.</p>'}`)
 +box('Add an older season',`<div style="display:flex;gap:8px;align-items:center"><input id="x_hnew" type="number" min="1" placeholder="Season number" style="width:160px">${C().btn('xhadd','+ Add season')}</div>`)
 +`<div class="ux-act">${C().btn('xhsave','Save history','','btn-amber')}</div>`},
tx(){const D=C().DB,W=X.wh,T=Object.keys(D.teams||{}).sort(),all=D.transactions||[],L=all.map((t,i)=>({t,i})).reverse().slice(0,40);
 const st=W?(W.set?`<p class="sub">Connected: <b>${e(W.hint)}</b>${W.name?' · '+e(W.name):''}</p>${W.lastError?`<p class="sub" style="color:var(--red)">Last post failed: ${e(W.lastError)}</p>`:(W.lastAt?`<p class="sub">Last post: ${new Date(W.lastAt).toLocaleString()}</p>`:'')}`:`<p class="sub" style="color:var(--red)">No webhook yet. Add the UFF Discord transactions webhook so transactions sync to Discord.</p>`):(X.wherr?`<p class="sub" style="color:var(--red)">${e(X.wherr)}</p>`:'<p class="sub">Loading…</p>');
 return whModal()+box('Discord transactions webhook',st+`<div class="ux-act" style="margin-top:8px">${C().btn('xwhopen',W&&W.set?'Change webhook':'Add webhook','','btn-amber')}${W&&W.set?C().btn('xwhtest','Send test message')+C().btn('xwhdel','Remove webhook'):''}</div>`)
 +box('Discord channel feed (read every message)',tfBox())
 +box('Add transaction',`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><select id="x_txtype">${TXTYPES.map(x=>`<option>${x}</option>`).join('')}</select><select id="x_txteam">${opts(T,'Team')}</select><select id="x_txteam2">${opts(T,'Other team (trades, optional)')}</select></div>
  <textarea id="x_txtext" rows="2" placeholder="e.g. Sharks signed vbop (WR)" style="width:100%;margin:8px 0"></textarea>
  <input id="x_txplayers" type="text" autocomplete="off" spellcheck="false" placeholder="Roblox username(s) in the text, comma separated (optional): shows their face" style="width:100%;margin:0 0 8px">
  <label class="ux-chk" style="margin-bottom:8px"><input type="checkbox" id="x_txpost" checked> Post to the Discord transactions channel${W&&W.set?'':' (needs the webhook above)'}</label>
  <div class="ux-act" style="margin-top:0">${C().btn('xtxadd','Add transaction','','btn-amber')}</div>`)
 +box('Recent transactions · '+all.length,L.length?L.map(({t,i})=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line)"><span><b>${e(t.text)}</b><br><span class="sub">${e(t.type||'')} · ${e(t.team||'')}${t.team2?' ↔ '+e(t.team2):''} · ${e(t.date||'')}</span></span>${C().btn('xtxdel','Delete',String(i))}</div>`).join(''):'<p class="sub">No transactions yet.</p>')},
crowns(){return cwView()},
legacy(){const d=X.leg;if(!d)return box('Legacy',X.lerr?`<p class="sub" style="color:var(--red)">Could not load Legacy: ${e(X.lerr)}</p><div class="ux-act">${C().btn('xlegretry','Try again','','btn-amber')}</div>`:'<p class="sub">Loading…</p>');const R=X.lrows||[],ni=(k,v,w)=>`<input data-lf="${k}" type="number" value="${v}" style="width:${w||54}px;padding:5px">`,src=d.source||{label:'Default Google Sheet'};
 return box('Data source',`<p class="sub">Current source: <b>${e(src.label)}</b>${src.url?` · <a href="${e(src.url)}" target="_blank" rel="noopener" style="color:var(--blue2)">open</a>`:''}. ${d.at?'Last read '+new Date(d.at).toLocaleString()+'.':'Not read yet.'}</p>
  ${d.error?`<p class="sub" style="color:var(--red)">Last problem: ${e(d.error)}</p>`:''}
  <div class="label" style="margin:12px 0 6px">Paste a link</div>
  <p class="sub" style="margin-bottom:8px">Google Sheets, Google Docs (with a table), a Google Drive file, or a direct link to an .ods / .xlsx / .csv file. Share it as “Anyone with the link can view”. The site re-reads a linked sheet every 5 minutes. Leave the box empty and press the button to go back to the default sheet.</p>
  <input id="x_lurl" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" value="${e(src.type==='url'?src.url:'')}" style="margin-bottom:8px">
  <div class="ux-act" style="margin-top:0">${C().btn('xlegurl','Use this link','','btn-amber')}</div>
  <div class="label" style="margin:18px 0 6px">Or upload a file</div>
  <input id="x_lfile" type="file" accept=".ods,.fods,.xlsx,.csv" style="margin-bottom:8px">
  <div class="ux-act" style="margin-top:0">${C().btn('xlegup','Upload file','','btn-amber')}</div>
  <p class="sub" style="margin-top:10px">The file needs a header row with <b>Player</b> and <b>Score</b>, plus optional UFB, MVP, PA, VA, 1ST, 2ND, Crowns, Titles, CC, FO. A row that says HALL OF FAME above the inductees puts them in that tier. Changing the source clears your website edits.</p>`)+
 box('Legacy sheet',`<p class="sub">Edits you save below are layered on top of the data for this website only (they are not written back to your sheet or file). ${d.edited?'<b>'+d.edited+' website edit(s) active.</b>':''}</p><div class="ux-act">${C().btn('xlegsync','Re-read source now','','btn-amber')}${C().btn('xlegreset','Discard website edits')}</div>`)+
 dcBox()+box('Edit players',`<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px"><thead><tr><th align="left">Player</th><th>Score</th>${d.cols.map(c=>`<th>${e(c)}</th>`).join('')}<th>HoF</th><th></th></tr></thead><tbody>${R.map((p,i)=>`<tr data-lrow><td><input data-lf="name" value="${e(p.name)}" style="width:150px;padding:5px"></td><td>${ni('score',p.score,64)}</td>${p.s.map((v,j)=>`<td>${ni('s'+j,v)}</td>`).join('')}<td align="center"><input data-lf="hof" type="checkbox" ${p.hof?'checked':''}></td><td>${C().btn('xlegdel','✕',String(i))}</td></tr>`).join('')}</tbody></table></div><div class="ux-act">${C().btn('xlegadd','+ Add player')}${C().btn('xlegsave','Save edits','','btn-amber')}</div>`)},

overview(){const D=C().DB;return `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">${tile('total teams',Object.keys(D.teams||{}).length)}${tile('total players',Object.keys(D.players||{}).length)}${tile('games · S'+C().A.season,(D.games||[]).filter(g=>(g.season||D.cur)===C().A.season).length)}${tile('total trades',(D.trades||[]).length)}${tile('total admins',(X.st?X.st.admins.length:0)+1)}</div>
 ${box('Quick actions',`<div class="ux-act" style="margin:0">${C().btn('xexportg','Export games to CSV')}${C().btn('xvalidate','Validate all data')}${C().btn('tab','Reset season (Seasons tab)','seasons')}</div>${X.mx?`<p class="sub" style="margin-top:10px;white-space:pre-line">${e(X.mx)}</p>`:''}`)}`},
trades(){const D=C().DB,T=Object.keys(D.teams||{}).sort();return box('Setup trade',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><select id="x_t1">${opts(T,'Team 1')}</select><select id="x_t2">${opts(T,'Team 2')}</select>${inp('x_r1','Team 1 receives (comma separated)')}${inp('x_r2','Team 2 receives (comma separated)')}</div><div class="ux-act" style="margin-top:0">${C().btn('xtrade','Execute trade','','btn-amber')}</div>`)+box('Trade history',(D.trades||[]).length?(D.trades||[]).slice().reverse().map(t=>`<p class="sub">${new Date(t.at).toLocaleDateString()}: ${e(t.t1)} get ${e(t.r1.join(', '))} · ${e(t.t2)} get ${e(t.r2.join(', '))}</p>`).join(''):'<p class="sub">No trades yet.</p>')},
adm(){const s=X.st||{admins:[],master:[]};return box('Add admin',`<div style="display:grid;grid-template-columns:1fr 1fr 140px;gap:8px">${inp('x_au','Username')}${inp('x_ap','Password (8+ chars)','password')}<select id="x_ar"><option>Admin</option><option>Moderator</option></select></div><div class="ux-act" style="margin-top:0">${C().btn('xaddadmin','+ Add','','btn-amber')}</div>`)+box('Admin list',s.master.map(n=>`<div style="padding:6px 0"><b>${e(n)}</b> <span class="sub">MASTER ADMIN · full access</span></div>`).join('')+s.admins.map(a=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><span><b>${e(a.username)}</b> <span class="sub">${e(a.role)} · created ${new Date(a.created).toLocaleDateString()}</span></span>${C().btn('xdeladmin','Remove',a.username)}</div>`).join(''))},
analytics(){return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${leaders('py','Passing leaders')}${leaders('ry','Rushing leaders')}${leaders('cy','Receiving leaders')}${leaders('tk','Defense leaders')}</div>`},
control(){const D=C().DB;return box('Stats summary',`<div style="display:flex;gap:10px;flex-wrap:wrap">${tile('teams',Object.keys(D.teams||{}).length)}${tile('players',Object.keys(D.players||{}).length)}${tile('games',(D.games||[]).length)}${tile('game stats',lines().length)}</div>`)+box('Export stats',`<div class="ux-act" style="margin:0">${C().btn('xexportp','Export player stats CSV','','btn-amber')}${C().btn('xexportg','Export games CSV')}</div>`)+box('Reset stats',`<p class="sub">Season resets and stat wipes live in the Seasons tab so they keep their confirmation step.</p><div class="ux-act">${C().btn('tab','Open Seasons','seasons')}</div>`)},
bans(){const b=(X.st||{bans:[]}).bans;return box('Issue ban / suspension',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${inp('x_bu','Roblox username')}<select id="x_bt"><option>Permanent Ban</option><option>Suspension</option><option>Warning</option></select>${inp('x_br','Reason')}${inp('x_bn','Internal notes')}</div><div class="ux-act" style="margin-top:0">${C().btn('xban','Ban player','','btn-amber')}</div>`)+box('Ban list',b.length?b.map(x=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><span><b>${e(x.username)}</b> <span class="sub">${e(x.type)} · ${e(x.reason)}</span></span>${C().btn('xunban','Remove',String(x.id))}</div>`).join(''):'<p class="sub">No bans found.</p>')},
activity(){const a=(X.st||{activity:[]}).activity;return box('Recent activity',a.length?a.map(x=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="sub" style="font-weight:700">${e(x.action)}</span> <span class="sub" style="float:right">${new Date(x.at).toLocaleString()}</span><div>${e(x.detail)}</div><div class="sub">by ${e(x.by)}</div></div>`).join(''):'<p class="sub">Nothing logged yet.</p>')},
master(){const D=C().DB,ks=Object.keys(D);return box('Master admin · read-only data browser',`<div class="ux-act" style="margin:0 0 10px">${ks.map(k=>C().btn('xcoll',k,k,X.coll===k?'btn-amber':'chip')).join('')}</div><textarea readonly rows="18" style="width:100%">${e(JSON.stringify(D[X.coll],null,2)||'')}</textarea>`)}};
window.ADX={seas:['overview','analytics','control','crowns'],tabs:NEW,has:t=>ALL.includes(t),view:t=>V[t](),awImport:()=>awImport(),
async act(a,val){
 const D=C()&&C().DB;
 if(a==='tab'){if(['overview','adm','bans','activity'].includes(val))load();if(val==='tx'){X.whModal=false;X.wh=null;X.tf=null;treq('GET').then(()=>C().draw());wreq('GET','/api/transactions-webhook').then(()=>{if(X.wh&&!X.wh.set)X.whModal=true;C().draw()})}if(val==='legacy'){lload();dcload()}return false}




 if(a==='xairead'){hCollect();X.ai=X.ai||{url:'',data:null,err:'',skip:{},over:false};const u=v('x_aiurl').trim();X.ai.url=u;if(!u){X.ai.err='Paste a link first.';C().draw();return true}await aiRead({url:u});return true}
 if(a==='xaiup'){hCollect();X.ai=X.ai||{url:'',data:null,err:'',skip:{},over:false};const f=(document.getElementById('x_aifile')||{}).files&&document.getElementById('x_aifile').files[0];
  if(!f){X.ai.err='Choose an .ods, .xlsx or .csv file first.';C().draw();return true}if(f.size>10*1024*1024){X.ai.err='That file is over 10 MB.';C().draw();return true}
  let d='';try{d=await b64(f)}catch(_){X.ai.err='Could not read the file.';C().draw();return true}await aiRead({name:f.name,data:d});return true}
 if(a==='xaiclear'){if(X.ai){X.ai.data=null;X.ai.err=''}C().draw();return true}
 if(a==='xaiapply'){if(X.ai&&X.ai.data)await aiApply();return true}
 if(a==='xhadd'){const n=Math.floor(+v('x_hnew'));if(!(n>0)){C().A.msg='Type a season number first.';C().draw();return true}hCollect();(X.hextra=X.hextra||[]).push(n);C().draw();return true}
 if(a==='xhsave'){hCollect();const ok=await C().save();C().A.msg=ok?'History saved. It shows on the Legacy page now.':'Save failed.';if(ok)log('HISTORY','Saved United Flag Bowl and award history');C().draw();return true}
 if(a==='xtfsave'){const ok=await treq('PUT',{channelId:v('x_tfch').trim()});C().A.msg=ok?'Channel saved. Reading it now.':'Could not save: '+X.tferr;if(ok)log('TX_FEED','Set transactions channel');C().draw();return true}
 if(a==='xtfsync'){const ok=await treq('POST');C().A.msg=ok?(X.tf&&X.tf.error?'Sync failed: '+X.tf.error:'Synced. '+((X.tf&&X.tf.count)||0)+' messages stored.'):'Sync failed: '+X.tferr;C().draw();return true}
 if(a==='xwhopen'){X.whModal=true;X.wherr='';C().draw();return true}
 if(a==='xwhclose'){X.whModal=false;X.wherr='';C().draw();return true}
 if(a==='xwhsave'){const u=v('x_whurl').trim();if(!u){X.wherr='Paste the webhook link first.';C().draw();return true}
  const ok=await wreq('PUT','/api/transactions-webhook',{url:u});if(ok){X.whModal=false;C().A.msg='Webhook saved. New transactions will post to Discord.';log('TX_WEBHOOK','Saved transactions webhook');treq('GET').then(()=>C().draw())}C().draw();return true}
 if(a==='xwhtest'){const ok=await wreq('POST','/api/transactions-webhook/test');C().A.msg=ok?'Test message sent to the Discord channel.':'Test failed: '+X.wherr;C().draw();return true}
 if(a==='xwhdel'){const ok=await wreq('PUT','/api/transactions-webhook',{url:''});C().A.msg=ok?'Webhook removed.':'Failed: '+X.wherr;if(ok){log('TX_WEBHOOK','Removed transactions webhook');X.whModal=true}C().draw();return true}
 if(a==='xtxadd'){const text=v('x_txtext').trim();if(!text){C().A.msg='Type what happened first.';C().draw();return true}
  const t={type:v('x_txtype')||'Other',team:v('x_txteam'),text,date:new Date().toISOString().slice(0,10),at:Date.now()},t2=v('x_txteam2');if(t2)t.team2=t2;{const pl=v('x_txplayers').split(',').map(x=>x.trim()).filter(Boolean);if(pl.length)t.players=pl}
  const post=!!(document.getElementById('x_txpost')||{}).checked;(D.transactions=D.transactions||[]).push(t);
  const ok=await C().save();let m=ok?'Transaction added.':'Save failed.';
  if(ok&&post){const w=await wreq('POST','/api/transactions-webhook/send',{items:[t]});m+=w?(X.whskip?' Not posted to Discord: add the webhook first.':' Posted to Discord.'):' Could not post to Discord: '+X.wherr}
  if(ok)log('TRANSACTION',t.type+': '+text);C().A.msg=m;C().draw();return true}
 if(a==='xtxdel'){const i=+val;if(D.transactions&&D.transactions[i]){const g=D.transactions.splice(i,1)[0];const ok=await C().save();C().A.msg=ok?'Transaction deleted.':'Save failed.';if(ok)log('TRANSACTION_DEL',g.text||'')}C().draw();return true}
 if(a==='xdcmake'){C().A.msg='Creating roles…';C().draw();const ok=await dreq('POST','/api/discord/roles',{op:'defaults'});C().A.msg=ok?'Roles are ready.':'Failed: '+X.dcerr;C().draw();return true}
 if(a==='xdcnew'){const nm=v('x_dcname').trim();if(!nm){C().A.msg='Type a role name first.';C().draw();return true}
  const ok=await dreq('POST','/api/discord/roles',{op:'custom',name:nm,color:v('x_dccolor')});C().A.msg=ok?'Created the role '+nm+'.':'Failed: '+X.dcerr;if(ok)log('DISCORD_ROLE','Created role '+nm);C().draw();return true}
 if(a==='xdcsave'){const ok=await dreq('PUT','/api/discord/settings',dcSettings());C().A.msg=ok?'Discord settings saved.':'Failed: '+X.dcerr;C().draw();return true}
 if(a==='xdcdry'||a==='xdcsync'){const live=a==='xdcsync';await dreq('PUT','/api/discord/settings',dcSettings());C().A.msg=live?'Syncing roles…':'Checking…';C().draw();
  const ok=await dreq('POST','/api/discord/sync',{dry:!live,ct:ctNames()});C().A.msg=ok?(live?'Roles synced.':'Preview ready. Nothing was changed.'):'Failed: '+X.dcerr;if(ok&&live)log('DISCORD_SYNC','Synced legacy rank roles');C().draw();return true}
 if(a==='xcwsave'){const se=C().A.season||S.season,m={};document.querySelectorAll('[data-cw]').forEach(s=>{if(s.value)m[s.dataset.cw]=s.value});
  D.crownWin=D.crownWin||{};if(Object.keys(m).length)D.crownWin[se]=m;else delete D.crownWin[se];
  const ok=await C().save();C().A.msg=ok?'Crowns & titles saved.':'Save failed.';if(ok){log('CROWNS','Saved crowns and titles, season '+se);const n=ctNames();if(n)dreq('PUT','/api/discord/ct',{ct:n})}C().draw();return true}
 if(a==='xcwreset'){const se=C().A.season||S.season;if(D.crownWin)delete D.crownWin[se];const ok=await C().save();if(ok){const n=ctNames();if(n)dreq('PUT','/api/discord/ct',{ct:n})}C().A.msg=ok?'Cleared all crowns and titles for this season.':'Save failed.';C().draw();return true}
 if(a==='xlegadd'){lcollect();X.lrows=(X.lrows||[]).concat([{name:'',score:0,hof:false,s:LK.map(()=>0)}]);C().draw();return true}
 if(a==='xlegdel'){lcollect();X.lrows.splice(+val,1);C().draw();return true}
 if(a==='xlegsave'){lcollect();const ok=await lreq('PUT','/api/legacy/edits',{rows:X.lrows.filter(r=>r.name)});C().A.msg=ok?'Legacy saved. It shows on the Legacy page now.':'Save failed: '+X.lerr;if(ok)log('LEGACY_EDIT','Saved legacy edits');C().draw();return true}
 if(a==='xlegretry'){await lload();return true}
 if(a==='xlegsync'){const ok=await lreq('POST','/api/legacy/sync');C().A.msg=ok?(X.leg.error?'Re-read failed: '+X.leg.error:'Re-read the source.'):'Failed: '+X.lerr;C().draw();return true}
 if(a==='xlegurl'){const u=v('x_lurl').trim();C().A.msg='Reading the link…';C().draw();const ok=await lreq('PUT','/api/legacy/source',{url:u});C().A.msg=ok?(u?'Link saved. Legacy now comes from it ('+lflat().length+' players).':'Back on the default sheet.'):'Could not use that link: '+X.lerr;if(ok)log('LEGACY_SOURCE',u||'default');if(!X.leg)await lreq('GET','/api/legacy');C().draw();return true}
 if(a==='xlegup'){const f=(document.getElementById('x_lfile')||{}).files&&document.getElementById('x_lfile').files[0];if(!f){C().A.msg='Choose an .ods, .xlsx or .csv file first.';C().draw();return true}
  if(f.size>10*1024*1024){C().A.msg='That file is over 10 MB.';C().draw();return true}
  C().A.msg='Uploading…';C().draw();let ok=false;try{ok=await lreq('POST','/api/legacy/upload',{name:f.name,data:await b64(f)})}catch(_){X.lerr='Could not read the file.'}
  C().A.msg=ok?'Uploaded '+f.name+' ('+lflat().length+' players). It shows on the Legacy page now.':'Upload failed: '+X.lerr;if(ok)log('LEGACY_UPLOAD',f.name);if(!X.leg)await lreq('GET','/api/legacy');C().draw();return true}
 if(a==='xlegreset'){C().A.msg=(await lreq('DELETE','/api/legacy/edits'))?'Website edits discarded. Showing the source data.':'Failed: '+X.lerr;C().draw();return true}
 if(a==='xexportg'){dl('games.csv',csv([['season','week','date','home','away','home score','away score','potg'],...D.games.map(g=>[g.season,g.week,g.date,g.a,g.b,g.sa,g.sb,g.potg])]));return true}
 if(a==='xexportp'){dl('player-stats.csv',csv([['name','pass yds','rush yds','rec yds','tackles','sacks'],...lines().map(p=>[p.name,p.py||0,p.ry||0,p.cy||0,p.tk||0,p.sk||0])]));return true}
 if(a==='xvalidate'){const r=validate();X.mx=r.length?r.length+' issue(s):\n'+r.slice(0,20).join('\n'):'All data looks valid.';C().draw();return true}
 if(a==='xcoll'){X.coll=val;C().draw();return true}
 if(a==='xtrade'){const t1=v('x_t1'),t2=v('x_t2'),n=s=>v(s).split(',').map(x=>x.trim()).filter(Boolean),r1=n('x_r1'),r2=n('x_r2'),find=x=>Object.keys(D.players).find(k=>k.toLowerCase()===x.toLowerCase());
  if(!t1||!t2||t1===t2){C().A.msg='Pick two different teams.';C().draw();return true}
  const bad=[...r1,...r2].filter(x=>!find(x));if(bad.length){C().A.msg='Unknown player(s): '+bad.join(', ');C().draw();return true}
  r1.forEach(x=>D.players[find(x)].team=t1);r2.forEach(x=>D.players[find(x)].team=t2);(D.trades=D.trades||[]).push({at:Date.now(),t1,t2,r1,r2});
  const tx={type:'Trade',team:t1,team2:t2,text:t1+' receive '+r1.join(', ')+' · '+t2+' receive '+r2.join(', '),date:new Date().toISOString().slice(0,10),at:Date.now()};(D.transactions=D.transactions||[]).push(tx);
  const ok=await C().save();C().A.msg=ok?'Trade executed.':'Save failed.';if(ok){const w=await wreq('POST','/api/transactions-webhook/send',{items:[tx]});if(w&&!X.whskip)C().A.msg+=' Posted to Discord.';else if(!w&&X.wherr)C().A.msg+=' Could not post to Discord: '+X.wherr}if(ok)log('TRADE',t1+' get '+r1.join(', ')+' / '+t2+' get '+r2.join(', '));C().draw();return true}
 const post=async(b,m)=>{const r=await api('POST',b);C().A.msg=r.ok?m:'Failed: '+await r.text();await load();return true};
 if(a==='xaddadmin')return post({op:'addAdmin',username:v('x_au'),password:v('x_ap'),role:v('x_ar')},'Admin added.');
 if(a==='xdeladmin')return post({op:'delAdmin',username:val},'Admin removed.');
 if(a==='xban')return post({op:'addBan',username:v('x_bu'),type:v('x_bt'),reason:v('x_br'),notes:v('x_bn')},'Ban recorded.');
 if(a==='xunban')return post({op:'delBan',id:+val},'Ban removed.');
 return false}};
})();

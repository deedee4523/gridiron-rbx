/* UFF admin extras: Overview, Trades, Admins, Analytics, Game control, Bans, Activity, Master admin. Works alongside admin.js (stat adder, schedule etc. unchanged). */
(function(){
const NEW=[['legacy','Legacy'],['trades','Trades'],['adm','Admins'],['analytics','Analytics'],['control','Game control'],['bans','Bans'],['activity','Activity'],['master','Master admin']];
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
const V={
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
 box('Edit players',`<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px"><thead><tr><th align="left">Player</th><th>Score</th>${d.cols.map(c=>`<th>${e(c)}</th>`).join('')}<th>HoF</th><th></th></tr></thead><tbody>${R.map((p,i)=>`<tr data-lrow><td><input data-lf="name" value="${e(p.name)}" style="width:150px;padding:5px"></td><td>${ni('score',p.score,64)}</td>${p.s.map((v,j)=>`<td>${ni('s'+j,v)}</td>`).join('')}<td align="center"><input data-lf="hof" type="checkbox" ${p.hof?'checked':''}></td><td>${C().btn('xlegdel','✕',String(i))}</td></tr>`).join('')}</tbody></table></div><div class="ux-act">${C().btn('xlegadd','+ Add player')}${C().btn('xlegsave','Save edits','','btn-amber')}</div>`)},

overview(){const D=C().DB;return `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">${tile('total teams',Object.keys(D.teams||{}).length)}${tile('total players',Object.keys(D.players||{}).length)}${tile('games · S'+C().A.season,(D.games||[]).filter(g=>(g.season||D.cur)===C().A.season).length)}${tile('total trades',(D.trades||[]).length)}${tile('total admins',(X.st?X.st.admins.length:0)+1)}</div>
 ${box('Quick actions',`<div class="ux-act" style="margin:0">${C().btn('xexportg','Export games to CSV')}${C().btn('xvalidate','Validate all data')}${C().btn('tab','Reset season (Seasons tab)','seasons')}</div>${X.mx?`<p class="sub" style="margin-top:10px;white-space:pre-line">${e(X.mx)}</p>`:''}`)}`},
trades(){const D=C().DB,T=Object.keys(D.teams||{}).sort();return box('Setup trade',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><select id="x_t1">${opts(T,'Team 1')}</select><select id="x_t2">${opts(T,'Team 2')}</select>${inp('x_r1','Team 1 receives (comma separated)')}${inp('x_r2','Team 2 receives (comma separated)')}</div><div class="ux-act" style="margin-top:0">${C().btn('xtrade','Execute trade','','btn-amber')}</div>`)+box('Trade history',(D.trades||[]).length?(D.trades||[]).slice().reverse().map(t=>`<p class="sub">${new Date(t.at).toLocaleDateString()}: ${e(t.t1)} get ${e(t.r1.join(', '))} · ${e(t.t2)} get ${e(t.r2.join(', '))}</p>`).join(''):'<p class="sub">No trades yet.</p>')},
adm(){const s=X.st||{admins:[],master:[]};return box('Add admin',`<div style="display:grid;grid-template-columns:1fr 1fr 140px;gap:8px">${inp('x_au','Username')}${inp('x_ap','Password (8+ chars)','password')}<select id="x_ar"><option>Admin</option><option>Moderator</option></select></div><div class="ux-act" style="margin-top:0">${C().btn('xaddadmin','+ Add','','btn-amber')}</div>`)+box('Admin list',s.master.map(n=>`<div style="padding:6px 0"><b>${e(n)}</b> <span class="sub">MASTER ADMIN · full access</span></div>`).join('')+s.admins.map(a=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><span><b>${e(a.username)}</b> <span class="sub">${e(a.role)} · created ${new Date(a.created).toLocaleDateString()}</span></span>${C().btn('xdeladmin','Remove',a.username)}</div>`).join(''))},
analytics(){return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${leaders('py','Passing leaders')}${leaders('ry','Rushing leaders')}${leaders('cy','Receiving leaders')}${leaders('tk','Defense leaders')}</div>`},
control(){const D=C().DB;return box('Stats summary',`<div style="display:flex;gap:10px;flex-wrap:wrap">${tile('teams',Object.keys(D.teams||{}).length)}${tile('players',Object.keys(D.players||{}).length)}${tile('games',(D.games||[]).length)}${tile('game stats',lines().length)}</div>`)+box('Export stats',`<div class="ux-act" style="margin:0">${C().btn('xexportp','Export player stats CSV','','btn-amber')}${C().btn('xexportg','Export games CSV')}</div>`)+box('Reset stats',`<p class="sub">Season resets and stat wipes live in the Seasons tab so they keep their confirmation step.</p><div class="ux-act">${C().btn('tab','Open Seasons','seasons')}</div>`)},
bans(){const b=(X.st||{bans:[]}).bans;return box('Issue ban / suspension',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${inp('x_bu','Roblox username')}<select id="x_bt"><option>Permanent Ban</option><option>Suspension</option><option>Warning</option></select>${inp('x_br','Reason')}${inp('x_bn','Internal notes')}</div><div class="ux-act" style="margin-top:0">${C().btn('xban','Ban player','','btn-amber')}</div>`)+box('Ban list',b.length?b.map(x=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0"><span><b>${e(x.username)}</b> <span class="sub">${e(x.type)} · ${e(x.reason)}</span></span>${C().btn('xunban','Remove',String(x.id))}</div>`).join(''):'<p class="sub">No bans found.</p>')},
activity(){const a=(X.st||{activity:[]}).activity;return box('Recent activity',a.length?a.map(x=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="sub" style="font-weight:700">${e(x.action)}</span> <span class="sub" style="float:right">${new Date(x.at).toLocaleString()}</span><div>${e(x.detail)}</div><div class="sub">by ${e(x.by)}</div></div>`).join(''):'<p class="sub">Nothing logged yet.</p>')},
master(){const D=C().DB,ks=Object.keys(D);return box('Master admin · read-only data browser',`<div class="ux-act" style="margin:0 0 10px">${ks.map(k=>C().btn('xcoll',k,k,X.coll===k?'btn-amber':'chip')).join('')}</div><textarea readonly rows="18" style="width:100%">${e(JSON.stringify(D[X.coll],null,2)||'')}</textarea>`)}};
window.ADX={seas:['overview','analytics','control'],tabs:NEW,has:t=>ALL.includes(t),view:t=>V[t](),
async act(a,val){
 const D=C()&&C().DB;
 if(a==='tab'){if(['overview','adm','bans','activity'].includes(val))load();if(val==='legacy')lload();return false}
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
  const ok=await C().save();C().A.msg=ok?'Trade executed.':'Save failed.';if(ok)log('TRADE',t1+' get '+r1.join(', ')+' / '+t2+' get '+r2.join(', '));C().draw();return true}
 const post=async(b,m)=>{const r=await api('POST',b);C().A.msg=r.ok?m:'Failed: '+await r.text();await load();return true};
 if(a==='xaddadmin')return post({op:'addAdmin',username:v('x_au'),password:v('x_ap'),role:v('x_ar')},'Admin added.');
 if(a==='xdeladmin')return post({op:'delAdmin',username:val},'Admin removed.');
 if(a==='xban')return post({op:'addBan',username:v('x_bu'),type:v('x_bt'),reason:v('x_br'),notes:v('x_bn')},'Ban recorded.');
 if(a==='xunban')return post({op:'delBan',id:+val},'Ban removed.');
 return false}};
})();

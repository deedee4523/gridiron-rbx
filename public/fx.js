/* Interactive layer: page transitions, scroll reveal, count-up numbers, animated bars, card tilt + cursor glow,
   button ripples, scroll progress, dock hover, "/" to search. Pure add-on: it never changes data or layout, and it
   switches itself off for people who ask their device for reduced motion. */
(function(){
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches;
const css=document.createElement('style');css.textContent=`
#fx-bar{position:fixed;left:0;top:0;height:3px;width:100%;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,var(--amber),var(--blue2));z-index:200;pointer-events:none;box-shadow:0 0 12px rgba(43,140,255,.6)}
#fx-amb{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;transition:opacity .4s;background:radial-gradient(520px circle at var(--ax,50%) var(--ay,30%),rgba(43,140,255,.07),rgba(255,214,10,.025) 45%,transparent 70%)}
body.fx-live #fx-amb{opacity:1}
.fx-pre{opacity:0;transform:translateY(18px)}
.fx-in{opacity:1;transform:none;transition:opacity .55s cubic-bezier(.2,.7,.2,1) var(--fd,0ms),transform .55s cubic-bezier(.2,.7,.2,1) var(--fd,0ms)}
.fx-card{transition:transform .18s ease-out,border-color .15s,box-shadow .2s;will-change:transform}
.fx-card.fx-hot{box-shadow:0 14px 34px rgba(0,0,0,.45),0 0 0 1px rgba(43,140,255,.25)}
.fx-glow{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .2s;background:radial-gradient(180px circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.10),rgba(43,140,255,.06) 45%,transparent 70%)}
.fx-card.fx-hot>.fx-glow{opacity:1}
.fx-rip{position:absolute;border-radius:50%;pointer-events:none;background:rgba(255,255,255,.35);transform:scale(0);animation:fxrip .55s ease-out forwards}
@keyframes fxrip{to{transform:scale(1);opacity:0}}
.dock a,.dock .mb{transition:color .15s,background .15s,transform .18s cubic-bezier(.2,.8,.3,1.4)}
.dock a:hover,.dock .mb:hover{transform:translateY(-6px) scale(1.2)}
.dock a:hover+a,.dock a:has(+a:hover){transform:translateY(-2px) scale(1.07)}
dialog[open]{animation:fxdlg .28s cubic-bezier(.2,.8,.3,1)}
dialog[open]::backdrop{animation:fxbd .28s ease-out}
@keyframes fxdlg{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
@keyframes fxbd{from{opacity:0}to{opacity:1}}
tr.r{transition:background .12s}tr.r:hover{background:rgba(43,140,255,.08)}
.chip,.sbtn,.aftab,.btn-amber{transition:transform .12s,border-color .15s,color .15s,background .15s,filter .15s}
.chip:active,.sbtn:active,.aftab:active,.btn-amber:active{transform:scale(.95)}
.fx-top{position:fixed;right:18px;bottom:calc(76px + env(safe-area-inset-bottom,0px));width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--panel2);border:1px solid var(--line2);color:var(--text);z-index:39;opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .2s,transform .2s,border-color .15s;font-size:18px;line-height:1}
.fx-top.on{opacity:1;pointer-events:auto;transform:none}.fx-top:hover{border-color:var(--amber);color:var(--amber)}
@media(prefers-reduced-motion:reduce){.fx-pre{opacity:1;transform:none}}
`;document.head.appendChild(css);

if(reduce)return;

/* scroll progress bar + back-to-top + ambient glow */
const bar=document.createElement('div');bar.id='fx-bar';document.body.appendChild(bar);
const amb=document.createElement('div');amb.id='fx-amb';document.body.appendChild(amb);
const top=document.createElement('button');top.className='fx-top';top.type='button';top.setAttribute('aria-label','Back to top');top.textContent='↑';
top.onclick=()=>scrollTo({top:0,behavior:'smooth'});document.body.appendChild(top);
let tick=false;
const onScroll=()=>{if(tick)return;tick=true;requestAnimationFrame(()=>{tick=false;
  const h=document.documentElement.scrollHeight-innerHeight,y=scrollY;
  bar.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';top.classList.toggle('on',y>500)})};
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* scroll reveal + count-up + animated bars (runs each time a page is drawn) */
const REVEAL='.pagehead,.sect,.tile,.ac,.pc,.gc,.cx-c,.cx-race,.cx-sub,.lh-v,.lh-s,.lh-sec,.lg-h,.afp,.bk-col,.bk-champ,.stamp,.conf,.qtable,.card,.panel';
const io='IntersectionObserver' in window?new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);reveal(e.target)})},{threshold:.06,rootMargin:'0px 0px -4% 0px'}):null;
function reveal(el){el.classList.remove('fx-pre');el.classList.add('fx-in');countUp(el);bars(el);setTimeout(()=>{el.classList.remove('fx-in');el.style.removeProperty('--fd')},1100)}
function countUp(el){
  el.querySelectorAll('.tile b,.ac .v b,.sgrid b,.stamp b').forEach(n=>{
    if(n.dataset.fxc||n.children.length)return;n.dataset.fxc='1';
    const t=n.textContent.trim();if(!/^[\d,]+(\.\d+)?$/.test(t))return;
    const end=parseFloat(t.replace(/,/g,'')),dec=(t.split('.')[1]||'').length,com=t.includes(',');
    if(!isFinite(end)||end===0||end>1e7)return;
    const t0=performance.now(),dur=750;
    const f=now=>{const k=Math.min(1,(now-t0)/dur),v=end*(1-Math.pow(1-k,3));
      n.textContent=k>=1?t:(com?Math.round(v).toLocaleString():v.toFixed(dec));if(k<1)requestAnimationFrame(f)};
    n.textContent=dec?(0).toFixed(dec):'0';requestAnimationFrame(f);
  });
}
function bars(el){
  el.querySelectorAll('.ac .bar i,.bar i').forEach(i=>{
    if(i.dataset.fxb)return;i.dataset.fxb='1';const w=i.style.width;if(!w)return;
    i.style.width='0';i.style.transition='none';void i.offsetWidth;
    i.style.transition='width .9s cubic-bezier(.2,.7,.2,1) .15s';i.style.width=w;
  });
}
let seq=0;
function prime(root){
  if(/^#\/?admin/.test(location.hash))return;                 // forms stay instant
  const items=[...root.querySelectorAll(REVEAL)].filter(e=>!e.parentElement.closest(REVEAL)||e.matches('.tile,.ac,.pc,.gc,.cx-c,.cx-race,.lh-v,.lh-s,.afp'));
  items.slice(0,140).forEach((e,i)=>{
    const r=e.getBoundingClientRect(),vis=r.top<innerHeight&&r.bottom>0;
    e.style.setProperty('--fd',Math.min(i,14)*45+'ms');
    e.classList.add('fx-pre');
    if(io)io.observe(e);else reveal(e);
    if(vis)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(e.classList.contains('fx-pre')){io&&io.unobserve(e);reveal(e)}}));
  });
}
const app=document.getElementById('app');
if(app){
  new MutationObserver(()=>{if(app.firstElementChild)prime(app)}).observe(app,{childList:true});
  if(app.firstElementChild)prime(app);
}
/* safety net: never leave anything hidden */
setInterval(()=>{document.querySelectorAll('.fx-pre').forEach(e=>{const r=e.getBoundingClientRect();if(r.top<innerHeight+40&&r.bottom>-40){io&&io.unobserve(e);reveal(e)}})},1500);

/* cards: tilt toward the cursor and a soft light that follows it */
if(fine){
  const CARD='.tile,.ac,.pc,.gc,.cx-c,.cx-race,.lh-v,.lh-s,.afr,.stamp';
  let cur=null;
  const clear=el=>{if(!el)return;el.classList.remove('fx-hot');el.style.transform=''};
  document.addEventListener('pointermove',e=>{
    document.documentElement.style.setProperty('--ax',e.clientX+'px');document.documentElement.style.setProperty('--ay',e.clientY+'px');
    amb.style.setProperty('--ax',e.clientX+'px');amb.style.setProperty('--ay',e.clientY+'px');document.body.classList.add('fx-live');
    const el=e.target.closest&&e.target.closest(CARD);
    if(cur&&cur!==el){clear(cur);cur=null}
    if(!el||el.closest('dialog'))return;
    if(!el.classList.contains('fx-card')){
      el.classList.add('fx-card');
      if(getComputedStyle(el).position==='static')el.style.position='relative';
      if(!el.querySelector(':scope>.fx-glow')){const g=document.createElement('i');g.className='fx-glow';el.appendChild(g)}
    }
    cur=el;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    el.style.setProperty('--mx',(x*100)+'%');el.style.setProperty('--my',(y*100)+'%');
    el.classList.add('fx-hot');
    const big=r.width>420||r.height>220;                       // big panels only glow, small cards also tilt
    el.style.transform=big?'':'perspective(700px) rotateX('+((.5-y)*5).toFixed(2)+'deg) rotateY('+((x-.5)*6).toFixed(2)+'deg) translateY(-2px)';
  },{passive:true});
  document.addEventListener('mouseout',e=>{if(!e.relatedTarget){clear(cur);cur=null}});
  document.addEventListener('scroll',()=>{if(cur){clear(cur);cur=null}},{passive:true});
}

/* ripple on buttons */
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest&&e.target.closest('.chip,.sbtn,.aftab,.btn-amber');if(!b||b.disabled)return;
  const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2;
  if(getComputedStyle(b).position==='static')b.style.position='relative';b.style.overflow='hidden';
  const d=document.createElement('span');d.className='fx-rip';
  d.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-r.left-s/2)+'px;top:'+(e.clientY-r.top-s/2)+'px';
  b.appendChild(d);setTimeout(()=>d.remove(),600);
});

/* "/" jumps to search, Esc leaves it */
document.addEventListener('keydown',e=>{
  const t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
  if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey){const s=document.getElementById('gsearch');if(s){e.preventDefault();s.focus();s.select()}}
  else if(e.key==='Escape'&&t&&t.id==='gsearch')t.blur();
});
const gs=document.getElementById('gsearch');if(gs&&!gs.placeholder.includes('/'))gs.placeholder=gs.placeholder.replace('…',' (press /)…');
})();

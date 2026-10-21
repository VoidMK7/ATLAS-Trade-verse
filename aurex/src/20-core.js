'use strict';
/* ============ utils ============ */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const nf=(n,d=2)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtPrice=p=>!isFinite(p)?'—':p>=1000?nf(p,2):p>=1?nf(p,3):p>=.1?nf(p,4):nf(p,5);
const fmtAmt=(n,c)=>nf(n||0,['BTC','ETH'].includes(c)?6:c==='USDT'?2:4);
const usd=n=>(n<0?'-':'')+'$'+nf(Math.abs(n||0),2);
const pct=n=>(n>=0?'+':'')+nf(n||0,2)+'%';
const arrow=n=>n>=0?'▲':'▼';
const dt=t=>t?new Date(t).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'—';
const cl=n=>n>=0?'up':'down';
const uid=(p='k')=>p+'_'+(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36));
const num=v=>v==null?0:Number(v);
const SM={completed:'ok',filled:'ok',confirmed:'ok',active:'ok',running:'ok',approved:'ok',verified:'ok',open:'wait',pending:'wait',processing:'wait',paused:'wait',review:'wait',unverified:'info',failed:'bad',rejected:'bad',cancelled:'bad',expired:'bad',halted:'bad',stopped:'info'};
const badge=s=>`<span class="badge ${SM[s]??'info'}">${esc(s)}</span>`;
const hash=s=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7);
function download(name,text,type='text/csv'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();a.remove()}
const csvSafe=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
const csv=(cols,rows)=>[cols.join(','),...rows.map(r=>cols.map(c=>csvSafe(r[c])).join(','))].join('\n');
const skeleton=(n=4)=>Array.from({length:n},(_,i)=>`<div class="sk" style="width:${96-i*9}%"></div>`).join('');
const empty=(t,s='')=>`<div class="empty"><div style="font-size:24px;color:var(--dim)">∅</div><b>${esc(t)}</b><div>${esc(s)}</div></div>`;
const errBox=(m)=>`<div class="banner bad"><b>Something went wrong.</b> ${esc(m)} <button class="btn sm" data-act="retry">Retry</button></div>`;
function toast(m,t=''){const e=document.createElement('div');e.className='toast '+t;e.textContent=m;$('#toasts').append(e);setTimeout(()=>e.remove(),5200)}
const kv=a=>a.map(([k,v])=>`<div class="kv"><span>${k}</span><span class="num">${v}</span></div>`).join('');
let modalClose=null;
function modal({title,body,actions=[],onClose}){
  const m=$('#modal');m.innerHTML=`<div class="mbox"><h2>${esc(title)}</h2><div id="mb">${body}</div><div class="row" style="margin-top:16px;justify-content:flex-end" id="ma"></div></div>`;
  const close=()=>{m.classList.remove('on');m.innerHTML='';modalClose=null;onClose&&onClose()};modalClose=close;
  const ma=$('#ma',m);
  actions.forEach(a=>{const b=document.createElement('button');b.className='btn '+(a.cls||'');b.textContent=a.label;
    b.onclick=async()=>{if(!a.fn){close();return}if(a.close===false){a.fn(close,b);return}b.disabled=true;try{const r=await a.fn(close,b);if(r!==false)close()}finally{b.disabled=false}};ma.append(b)});
  m.classList.add('on');m.onclick=e=>{if(e.target===m)close()};const f=$('input,select',$('#mb',m));f&&f.focus();return close;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalClose)modalClose()});
const IC={
 dash:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 trade:'<path d="M7 18V6M7 6L4 9M7 6l3 3M17 6v12M17 18l-3-3M17 18l3-3"/>',
 ai:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
 bot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4M9 13.5h.01M15 13.5h.01M9.5 16.5h5"/>',
 wallet:'<path d="M4 7.5A2.5 2.5 0 016.5 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2.5"/><circle cx="16" cy="13.5" r="1.1"/>',
 swap:'<path d="M5 8h13l-3-3M19 16H6l3 3"/>',
 chart:'<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-7"/>',
 news:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h8M8 16h4"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
 bell:'<path d="M6 16v-5a6 6 0 1112 0v5l1.5 2h-15zM10 20.5a2 2 0 004 0"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/>',
 shield:'<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
 down:'<path d="M12 4v13M6 12l6 6 6-6"/>',up:'<path d="M12 20V7M6 12l6-6 6 6"/>',
 buy:'<path d="M12 5v14M5 12h14"/>',sell:'<path d="M5 12h14"/>',
 list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
 search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',logout:'<path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4M15 8l4 4-4 4M19 12H9"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',copy:'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
 admin:'<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M12 8v5M12 16h.01"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
};
const ic=(n,s='')=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${s?`style="${s}"`:''} aria-hidden="true">${IC[n]||''}</svg>`;
const coinIcon=c=>`<span class="coin" aria-hidden="true">${esc(String(c).slice(0,3))}</span>`;

/* ============ config + Supabase client (no demo data anywhere) ============ */
const CFG=Object.assign({url:'',key:''},window.APP_CONFIG||{});
class ApiError extends Error{constructor(code,msg,status=0,raw){super(msg);this.code=code;this.status=status;this.raw=raw||{}}}
const jwt=t=>{try{return JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))))}catch{return{}}};
const Bus={h:{},on(e,f){(this.h[e]=this.h[e]||new Set()).add(f);return()=>this.h[e].delete(f)},emit(e,d){(this.h[e]||[]).forEach(f=>{try{f(d)}catch(x){console.error(x)}})}};
const Backend={missing:false};
const Auth={tok:null,user:null,rt:LS.get('novatrade.rt',null),timer:null,pend:null,
  set(s){if(!s||!s.access_token)return;this.tok=s.access_token;if(s.refresh_token){this.rt=s.refresh_token;LS.set('novatrade.rt',this.rt)}if(s.user)this.user=s.user;clearTimeout(this.timer);
    this.timer=setTimeout(()=>this.refresh().catch(()=>{}),Math.max(15000,(s.expires_in||3600)*1000-90000));Bus.emit('token')},
  clear(){this.tok=null;this.user=null;this.rt=null;LS.set('novatrade.rt',null);clearTimeout(this.timer)},
  aal(){return jwt(this.tok||'').aal||'aal1'},
  refresh(){if(!this.rt)return Promise.reject(new ApiError('no_session','Signed out',401));
    return this.pend||(this.pend=raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.rt},auth:false}).then(r=>{this.set(r.data);return r.data}).finally(()=>{this.pend=null}))}};
async function raw(path,o={}){
  if(!CFG.url||!CFG.key)throw new ApiError('config','Supabase URL/key are not configured (see config.js).',0);
  const h={apikey:CFG.key,'Content-Type':'application/json',Authorization:'Bearer '+((o.auth!==false&&Auth.tok)||CFG.key),...(o.headers||{})};
  let res;try{res=await fetch(CFG.url+path,{method:o.method||'GET',headers:h,body:o.body!==undefined?JSON.stringify(o.body):undefined,signal:AbortSignal.timeout(20000)})}
  catch(e){throw new ApiError('network','Cannot reach the server. Check your connection and try again.',0)}
  const txt=res.status===204?'':await res.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
  if(!res.ok){const b=data&&typeof data==='object'?data:{};
    throw new ApiError(b.hint||b.error_code||b.code||('http_'+res.status),b.message||b.msg||b.error_description||res.statusText||'Request failed',res.status,b)}
  return{data,res};
}
async function req(path,o={}){
  try{return await raw(path,o)}catch(e){
    if(e.status===401&&Auth.rt&&!o.retried&&o.auth!==false){try{await Auth.refresh()}catch{Auth.clear();Bus.emit('signedout');throw e}return raw(path,{...o,retried:1})}
    throw e}}
async function sel(table,q='',o={}){
  const h={};if(o.count)h.Prefer='count=exact';
  const{data,res}=await req(`/rest/v1/${table}${q?'?'+q:''}`,{headers:h});
  if(!o.count)return data;const cr=res.headers.get('content-range');return{data,count:cr&&cr.includes('/')?+cr.split('/')[1]:null};
}
async function rpc(name,args={}){
  try{return(await req('/rest/v1/rpc/'+name,{method:'POST',body:args})).data}
  catch(e){if(e.raw&&e.raw.code==='PGRST202'){Backend.missing=true;Bus.emit('backend');throw new ApiError('backend_missing','The trading backend is not installed on this Supabase project yet. An administrator must run the setup SQL (see README).',404)}throw e}}
const ins=(t,b)=>req('/rest/v1/'+t,{method:'POST',body:b,headers:{Prefer:'return=representation'}}).then(r=>r.data);
const del=(t,q)=>req(`/rest/v1/${t}?${q}`,{method:'DELETE'}).then(r=>r.data);
const patch=(t,q,b)=>req(`/rest/v1/${t}?${q}`,{method:'PATCH',body:b,headers:{Prefer:'return=representation'}}).then(r=>r.data);
const enc=encodeURIComponent;
async function probeBackend(){try{await req('/rest/v1/rpc/mark_notifications_read',{method:'POST',body:{p_ids:[]}})}catch(e){if(e.raw&&e.raw.code==='PGRST202'){Backend.missing=true}}return !Backend.missing}
const AuthApi={
  async login(email,password){const{data}=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},auth:false});Auth.set(data);return data},
  async signup(email,password){const{data}=await raw('/auth/v1/signup',{method:'POST',body:{email,password},auth:false});if(data.access_token)Auth.set(data);return data},
  recover:email=>raw('/auth/v1/recover?redirect_to='+enc(location.origin+location.pathname),{method:'POST',body:{email},auth:false}),
  async user(){const{data}=await req('/auth/v1/user');Auth.user=data;return data},
  setPassword:p=>req('/auth/v1/user',{method:'PUT',body:{password:p}}),
  async logout(scope='local'){try{await req('/auth/v1/logout?scope='+scope,{method:'POST',body:{}})}catch{}if(scope!=='others'){Auth.clear()}},
  async challengeVerify(factorId,code){const c=(await req(`/auth/v1/factors/${factorId}/challenge`,{method:'POST',body:{}})).data;const{data}=await req(`/auth/v1/factors/${factorId}/verify`,{method:'POST',body:{challenge_id:c.id,code}});Auth.set(data);return data},
  enroll:()=>req('/auth/v1/factors',{method:'POST',body:{factor_type:'totp',friendly_name:'NovaTrade '+Date.now().toString(36)}}).then(r=>r.data),
  unenroll:id=>req('/auth/v1/factors/'+id,{method:'DELETE'}),
  totp:u=>(u?.factors||[]).find(f=>f.factor_type==='totp'&&f.status==='verified'),
};

/* ============ realtime (Supabase Realtime over websocket; polling remains the fallback) ============ */
const RT={ws:null,hb:null,ref:1,tables:['balances','orders','notifications','activity','deposits','withdrawals','agents','agent_trades','rentals','swaps'],ok:false,
  start(){if(this.ws||!Auth.tok||!CFG.url)return;try{
    const u=CFG.url.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+enc(CFG.key)+'&vsn=1.0.0';const ws=this.ws=new WebSocket(u);
    ws.onopen=()=>{this.send('realtime:novatrade','phx_join',{config:{broadcast:{ack:false,self:false},presence:{key:''},postgres_changes:this.tables.map(t=>({event:'*',schema:'public',table:t}))},access_token:Auth.tok});
      this.hb=setInterval(()=>this.send('phoenix','heartbeat',{}),25000)};
    ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.event==='phx_reply'&&m.topic==='realtime:novatrade')this.ok=m.payload?.status==='ok';
      if(m.event==='postgres_changes'){const t=m.payload?.data?.table;if(t)Bus.emit('table',t)}}catch{}};
    ws.onclose=()=>{clearInterval(this.hb);this.ws=null;this.ok=false;if(Auth.tok)setTimeout(()=>this.start(),5000)};ws.onerror=()=>{try{ws.close()}catch{}}}catch{}},
  send(topic,event,payload){try{this.ws&&this.ws.readyState===1&&this.ws.send(JSON.stringify({topic,event,payload,ref:String(this.ref++)}))}catch{}},
  token(){if(this.ws)this.send('realtime:novatrade','access_token',{access_token:Auth.tok})},
  stop(){clearInterval(this.hb);const w=this.ws;this.ws=null;try{w&&w.close()}catch{}}};
Bus.on('token',()=>RT.token());

/* ============ market data: server prices (tradable) + public reference data (display only) ============ */
const REF='https://data-api.binance.vision/api/v3';
const TF={'1m':6e4,'5m':3e5,'15m':9e5,'1h':36e5,'4h':144e5,'1d':864e5};
const symOf=c=>c+'/USDT';
const Settings={spot_fee_rate:.001,swap_fee_rate:.002,min_order_usdt:5,min_swap_usd:10,price_max_age_seconds:120};
const Market={tickers:{},coins:[],names:{},caps:{},serverLive:false,lastOk:0,subs:new Set(),cache:{},timer:null,
  sub(f){this.subs.add(f);return()=>this.subs.delete(f)},emit(){this.subs.forEach(f=>{try{f()}catch(e){console.error(e)}})},
  price(c){return c==='USDT'?1:this.tickers[symOf(c)]?.price||0},
  tradable(c){return c==='USDT'||this.tickers[symOf(c)]?.src==='server'},
  async init(){try{const r=await sel('coins','select=symbol,name,market_cap&enabled=eq.true&order=market_cap.desc');this.coins=r.map(x=>x.symbol).filter(s=>s!=='USDT');r.forEach(x=>{this.names[x.symbol]=x.name;this.caps[x.symbol]=num(x.market_cap)})}catch{}
    await this.poll();clearInterval(this.timer);this.timer=setInterval(()=>this.poll(),4000)},
  async loadSettings(){try{(await sel('settings','select=key,value')).forEach(r=>{Settings[r.key]=Number(r.value)})}catch{}},
  async poll(){
    let server=[];try{server=await sel('market_prices','select=*')}catch{}
    const age=(Settings.price_max_age_seconds||120)*1000,now=Date.now(),fresh=server.filter(r=>now-new Date(r.updated_at)<age&&num(r.price)>0);
    this.serverLive=fresh.length>0;const have=new Set();
    fresh.forEach(r=>{const b=r.base||r.symbol.split('/')[0];have.add(b);this.tickers[r.symbol]={symbol:r.symbol,base:b,name:this.names[b]||b,price:num(r.price),open24h:num(r.open24h)||num(r.price),high:num(r.high),low:num(r.low),volume:num(r.volume),change24h:num(r.change24h),marketCap:this.caps[b]||0,src:'server',updated:r.updated_at}});
    const miss=this.coins.filter(c=>!have.has(c));
    if(miss.length){try{const r=await fetch(REF+'/ticker/24hr?symbols='+enc(JSON.stringify(miss.map(c=>c+'USDT'))),{signal:AbortSignal.timeout(8000)});if(r.ok)for(const x of await r.json()){const c=x.symbol.replace(/USDT$/,'');this.tickers[symOf(c)]={symbol:symOf(c),base:c,name:this.names[c]||c,price:+x.lastPrice,open24h:+x.openPrice,high:+x.highPrice,low:+x.lowPrice,volume:+x.quoteVolume,change24h:+x.priceChangePercent,marketCap:this.caps[c]||0,src:'reference'}}}catch{}}
    if(Object.keys(this.tickers).length)this.lastOk=Date.now();
    Object.values(this.tickers).forEach(t=>this.bump(t));this.emit();
  },
  bump(t){for(const k in this.cache){if(!k.startsWith(t.symbol+'|'))continue;const a=this.cache[k];if(!Array.isArray(a)||!a.length)continue;const step=TF[k.split('|')[1]],l=a[a.length-1];
    if(Date.now()>=l.t+step){a.push({t:Math.floor(Date.now()/step)*step,o:l.c,h:t.price,l:t.price,c:t.price,v:0});if(a.length>600)a.shift()}else{l.c=t.price;l.h=Math.max(l.h,t.price);l.l=Math.min(l.l,t.price)}}},
  async klines(sym,tf,limit=300){const k=sym+'|'+tf;if(this.cache[k])return this.cache[k];
    const r=await fetch(`${REF}/klines?symbol=${sym.replace('/','')}&interval=${tf}&limit=${limit}`,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Chart history is unavailable right now.');
    return this.cache[k]=(await r.json()).map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]}))},
  async book(sym){const r=await fetch(`${REF}/depth?symbol=${sym.replace('/','')}&limit=20`,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('depth');const d=await r.json();const m=a=>a.map(x=>({price:+x[0],amount:+x[1]}));return{bids:m(d.bids),asks:m(d.asks)}},
  async trades(sym){const r=await fetch(`${REF}/trades?symbol=${sym.replace('/','')}&limit=24`,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('trades');return(await r.json()).reverse().map(x=>({ts:x.time,price:+x.price,amount:+x.qty,side:x.isBuyerMaker?'sell':'buy'}))},
};
/* ============ indicators ============ */
const sma=(a,n)=>a.map((_,i)=>i<n-1?null:a.slice(i-n+1,i+1).reduce((x,y)=>x+y,0)/n);
function ema(a,n){const k=2/(n+1);let e=null;return a.map((v,i)=>{if(v==null)return null;e=e==null?v:v*k+e*(1-k);return i<n-1?null:e})}
function rsi(c,n=14){const o=Array(c.length).fill(null);let g=0,l=0;for(let i=1;i<c.length;i++){const d=c[i]-c[i-1];if(i<=n){g+=Math.max(d,0);l+=Math.max(-d,0);if(i===n){g/=n;l/=n;o[i]=100-100/(1+g/(l||1e-9))}}else{g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n;o[i]=100-100/(1+g/(l||1e-9))}}return o}
function macd(c){const f=ema(c,12),s=ema(c,26),m=c.map((_,i)=>f[i]!=null&&s[i]!=null?f[i]-s[i]:null),sg=ema(m.map(v=>v??0),9);return{m,s:sg.map((v,i)=>m[i]==null||i<34?null:v),h:m.map((v,i)=>v==null||i<34||sg[i]==null?null:v-sg[i])}}
const stdev=a=>{if(!a.length)return 0;const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};
function maxDrawdown(v){let pk=v[0],dd=0;for(const x of v){pk=Math.max(pk,x);dd=Math.min(dd,x/pk-1)}return dd*100}

/* ============ 2D charts (canvas; touch + mouse) ============ */
const CC={up:'#ffc72c',down:'#ff4d4f',grid:'#241517',txt:'#a39290',acc:'#ffc72c',ma1:'#ffffff',ma2:'#ff9f1c',rsi:'#ffdd70'};
function fit(cv){const r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);cv.width=Math.max(1,r.width*d);cv.height=Math.max(1,r.height*d);const x=cv.getContext('2d');x.setTransform(d,0,0,d,0,0);return[x,r.width,r.height]}
class CandleChart{
  constructor(box,o={}){this.box=box;this.cv=document.createElement('canvas');box.append(this.cv);this.o={ma:true,rsi:false,macd:false,vol:true,...o};this.data=[];this.count=90;this.off=0;this.hover=null;this.ptr=new Map();
    const c=this.cv;c.setAttribute('role','img');c.setAttribute('aria-label','Candlestick chart. Drag to pan, pinch or scroll to zoom. Arrow keys pan, plus and minus zoom.');c.tabIndex=0;
    c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);this.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});this.pd=this.dist();this.pc=this.count;this.moved=0});
    c.addEventListener('pointermove',e=>{const p=this.ptr.get(e.pointerId);const rc=c.getBoundingClientRect();
      if(!p){if(e.pointerType==='mouse'){this.hover=e.clientX-rc.left;this.draw()}return}
      if(this.ptr.size===2){this.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});const d=this.dist();if(this.pd)this.zoom(this.pc*this.pd/d);return}
      const bw=this.pw/this.count,dx=e.clientX-p.x;this.moved+=Math.abs(dx);if(Math.abs(dx)>=bw*.5||this.moved>4){this.off=Math.max(0,Math.min(this.data.length-10,this.off+dx/bw));p.x=e.clientX;this.hover=e.pointerType==='mouse'?e.clientX-rc.left:null;this.draw()}});
    const up=e=>{const p=this.ptr.get(e.pointerId);if(p&&this.moved<5&&e.pointerType!=='mouse'){this.hover=e.clientX-c.getBoundingClientRect().left;this.draw()}this.ptr.delete(e.pointerId)};
    c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);c.addEventListener('pointerleave',()=>{this.hover=null;this.draw()});
    c.addEventListener('wheel',e=>{e.preventDefault();this.zoom(this.count*(e.deltaY>0?1.12:.89))},{passive:false});
    c.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')this.off=Math.min(this.data.length-10,this.off+5);else if(e.key==='ArrowRight')this.off=Math.max(0,this.off-5);else if(e.key==='+')this.zoom(this.count*.85);else if(e.key==='-')this.zoom(this.count*1.18);else return;this.draw()});
    this.ro=new ResizeObserver(()=>this.draw());this.ro.observe(box);}
  dist(){const a=[...this.ptr.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0}
  zoom(n){this.count=Math.max(20,Math.min(Math.min(300,this.data.length||300),n));this.draw()}
  calc(){const c=this.data.map(d=>d.c);this.ind={ma20:sma(c,20),ma50:sma(c,50),rsi:rsi(c),macd:macd(c)}}
  set(d){this.data=d;this.calc();this.draw()}update(){this.calc();this.draw()}destroy(){this.ro.disconnect()}
  draw(){if(!this.data.length||!this.cv.isConnected)return;const[x,W,H]=fit(this.cv);x.clearRect(0,0,W,H);x.font='11px Inter,system-ui';
    const axis=64,pw=W-axis;this.pw=pw;const n=Math.round(this.count),end=this.data.length-Math.round(this.off),st=Math.max(0,end-n),vis=this.data.slice(st,end);if(!vis.length)return;
    const subs=(this.o.rsi?1:0)+(this.o.macd?1:0),sh=subs?Math.min(90,H*.17):0,mh=H-20-sh*subs,bw=pw/n;
    let hi=Math.max(...vis.map(d=>d.h)),lo=Math.min(...vis.map(d=>d.l));const pad=(hi-lo)*.08||hi*.01;hi+=pad;lo-=pad;
    const volH=this.o.vol?mh*.16:0,Y=v=>(hi-v)/(hi-lo)*(mh-volH-4)+4,X=i=>i*bw+bw/2;
    x.strokeStyle=CC.grid;x.fillStyle=CC.txt;x.lineWidth=1;x.textAlign='left';
    for(let i=0;i<=5;i++){const v=lo+(hi-lo)*i/5,y=Y(v);x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.fillText(fmtPrice(v),pw+6,y+4)}
    const tf=this.o.tf||'1h',ts=Math.max(1,Math.round(n/6));x.textAlign='center';
    for(let i=0;i<vis.length;i+=ts){const d=new Date(vis[i].t);x.fillText(TF[tf]>=864e5?d.toLocaleDateString([], {month:'short',day:'numeric'}):d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),X(i),H-6)}
    const vmax=Math.max(...vis.map(d=>d.v))||1;
    vis.forEach((d,i)=>{const up=d.c>=d.o,col=up?CC.up:CC.down,cx=X(i);if(this.o.vol){x.globalAlpha=.3;x.fillStyle=col;x.fillRect(cx-bw*.35,mh-d.v/vmax*volH,bw*.7,d.v/vmax*volH);x.globalAlpha=1}
      x.strokeStyle=col;x.fillStyle=col;x.beginPath();x.moveTo(cx,Y(d.h));x.lineTo(cx,Y(d.l));x.stroke();const t=Y(Math.max(d.o,d.c)),b=Y(Math.min(d.o,d.c));x.fillRect(cx-bw*.35,t,Math.max(1,bw*.7),Math.max(1,b-t))});
    const line=(arr,col,Yf,py=0)=>{x.strokeStyle=col;x.lineWidth=1.4;x.beginPath();let s=0;for(let i=0;i<vis.length;i++){const v=arr[st+i];if(v==null){s=0;continue}const px=X(i),y=Yf(v)+py;s?x.lineTo(px,y):x.moveTo(px,y);s=1}x.stroke();x.lineWidth=1};
    if(this.o.ma){line(this.ind.ma20,CC.ma1,Y);line(this.ind.ma50,CC.ma2,Y);x.textAlign='left';x.fillStyle=CC.ma1;x.fillText('MA20',8,14);x.fillStyle=CC.ma2;x.fillText('MA50',48,14)}
    const last=this.data[this.data.length-1];if(!this.off){const y=Y(last.c);x.setLineDash([4,4]);x.strokeStyle=last.c>=last.o?CC.up:CC.down;x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.setLineDash([]);x.fillStyle=x.strokeStyle;x.fillRect(pw,y-9,axis,18);x.fillStyle='#1a0a05';x.textAlign='left';x.fillText(fmtPrice(last.c),pw+6,y+4)}
    let py=mh;
    if(this.o.rsi){x.strokeStyle=CC.grid;x.strokeRect(0,py,pw,sh-4);const f=v=>(100-v)/100*(sh-8)+2;[30,70].forEach(l=>{x.beginPath();x.moveTo(0,py+f(l));x.lineTo(pw,py+f(l));x.stroke()});line(this.ind.rsi,CC.rsi,f,py);x.fillStyle=CC.txt;x.textAlign='left';x.fillText('RSI 14',8,py+12);py+=sh}
    if(this.o.macd){x.strokeStyle=CC.grid;x.strokeRect(0,py,pw,sh-4);const m=this.ind.macd,mx=Math.max(...vis.map((_,i)=>Math.abs(m.h[st+i]||0)),1e-9)*1.6,f=v=>(1-v/mx)/2*(sh-8)+2;
      vis.forEach((_,i)=>{const h=m.h[st+i];if(h==null)return;x.fillStyle=h>=0?CC.up:CC.down;x.globalAlpha=.55;const y0=f(0),y1=f(h);x.fillRect(X(i)-bw*.3,py+Math.min(y0,y1),bw*.6,Math.abs(y1-y0)||1);x.globalAlpha=1});
      line(m.m,CC.ma1,f,py);line(m.s,CC.ma2,f,py);x.fillStyle=CC.txt;x.textAlign='left';x.fillText('MACD 12,26,9',8,py+12)}
    if(this.hover!=null&&this.hover<pw){const i=Math.min(vis.length-1,Math.max(0,Math.floor(this.hover/bw))),d=vis[i],cx=X(i);x.strokeStyle='#7a6462';x.setLineDash([3,3]);x.beginPath();x.moveTo(cx,0);x.lineTo(cx,H-18);x.stroke();x.setLineDash([]);
      const txt=`${new Date(d.t).toLocaleString([], {dateStyle:'short',timeStyle:'short'})}  O ${fmtPrice(d.o)}  H ${fmtPrice(d.h)}  L ${fmtPrice(d.l)}  C ${fmtPrice(d.c)}`;const tw=x.measureText(txt).width+14,tx=Math.min(Math.max(2,cx-tw/2),pw-tw);x.fillStyle='#0b0506ee';x.fillRect(tx,22,tw,20);x.fillStyle='#f7ede9';x.textAlign='left';x.fillText(txt,tx+7,36)}
  }
}
function lineChart(cv,series,o={}){const[x,W,H]=fit(cv);x.clearRect(0,0,W,H);x.font='11px Inter,system-ui';const all=series.flatMap(s=>s.data);if(all.length<2){x.fillStyle=CC.txt;x.textAlign='center';x.fillText(o.empty||'Not enough data yet',W/2,H/2);return}
  let lo=Math.min(...all),hi=Math.max(...all);const p=(hi-lo)*.1||Math.abs(hi)*.05||1;lo-=p;hi+=p;const L=o.left??48,B=18,w=W-L,h=H-B;
  x.strokeStyle=CC.grid;x.fillStyle=CC.txt;x.textAlign='left';for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4,y=h-(v-lo)/(hi-lo)*h;x.beginPath();x.moveTo(L,y);x.lineTo(W,y);x.stroke();x.fillText(o.fmt?o.fmt(v):nf(v,0),2,y+4)}
  if(o.labels){const n=o.labels.length,st=Math.ceil(n/5);x.textAlign='center';for(let i=0;i<n;i+=st)x.fillText(o.labels[i],L+i/(n-1||1)*w,H-4);x.textAlign='left'}
  series.forEach(s=>{x.beginPath();s.data.forEach((v,i)=>{const px=L+i/(s.data.length-1||1)*w,py=h-(v-lo)/(hi-lo)*h;i?x.lineTo(px,py):x.moveTo(px,py)});x.strokeStyle=s.color||CC.acc;x.lineWidth=2;x.stroke();x.lineWidth=1;
    if(s.fill){x.lineTo(W,h);x.lineTo(L,h);x.closePath();const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,(s.color||CC.acc)+'55');g.addColorStop(1,'transparent');x.fillStyle=g;x.fill();x.fillStyle=CC.txt}})}
function barChart(cv,vals,fmt=v=>nf(v,0)){const[x,W,H]=fit(cv);x.clearRect(0,0,W,H);x.font='11px Inter,system-ui';if(!vals.length){x.fillStyle=CC.txt;x.textAlign='center';x.fillText('No closed trades yet',W/2,H/2);return}const m=Math.max(...vals.map(Math.abs),1e-9),z=H/2,bw=W/vals.length;x.strokeStyle=CC.grid;x.beginPath();x.moveTo(0,z);x.lineTo(W,z);x.stroke();vals.forEach((v,i)=>{x.fillStyle=v>=0?CC.up:CC.down;const h=Math.abs(v)/m*(H/2-14);x.fillRect(i*bw+bw*.15,v>=0?z-h:z,bw*.7,h)});x.fillStyle=CC.txt;x.textAlign='left';x.fillText('max '+fmt(m),4,12)}
function depthChart(cv,bids,asks){const[x,W,H]=fit(cv);x.clearRect(0,0,W,H);if(!bids.length||!asks.length)return;const cum=a=>{let s=0;return a.map(l=>({p:l.price,c:s+=l.amount}))},b=cum([...bids].sort((a,b)=>b.price-a.price)),k=cum([...asks].sort((a,b)=>a.price-b.price));
  const mx=Math.max(b[b.length-1].c,k[k.length-1].c),p0=b[b.length-1].p,p1=k[k.length-1].p,X=p=>(p-p0)/(p1-p0)*W,Y=c=>H-4-c/mx*(H-14);
  [[b,CC.up],[k,CC.down]].forEach(([a,col])=>{x.beginPath();x.moveTo(X(a[0].p),H);a.forEach(l=>x.lineTo(X(l.p),Y(l.c)));x.lineTo(X(a[a.length-1].p),H);x.closePath();x.fillStyle=col+'33';x.fill();x.strokeStyle=col;x.stroke()})}
function sparkline(cv,vals,col){const[x,W,H]=fit(cv);x.clearRect(0,0,W,H);if(!vals||vals.length<2)return;const lo=Math.min(...vals),hi=Math.max(...vals),r=(hi-lo)||1;x.beginPath();vals.forEach((v,i)=>{const px=i/(vals.length-1)*(W-2)+1,py=H-2-(v-lo)/r*(H-4);i?x.lineTo(px,py):x.moveTo(px,py)});x.strokeStyle=col;x.lineWidth=1.6;x.stroke()}

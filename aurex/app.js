/* ---- 20-core.js ---- */
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
 mkt:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 refresh:'<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>',meme:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14c1 1.6 5.9 1.6 7 0M9 9.5h.01M15 9.5h.01"/>',stock:'<path d="M7 4v16M7 8H4v6h3M17 3v18M17 7h-3v8h3M12 10v6"/>',
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
    throw new ApiError(b.hint||b.error_code||b.code||('http_'+res.status),b.message||b.msg||b.error_description||b.error||res.statusText||'Request failed',res.status,b)}
  return{data,res};
}
async function req(path,o={}){
  try{return await raw(path,o)}catch(e){
    if(e.status===401&&Auth.rt&&!o.retried&&o.auth!==false){try{await Auth.refresh()}catch{Auth.clear();Bus.emit('signedout');throw e}return raw(path,{...o,retried:1})}
    throw e}}
/* admins can read every row of these tables (RLS has an is_admin() branch); on user pages scope to their own rows */
const OWN_TABLES=new Set(['orders','activity','balances','swaps','withdrawals','deposits','agents','agent_trades','agent_log','rentals','notifications','price_alerts','deposit_addresses','login_events','portfolio_snapshots']);
async function sel(table,q='',o={}){
  if(typeof App!=='undefined'&&App.isAdmin&&App.user&&OWN_TABLES.has(table)&&!/(^|&)user_id=/.test(q)&&!/^#\/admin/.test(location.hash))q+=(q?'&':'')+'user_id=eq.'+App.user.id;
  const h={};if(o.count)h.Prefer='count=exact';
  const{data,res}=await req(`/rest/v1/${table}${q?'?'+q:''}`,{headers:h});
  if(!o.count)return data;const cr=res.headers.get('content-range');return{data,count:cr&&cr.includes('/')?+cr.split('/')[1]:null};
}
/* signed-in calls to the project's edge functions (stocks-data, meme-data); keys for third-party APIs live only on the server */
async function fnGet(name,params={}){const q=new URLSearchParams(params).toString();return(await req(`/functions/v1/${name}${q?'?'+q:''}`)).data}
async function fnPost(name,body){return(await req(`/functions/v1/${name}`,{method:'POST',body})).data}
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
const RT={ws:null,hb:null,ref:1,tables:['balances','orders','notifications','activity','deposits','withdrawals','agents','agent_trades','agent_log','rentals','swaps','market_prices'],ok:false,
  start(){if(this.ws||!Auth.tok||!CFG.url)return;try{
    const u=CFG.url.replace(/^http/,'ws')+'/realtime/v1/websocket?apikey='+enc(CFG.key)+'&vsn=1.0.0';const ws=this.ws=new WebSocket(u);
    ws.onopen=()=>{this.send('realtime:novatrade','phx_join',{config:{broadcast:{ack:false,self:false},presence:{key:''},postgres_changes:this.tables.map(t=>({event:'*',schema:'public',table:t}))},access_token:Auth.tok});
      this.hb=setInterval(()=>this.send('phoenix','heartbeat',{}),25000)};
    ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.event==='phx_reply'&&m.topic==='realtime:novatrade')this.ok=m.payload?.status==='ok';
      if(m.event==='postgres_changes'){const d=m.payload?.data,t=d?.table;if(t==='market_prices'&&d.record)Bus.emit('price',d.record);else if(t)Bus.emit('table',t)}}catch{}};
    ws.onclose=()=>{clearInterval(this.hb);this.ws=null;this.ok=false;if(Auth.tok)setTimeout(()=>this.start(),5000)};ws.onerror=()=>{try{ws.close()}catch{}}}catch{}},
  send(topic,event,payload){try{this.ws&&this.ws.readyState===1&&this.ws.send(JSON.stringify({topic,event,payload,ref:String(this.ref++)}))}catch{}},
  token(){if(this.ws)this.send('realtime:novatrade','access_token',{access_token:Auth.tok})},
  stop(){clearInterval(this.hb);const w=this.ws;this.ws=null;try{w&&w.close()}catch{}}};
Bus.on('token',()=>RT.token());

/* ============ market data: server prices (tradable) + public reference data (display only) ============ */
const REF='https://data-api.binance.vision/api/v3';
/* public reference data: direct from the browser first; if that is blocked/unreachable (some networks), via our own market-data edge function */
async function refFetch(path,ms){
  try{const r=await fetch(REF+path,{signal:AbortSignal.timeout(ms)});if(r.ok)return r}catch{}
  return fetch(CFG.url+'/functions/v1/market-data?p='+encodeURIComponent(path),{headers:{apikey:CFG.key},signal:AbortSignal.timeout(ms+4000)});
}
const TF={'1m':6e4,'5m':3e5,'15m':9e5,'1h':36e5,'4h':144e5,'1d':864e5,'1w':6048e5};
const symOf=c=>c+'/USDT';
const Settings={spot_fee_rate:.001,swap_fee_rate:.002,min_order_usdt:5,min_swap_usd:10,price_max_age_seconds:120,price_max_age_stock:300};
const KINDS={crypto:'Crypto',meme:'Meme',stock:'Stocks',commodity:'Gold & commodities'};
const bucketize=(pts,step)=>{const out=[];for(const q of pts){const t=Math.floor(q.t/step)*step,l=out[out.length-1];if(l&&l.t===t){l.h=Math.max(l.h,q.p);l.l=Math.min(l.l,q.p);l.c=q.p}else out.push({t,o:q.p,h:q.p,l:q.p,c:q.p,v:0})}return out};
const Market={tickers:{},coins:[],names:{},caps:{},meta:{},serverLive:false,lastOk:0,rtAt:0,subs:new Set(),cache:{},timer:null,pendEmit:null,
  sub(f){this.subs.add(f);return()=>this.subs.delete(f)},emit(){this.subs.forEach(f=>{try{f()}catch(e){console.error(e)}})},
  emitSoon(){if(this.pendEmit)return;this.pendEmit=setTimeout(()=>{this.pendEmit=null;this.emit()},200)},
  price(c){return c==='USDT'?1:this.tickers[symOf(c)]?.price||0},
  tradable(c){return c==='USDT'||this.tickers[symOf(c)]?.src==='server'},
  kind(c){return this.meta[c]?.kind||'crypto'},
  isMarketHours(c){return this.meta[c]?.source==='stooq'},
  async init(){let r;
    try{r=await sel('coins','select=symbol,name,market_cap,kind,source,src_symbol,about&enabled=eq.true&order=market_cap.desc')}
    catch{try{r=await sel('coins','select=symbol,name,market_cap&enabled=eq.true&order=market_cap.desc')}catch{r=[]}}
    this.coins=r.map(x=>x.symbol).filter(s=>s!=='USDT');
    r.forEach(x=>{this.names[x.symbol]=x.name;this.caps[x.symbol]=num(x.market_cap);this.meta[x.symbol]={kind:x.kind||(x.symbol==='DOGE'?'meme':'crypto'),source:x.source||'binance',src:x.src_symbol||null,about:x.about||''}});
    Bus.on('price',row=>{this.rtAt=Date.now();if(this.applyRow(row)){this.bump(this.tickers[row.symbol]);this.emitSoon()}});
    await this.poll();clearInterval(this.timer);this.timer=setInterval(()=>{if(Date.now()-this.rtAt>20000)this.poll()},5000)},
  async loadSettings(){try{(await sel('settings','select=key,value')).forEach(r=>{Settings[r.key]=Number(r.value)})}catch{}},
  /* turns a market_prices row into a ticker; fresh rows are tradable ('server'); stale stock/commodity quotes stay visible as 'closed' */
  applyRow(r){const b=r.base||String(r.symbol).split('/')[0],m=this.meta[b]||{},stooq=m.source==='stooq',age=(stooq?Settings.price_max_age_stock:Settings.price_max_age_seconds||120)*1000,price=num(r.price);
    if(!(price>0))return false;const fresh=Date.now()-new Date(r.updated_at)<age;if(!fresh&&!stooq)return false;
    this.tickers[r.symbol]={symbol:r.symbol,base:b,name:this.names[b]||b,kind:m.kind||'crypto',price,open24h:num(r.open24h)||price,high:num(r.high),low:num(r.low),volume:num(r.volume),change24h:num(r.change24h),marketCap:this.caps[b]||0,src:fresh?'server':'closed',updated:r.updated_at,quoteTs:r.quote_ts||null};return true},
  async poll(){
    let server=[];try{server=await sel('market_prices','select=*')}catch{}
    const have=new Set();let live=false;
    server.forEach(r=>{if(this.applyRow(r)){const t=this.tickers[r.symbol];if(t.src==='server'){live=true;have.add(t.base)}}});this.serverLive=live;
    const miss=this.coins.filter(c=>!have.has(c)&&(this.meta[c]?.source||'binance')==='binance');
    if(miss.length&&!live){try{const r=await refFetch('/ticker/24hr?symbols='+enc(JSON.stringify(miss.map(c=>c+'USDT'))),8000);if(r.ok)for(const x of await r.json()){const c=x.symbol.replace(/USDT$/,'');this.tickers[symOf(c)]={symbol:symOf(c),base:c,name:this.names[c]||c,kind:this.kind(c),price:+x.lastPrice,open24h:+x.openPrice,high:+x.highPrice,low:+x.lowPrice,volume:+x.quoteVolume,change24h:+x.priceChangePercent,marketCap:this.caps[c]||0,src:'reference'}}}catch{}}
    if(Object.keys(this.tickers).length)this.lastOk=Date.now();
    Object.values(this.tickers).forEach(t=>this.bump(t));this.emit();
  },
  bump(t){if(!t)return;for(const k in this.cache){if(!k.startsWith(t.symbol+'|'))continue;const a=this.cache[k];if(!Array.isArray(a)||!a.length)continue;const step=TF[k.split('|')[1]],l=a[a.length-1];
    if(Date.now()>=l.t+step){a.push({t:Math.floor(Date.now()/step)*step,o:l.c,h:t.price,l:t.price,c:t.price,v:0});if(a.length>1200)a.shift()}else{l.c=t.price;l.h=Math.max(l.h,t.price);l.l=Math.min(l.l,t.price)}}},
  async stooqCandles(src,tf){const iv={'5m':'5','15m':'15','1h':'60','4h':'60','1d':'d','1w':'w'}[tf];if(!iv||!src)return null;
    const r=await fetch(CFG.url+'/functions/v1/market-data?p='+enc('/stooq?s='+src+'&i='+iv),{headers:{apikey:CFG.key},signal:AbortSignal.timeout(14000)});if(!r.ok)return null;
    let a=((await r.json()).candles||[]).map(x=>({t:x[0],o:x[1],h:x[2],l:x[3],c:x[4],v:x[5]}));
    if(tf==='4h'){const st=TF['4h'],out=[];for(const q of a){const t=Math.floor(q.t/st)*st,l=out[out.length-1];if(l&&l.t===t){l.h=Math.max(l.h,q.h);l.l=Math.min(l.l,q.l);l.c=q.c;l.v+=q.v}else out.push({...q,t})}a=out}
    return a},
  async stockDaily(c){try{const j=await fnGet('stocks-data',{a:'candles',s:c,r:'1Y'});return(j.candles||[]).map(x=>({t:x.t,o:x.o,h:x.h,l:x.l,c:x.c,v:x.v||0}))}catch{return null}},
  /* last resort: candles built from the platform's own one-minute price ticks */
  async tickCandles(sym,tf){try{const rows=await sel('price_ticks',`select=ts,price&symbol=eq.${enc(sym)}&order=ts.desc&limit=1000`);return bucketize(rows.reverse().map(x=>({t:new Date(x.ts).getTime(),p:num(x.price)})),TF[tf])}catch{return[]}},
  async klines(sym,tf,limit=300){const k=sym+'|'+tf;if(this.cache[k])return this.cache[k];const c=sym.split('/')[0],m=this.meta[c]||{};let arr=null;
    try{if(m.source==='stooq'){arr=await this.stooqCandles(m.src,tf);if((!arr||arr.length<5)&&m.kind==='stock'&&(tf==='1d'||tf==='1w'))arr=await this.stockDaily(c)}else{const r=await refFetch(`/klines?symbol=${sym.replace('/','')}&interval=${tf}&limit=${limit}`,10000);if(r.ok)arr=(await r.json()).map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]}))}}catch{}
    if(!arr||arr.length<5)arr=await this.tickCandles(sym,tf);
    if(!arr||!arr.length)throw new Error('Chart history is not available for this instrument right now.');
    return this.cache[k]=arr},
  hasDepth(sym){return(this.meta[sym.split('/')[0]]?.source||'binance')==='binance'},
  async book(sym){if(!this.hasDepth(sym))throw new Error('depth');const r=await refFetch(`/depth?symbol=${sym.replace('/','')}&limit=20`,8000);if(!r.ok)throw new Error('depth');const d=await r.json();const m=a=>a.map(x=>({price:+x[0],amount:+x[1]}));return{bids:m(d.bids),asks:m(d.asks)}},
  async trades(sym){if(!this.hasDepth(sym))throw new Error('trades');const r=await refFetch(`/trades?symbol=${sym.replace('/','')}&limit=24`,8000);if(!r.ok)throw new Error('trades');return(await r.json()).reverse().map(x=>({ts:x.time,price:+x.price,amount:+x.qty,side:x.isBuyerMaker?'sell':'buy'}))},
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

/* ---- 25-gl.js ---- */
/* ============ 3D engine: raw WebGL (no dependencies). Scenes: coins, candle field, allocation ring ============ */
const _v={sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]}};
const M4={
 id:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s}return o},
 persp(f,a,n,fa){const t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/a;o[5]=t;o[10]=(fa+n)/(n-fa);o[11]=-1;o[14]=2*fa*n/(n-fa);return o},
 look(e,c,u){const z=_v.norm(_v.sub(e,c)),x=_v.norm(_v.cross(u,z)),y=_v.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-_v.dot(x,e),-_v.dot(y,e),-_v.dot(z,e),1])},
 T(x,y,z){const m=M4.id();m[12]=x;m[13]=y;m[14]=z;return m},S(x,y,z){const m=M4.id();m[0]=x;m[5]=y;m[10]=z;return m},
 RY(a){const c=Math.cos(a),s=Math.sin(a),m=M4.id();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m},
 RX(a){const c=Math.cos(a),s=Math.sin(a),m=M4.id();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m},
 RZ(a){const c=Math.cos(a),s=Math.sin(a),m=M4.id();m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m},
};
const VS=`attribute vec3 aP;attribute vec3 aN;attribute vec2 aT;uniform mat4 uVP,uM,uR;varying vec3 vN,vW;varying vec2 vT;void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=(uR*vec4(aN,0.)).xyz;vT=aT;gl_Position=uVP*w;}`;
const FS=`precision mediump float;varying vec3 vN,vW;varying vec2 vT;uniform vec3 uCol,uEye,uL;uniform float uSpec,uEmis,uAlpha,uTex;uniform sampler2D uTx;
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 L=normalize(uL);vec3 base=uCol;if(uTex>.5)base=texture2D(uTx,vT).rgb;
float d=max(dot(n,L),0.)*.78+.22;vec3 V=normalize(uEye-vW);vec3 H=normalize(L+V);float s=pow(max(dot(n,H),0.),40.)*uSpec;
float rim=pow(1.-max(dot(n,V),0.),3.)*.5;vec3 c=base*d+vec3(1.,.86,.5)*s+vec3(1.,.26,.2)*rim*.55+base*uEmis;
float fog=clamp((length(uEye-vW)-9.)/26.,0.,1.);c=mix(c,vec3(.035,.02,.022),fog);gl_FragColor=vec4(c,uAlpha);}`;
const PVS=`attribute vec3 aP;attribute vec2 aS;uniform mat4 uVP;uniform float uT,uPx;varying float vS;void main(){vec3 p=aP;p.y+=sin(uT*.45+aS.y*6.283)*.28;p.x+=cos(uT*.3+aS.y*9.)*.18;vec4 c=uVP*vec4(p,1.);gl_Position=c;gl_PointSize=max(1.,aS.x*uPx/c.w);vS=aS.y;}`;
const PFS=`precision mediump float;varying float vS;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);if(r>.5)discard;float a=smoothstep(.5,0.,r);vec3 col=mix(vec3(1.,.24,.24),vec3(1.,.78,.17),fract(vS*7.));gl_FragColor=vec4(col,a*.9);}`;
function glProg(gl,vs,fs){const mk=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
  const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  p.u={};p.a={};const nu=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<nu;i++){const n=gl.getActiveUniform(p,i).name;p.u[n]=gl.getUniformLocation(p,n)}
  const na=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);for(let i=0;i<na;i++){const n=gl.getActiveAttrib(p,i).name;p.a[n]=gl.getAttribLocation(p,n)}return p}
/* geometry builders */
function cubeG(){const P=[],N=[],T=[],I=[];const F=[[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],[[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],[[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],[[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],[[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]]];
  F.forEach(([n,vs],f)=>{vs.forEach((v,i)=>{P.push(v[0]*.5,v[1]*.5,v[2]*.5);N.push(...n);T.push(i===1||i===2?1:0,i>=2?1:0)});const b=f*4;I.push(b,b+1,b+2,b,b+2,b+3)});return{P,N,T,I}}
function cylG(n=56,h=.2){const side={P:[],N:[],T:[],I:[]},cap={P:[0,0,0],N:[0,0,1],T:[.5,.5],I:[]};
  for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a);side.P.push(c,s,-h/2,c,s,h/2);side.N.push(c,s,0,c,s,0);side.T.push(i/n,0,i/n,1);if(i<n){const b=i*2;side.I.push(b,b+1,b+3,b,b+3,b+2)}
    cap.P.push(c,s,0);cap.N.push(0,0,1);cap.T.push(.5+.5*c,.5-.5*s);if(i<n)cap.I.push(0,i+1,i+2)}return{side,cap}}
function arcG(a0,a1,r0,r1,h,steps=Math.max(2,Math.ceil((a1-a0)/.12))){const P=[],N=[],T=[],I=[];const q=(a,b,c,d,n)=>{const i=P.length/3;[a,b,c,d].forEach(v=>{P.push(...v);N.push(...n);T.push(0,0)});I.push(i,i+1,i+2,i,i+2,i+3)};
  for(let j=0;j<steps;j++){const A=a0+(a1-a0)*j/steps,B=a0+(a1-a0)*(j+1)/steps,cA=Math.cos(A),sA=Math.sin(A),cB=Math.cos(B),sB=Math.sin(B);
    q([r0*cA,h,r0*sA],[r1*cA,h,r1*sA],[r1*cB,h,r1*sB],[r0*cB,h,r0*sB],[0,1,0]);q([r0*cA,0,r0*sA],[r0*cB,0,r0*sB],[r1*cB,0,r1*sB],[r1*cA,0,r1*sA],[0,-1,0]);
    const mm=(A+B)/2;q([r1*cA,0,r1*sA],[r1*cB,0,r1*sB],[r1*cB,h,r1*sB],[r1*cA,h,r1*sA],[Math.cos(mm),0,Math.sin(mm)]);q([r0*cB,0,r0*sB],[r0*cA,0,r0*sA],[r0*cA,h,r0*sA],[r0*cB,h,r0*sB],[-Math.cos(mm),0,-Math.sin(mm)])}
  q([r0*Math.cos(a0),0,r0*Math.sin(a0)],[r1*Math.cos(a0),0,r1*Math.sin(a0)],[r1*Math.cos(a0),h,r1*Math.sin(a0)],[r0*Math.cos(a0),h,r0*Math.sin(a0)],[Math.sin(a0),0,-Math.cos(a0)]);
  q([r1*Math.cos(a1),0,r1*Math.sin(a1)],[r0*Math.cos(a1),0,r0*Math.sin(a1)],[r0*Math.cos(a1),h,r0*Math.sin(a1)],[r1*Math.cos(a1),h,r1*Math.sin(a1)],[-Math.sin(a1),0,Math.cos(a1)]);return{P,N,T,I}}
function coinTex(label){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),g=x.createRadialGradient(100,90,10,128,128,130);g.addColorStop(0,'#fff0a8');g.addColorStop(.45,'#ffc72c');g.addColorStop(1,'#d9780a');x.fillStyle=g;x.fillRect(0,0,256,256);
  x.strokeStyle='#8a2410';x.lineWidth=10;x.beginPath();x.arc(128,128,116,0,7);x.stroke();x.lineWidth=3;x.strokeStyle='#ffe58a';x.beginPath();x.arc(128,128,100,0,7);x.stroke();
  x.fillStyle='#7a1410';x.font='800 '+(label.length>3?64:label.length>2?84:110)+'px Sora,Inter,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(label,128,136);return c}
const Views3D=[];const killViews=()=>{while(Views3D.length)Views3D.pop().destroy()};
class GLView{
  constructor(host,setup){this.host=host;this.dead=false;this.vis=true;this.px=0;this.py=0;this.t0=performance.now();this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cv=document.createElement('canvas');this.cv.setAttribute('aria-hidden','true');host.append(this.cv);
    let gl=null;try{gl=this.cv.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false,powerPreference:'low-power'})}catch{}
    if(!gl){this.fallback();return}this.gl=gl;
    try{this.prog=glProg(gl,VS,FS);this.pp=glProg(gl,PVS,PFS)}catch(e){console.warn('3D disabled:',e.message);this.fallback();return}
    this.cv.addEventListener('webglcontextlost',e=>{e.preventDefault();this.fallback()});
    this.scene=setup(this);Views3D.push(this);
    this.ro=new ResizeObserver(()=>{this.size();if(this.reduce)this.frame(1.6)});this.ro.observe(host);
    this.io=new IntersectionObserver(es=>{this.vis=es[0].isIntersecting});this.io.observe(host);
    this.mv=e=>{const r=host.getBoundingClientRect();this.px=((e.clientX-r.left)/r.width-.5)*2;this.py=((e.clientY-r.top)/r.height-.5)*2};host.addEventListener('pointermove',this.mv);
    this.size();this.loop=ts=>{if(this.dead)return;this.raf=requestAnimationFrame(this.loop);if(this.vis&&!document.hidden)this.frame((ts-this.t0)/1000)};
    if(this.reduce)this.frame(1.6);else this.raf=requestAnimationFrame(this.loop)}
  fallback(){this.dead=true;this.host.classList.add('nogl');this.cv&&this.cv.remove()}
  size(){const d=Math.min(devicePixelRatio||1,1.75),w=Math.max(2,Math.round(this.host.clientWidth*d)),h=Math.max(2,Math.round(this.host.clientHeight*d));if(this.cv.width!==w||this.cv.height!==h){this.cv.width=w;this.cv.height=h}}
  frame(t){try{this.scene.draw(t)}catch(e){console.warn('3D frame failed',e);this.fallback()}}
  geo(g){const gl=this.gl,b=(d,t)=>{const o=gl.createBuffer();gl.bindBuffer(t,o);gl.bufferData(t,d,gl.STATIC_DRAW);return o};
    return{p:b(new Float32Array(g.P),gl.ARRAY_BUFFER),n:b(new Float32Array(g.N),gl.ARRAY_BUFFER),t:b(new Float32Array(g.T),gl.ARRAY_BUFFER),i:b(new Uint16Array(g.I),gl.ELEMENT_ARRAY_BUFFER),c:g.I.length}}
  tex(canvas){const gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
  pts(n,spread=[7,4,4],size=[2,6]){const a=new Float32Array(n*5);for(let i=0;i<n;i++){a[i*5]=(Math.random()-.5)*spread[0]*2;a[i*5+1]=(Math.random()-.3)*spread[1]*2;a[i*5+2]=(Math.random()-.5)*spread[2]*2;a[i*5+3]=size[0]+Math.random()*(size[1]-size[0]);a[i*5+4]=Math.random()}
    const gl=this.gl,b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);return{b,n}}
  begin(eye,tgt,fov=.9){const gl=this.gl,w=this.cv.width,h=this.cv.height;gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
    this.VP=M4.mul(M4.persp(fov,w/h,.1,80),M4.look(eye,tgt,[0,1,0]));this.eye=eye;const p=this.prog;gl.useProgram(p);gl.uniformMatrix4fv(p.u.uVP,false,this.VP);gl.uniform3fv(p.u.uEye,eye);gl.uniform3fv(p.u.uL,[.45,.85,.55]);gl.uniform1i(p.u.uTx,0)}
  mesh(g,o){const gl=this.gl,p=this.prog;gl.useProgram(p);gl.uniformMatrix4fv(p.u.uM,false,o.m);gl.uniformMatrix4fv(p.u.uR,false,o.r||M4.id());gl.uniform3fv(p.u.uCol,o.col||[1,1,1]);gl.uniform1f(p.u.uSpec,o.spec||0);gl.uniform1f(p.u.uEmis,o.emis||0);gl.uniform1f(p.u.uAlpha,o.a==null?1:o.a);gl.uniform1f(p.u.uTex,o.tex?1:0);
    if(o.tex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,o.tex)}
    if(o.a!=null&&o.a<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}else{gl.disable(gl.BLEND);gl.depthMask(true)}
    [['p','aP',3],['n','aN',3],['t','aT',2]].forEach(([k,a,s])=>{gl.bindBuffer(gl.ARRAY_BUFFER,g[k]);gl.enableVertexAttribArray(p.a[a]);gl.vertexAttribPointer(p.a[a],s,gl.FLOAT,false,0,0)});
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.i);gl.drawElements(gl.TRIANGLES,g.c,gl.UNSIGNED_SHORT,0);gl.depthMask(true)}
  points(P,t){const gl=this.gl,p=this.pp;gl.useProgram(p);gl.uniformMatrix4fv(p.u.uVP,false,this.VP);gl.uniform1f(p.u.uT,t);gl.uniform1f(p.u.uPx,this.cv.height*.45);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
    gl.bindBuffer(gl.ARRAY_BUFFER,P.b);gl.enableVertexAttribArray(p.a.aP);gl.vertexAttribPointer(p.a.aP,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(p.a.aS);gl.vertexAttribPointer(p.a.aS,2,gl.FLOAT,false,20,12);gl.drawArrays(gl.POINTS,0,P.n);gl.depthMask(true);gl.disable(gl.BLEND)}
  destroy(){this.dead=true;cancelAnimationFrame(this.raf);this.ro&&this.ro.disconnect();this.io&&this.io.disconnect();this.host&&this.mv&&this.host.removeEventListener('pointermove',this.mv);try{const e=this.gl&&this.gl.getExtension('WEBGL_lose_context');e&&e.loseContext()}catch{}this.cv&&this.cv.remove()}
}
const GOLD=[1,.78,.17],RED=[1,.27,.25],DEEP=[.55,.1,.1];
/* scene: spinning gold coins (login, swap, wallet). layout 'single' | 'pair' | 'hero' */
function sceneCoins(host,{labels=['A'],layout='single',particles=70,offsetX=0}={}){return new GLView(host,v=>{
  const cyl=cylG(56,.22),side=v.geo(cyl.side),cap=v.geo(cyl.cap),texs=labels.map(l=>v.tex(coinTex(l))),P=v.pts(particles,[7,3.5,3],[2,6]);
  const coin=(ti,x,y,z,s,ang,tilt)=>{const R=M4.mul(M4.RX(tilt),M4.RY(ang)),B=M4.mul(M4.T(x,y,z),M4.mul(R,M4.S(s,s,s)));
    v.mesh(side,{m:B,r:R,col:[.95,.62,.1],spec:.9,emis:.06});
    v.mesh(cap,{m:M4.mul(B,M4.T(0,0,.11)),r:R,tex:texs[ti%texs.length],spec:.7});
    const Rb=M4.mul(R,M4.RY(Math.PI));v.mesh(cap,{m:M4.mul(M4.mul(M4.T(x,y,z),M4.mul(Rb,M4.S(s,s,s))),M4.T(0,0,.11)),r:Rb,tex:texs[(ti+1)%texs.length],spec:.7})};
  return{draw(t){const ex=Math.sin(t*.25)*.5+v.px*.8,ey=v.py*-.5;v.begin([ex,ey+.3,5.6],[offsetX*.3,0,0]);
    if(layout==='pair'){const a=t*.9;for(let i=0;i<2;i++){const p=a+i*Math.PI;coin(i,Math.cos(p)*1.5,Math.sin(t*1.3+i)*.12,Math.sin(p)*1.2,.9,t*1.4+i,.35)}}
    else if(layout==='hero'){coin(0,offsetX,Math.sin(t*.9)*.12,0,1.45,t*.9,.3+Math.sin(t*.5)*.12);for(let i=0;i<4;i++){const a=t*.45+i*1.57;coin(i+1,offsetX+Math.cos(a)*2.6,Math.sin(a*1.5)*.7,Math.sin(a)*1.6-.4,.42,t*1.7+i,.4)}}
    else coin(0,offsetX,Math.sin(t)*.1,0,1.3,t*1.0,.28);v.points(P,t)}}})}
/* scene: 3D candlestick field from real candles */
function sceneCandles(host,getData){return new GLView(host,v=>{const cube=v.geo(cubeG()),P=v.pts(60,[6,3,3],[2,5]);
  return{draw(t){const d=getData()||[],N=Math.min(d.length,64),sl=d.slice(-N),a=Math.sin(t*.16)*.5+v.px*.35;v.begin([Math.sin(a)*8.5,3.5-v.py*.8,Math.cos(a)*8.5],[0,1.3,0]);
    v.mesh(cube,{m:M4.mul(M4.T(0,-.05,0),M4.S(26,.06,12)),col:[.09,.05,.055],spec:.35});
    for(let i=-6;i<=6;i++){v.mesh(cube,{m:M4.mul(M4.T(i*2,-.01,0),M4.S(.02,.01,12)),col:[.5,.15,.1],emis:.5});v.mesh(cube,{m:M4.mul(M4.T(0,-.01,i),M4.S(26,.01,.02)),col:[.5,.15,.1],emis:.5})}
    if(N>2){const hi=Math.max(...sl.map(x=>x.h)),lo=Math.min(...sl.map(x=>x.l)),r=(hi-lo)||1,Y=p=>(p-lo)/r*3.4,vm=Math.max(...sl.map(x=>x.v))||1,w=.3;
      sl.forEach((c,i)=>{const x=(i-N/2)*w,up=c.c>=c.o,col=up?GOLD:RED,b0=Y(Math.min(c.o,c.c)),b1=Y(Math.max(c.o,c.c)),bh=Math.max(.04,b1-b0),last=i===N-1;
        v.mesh(cube,{m:M4.mul(M4.T(x,(Y(c.l)+Y(c.h))/2,0),M4.S(.03,Math.max(.03,Y(c.h)-Y(c.l)),.03)),col:[.9,.85,.8],spec:.3});
        v.mesh(cube,{m:M4.mul(M4.T(x,b0+bh/2,0),M4.S(w*.62,bh,w*.62)),col,spec:.6,emis:last?.25+.2*Math.sin(t*4):.05});
        v.mesh(cube,{m:M4.mul(M4.T(x,c.v/vm*.7/2,-1.6),M4.S(w*.6,Math.max(.02,c.v/vm*.7),w*.6)),col:[.55,.33,.08],a:.55,emis:.2})})}
    v.points(P,t)}}})}
/* scene: extruded 3D allocation ring */
function sceneRing(host,getItems){const PAL=[[1,.78,.17],[1,.27,.25],[1,.62,.11],[.84,.16,.16],[1,.88,.4],[.7,.09,.12],[1,.48,.33],[.55,.11,.11]];
  return new GLView(host,v=>{let key='',segs=[];const P=v.pts(40,[3,2,2],[2,5]);
    const build=()=>{const items=(getItems()||[]).filter(i=>i.v>0),k=JSON.stringify(items.map(i=>Math.round(i.v*100)));if(k===key)return;key=k;const tot=items.reduce((a,i)=>a+i.v,0);let a=-Math.PI/2;
      segs=items.map((it,n)=>{const s=it.v/tot*Math.PI*2,g=arcG(a+.012,a+s-.012,.95,1.55,.28+it.v/tot*.9);a+=s;return{g:v.geo(g),col:PAL[n%PAL.length]}})};
    return{draw(t){build();const ang=t*.25+v.px*.5;v.begin([0,4.3-v.py*.6,4.6],[0,.2,0],.8);const R=M4.RY(ang);
      if(!segs.length)v.mesh(v.__ph||(v.__ph=v.geo(arcG(0,Math.PI*2,.95,1.55,.2))),{m:R,r:R,col:[.2,.12,.12],spec:.2});
      segs.forEach(s=>v.mesh(s.g,{m:R,r:R,col:s.col,spec:.55,emis:.06}));v.points(P,t)}}})}
const palCss=['#ffc72c','#ff4540','#ff9f1c','#d62929','#ffe066','#b3171f','#ff7b54','#8c1c1c'];

/* ---- 26-terminal.js ---- */
/* ============ pro chart terminal: chart types, overlays, sub-panes, drawing tools (canvas, mouse + touch) ============ */
const bollinger=(c,n=20,k=2)=>{const m=sma(c,n);return{mid:m,up:m.map((v,i)=>v==null?null:v+k*stdev(c.slice(i-n+1,i+1))),lo:m.map((v,i)=>v==null?null:v-k*stdev(c.slice(i-n+1,i+1)))}};
function stoch(d,n=14){const k=d.map((x,i)=>{if(i<n-1)return null;const w=d.slice(i-n+1,i+1),hh=Math.max(...w.map(q=>q.h)),ll=Math.min(...w.map(q=>q.l));return hh===ll?50:(x.c-ll)/(hh-ll)*100});
  const ks=k.map((_,i)=>i<n+1||k.slice(i-2,i+1).some(v=>v==null)?null:(k[i]+k[i-1]+k[i-2])/3);return{k:ks,d:ks.map((_,i)=>i<n+3||ks.slice(i-2,i+1).some(v=>v==null)?null:(ks[i]+ks[i-1]+ks[i-2])/3)}}
function vwapOf(d,intraday){let pv=0,vv=0,day=-1;return d.map(x=>{const dd=Math.floor(x.t/864e5);if(intraday&&dd!==day){day=dd;pv=0;vv=0}const tp=(x.h+x.l+x.c)/3,v=x.v||0;pv+=tp*v;vv+=v;return vv>0?pv/vv:null})}
function heikin(d){const o=[];d.forEach((x,i)=>{const c=(x.o+x.h+x.l+x.c)/4,op=i?(o[i-1].o+o[i-1].c)/2:(x.o+x.c)/2;o.push({t:x.t,o:op,c,h:Math.max(x.h,op,c),l:Math.min(x.l,op,c),v:x.v})});return o}
const TOOLS=[['cursor','Cursor','M5 3l12 7-5 1.5L9.5 17z'],['trend','Trend line','M4 18L18 6M4 18h.01M18 6h.01'],['ray','Ray','M4 18L20 4'],['hline','Horizontal line','M3 12h18'],['vline','Vertical line','M12 3v18'],['rect','Rectangle','M5 6h14v12H5z'],['fib','Fibonacci retracement','M4 5h16M4 10h16M4 15h16M4 20h16'],['measure','Measure','M4 17l16-10M7 15l1.5-3M11 13l1.5-3M15 11l1.5-3'],['text','Text note','M6 6h12M12 6v12']];
const CTYPES=[['candle','Candles'],['hollow','Hollow candles'],['ha','Heikin Ashi'],['bars','OHLC bars'],['line','Line'],['area','Area']];
const CIND=[['ma','MA 20/50'],['ema','EMA 21'],['bb','Bollinger 20,2'],['vwap','VWAP'],['vol','Volume'],['rsi','RSI 14'],['macd','MACD'],['stoch','Stochastic']];
const FIBS=[0,.236,.382,.5,.618,.786,1];
class ProChart{
  constructor(box,o={}){this.box=box;this.o={type:'candle',ma:true,ema:false,bb:false,vwap:false,vol:true,rsi:false,macd:false,stoch:false,tf:'1h',sym:'',...(LS.get('novatrade.chart',{})||{}),...o};
    this.data=[];this.count=100;this.off=0;this.hover=null;this.hy=null;this.ptr=new Map();this.tool='cursor';this.magnet=true;this.dr=[];this.sel=null;this.pend=null;this.geo={};
    box.classList.add('pc');box.innerHTML=`<div class="pc-bar"></div><div class="pc-wrap"></div>`;this.bar=box.firstChild;this.wrap=box.lastChild;this.cv=document.createElement('canvas');this.wrap.append(this.cv);this.cv.tabIndex=0;
    this.cv.setAttribute('role','img');this.cv.setAttribute('aria-label','Price chart with drawing tools. Drag to pan, scroll or pinch to zoom.');
    this.paintBar();this.bind();this.ro=new ResizeObserver(()=>this.draw());this.ro.observe(this.wrap);this.fsh=()=>{this.draw()};document.addEventListener('fullscreenchange',this.fsh)}
  persist(){const{type,ma,ema,bb,vwap,vol,rsi,macd,stoch}=this.o;LS.set('novatrade.chart',{type,ma,ema,bb,vwap,vol,rsi,macd,stoch})}
  loadDr(sym){this.o.sym=sym;this.dr=LS.get('novatrade.draw.'+sym,[])||[];this.sel=null;this.pend=null}
  saveDr(){LS.set('novatrade.draw.'+this.o.sym,this.dr)}
  paintBar(){const b=this.bar,ic2=d=>`<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d?`<path d="${d}"/>`:''}</svg>`;
    b.innerHTML=`<div class="pc-g" role="toolbar" aria-label="Drawing tools">${TOOLS.map(t=>`<button type="button" data-tool="${t[0]}" class="${this.tool===t[0]?'on':''}" title="${t[1]}" aria-label="${t[1]}">${ic2(t[2])}</button>`).join('')}<button type="button" data-a="magnet" class="${this.magnet?'on':''}" title="Snap to candle prices">🧲</button><button type="button" data-a="del" title="Delete selected drawing (Del)">⌫</button><button type="button" data-a="clear" title="Remove all drawings on this chart">🗑</button></div>
    <div class="pc-g nov"><select data-a="type" aria-label="Chart type">${CTYPES.map(t=>`<option value="${t[0]}" ${this.o.type===t[0]?'selected':''}>${t[1]}</option>`).join('')}</select><details class="pc-ind"><summary>Indicators</summary><div>${CIND.map(t=>`<label><input type="checkbox" data-i="${t[0]}" ${this.o[t[0]]?'checked':''}> ${t[1]}</label>`).join('')}</div></details><button type="button" data-a="fs" title="Full screen">⛶</button><button type="button" data-a="png" title="Save chart as image">⤓</button></div>`;
    b.onclick=e=>{const t=e.target.closest('button');if(!t)return;if(t.dataset.tool){this.setTool(t.dataset.tool);return}const a=t.dataset.a;
      if(a==='magnet'){this.magnet=!this.magnet;t.classList.toggle('on',this.magnet)}else if(a==='del')this.delSel();else if(a==='clear'){if(this.dr.length&&confirm('Remove all drawings on this chart?')){this.dr=[];this.sel=null;this.saveDr();this.draw()}}
      else if(a==='fs'){const el=this.box;document.fullscreenElement?document.exitFullscreen():(el.requestFullscreen?el.requestFullscreen():null)}else if(a==='png')this.png()};
    b.onchange=e=>{const t=e.target;if(t.dataset.a==='type'){this.o.type=t.value}else if(t.dataset.i){this.o[t.dataset.i]=t.checked;this.calc()}else return;this.persist();this.draw()}}
  setTool(t){this.tool=t;this.pend=null;this.tmp=null;$$('[data-tool]',this.bar).forEach(x=>x.classList.toggle('on',x.dataset.tool===t));this.cv.style.cursor=t==='cursor'?'crosshair':'cell';this.draw()}
  delSel(){if(this.sel==null)return;this.dr=this.dr.filter(d=>d.id!==this.sel);this.sel=null;this.saveDr();this.draw()}
  png(){const a=document.createElement('a');a.download=`${(this.o.sym||'chart').replace('/','-')}-${this.o.tf}.png`;a.href=this.cv.toDataURL('image/png');a.click()}
  /* ---- coordinates ---- */
  gi(t){const d=this.data,n=d.length;if(!n)return 0;const st=TF[this.o.tf]||6e4;if(t>=d[n-1].t)return n-1+(t-d[n-1].t)/st;if(t<=d[0].t)return(t-d[0].t)/st;let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;d[m].t<=t?lo=m:hi=m}return lo+(t-d[lo].t)/((d[hi].t-d[lo].t)||1)}
  tOf(gi){const d=this.data,n=d.length,st=TF[this.o.tf]||6e4;if(gi>=n-1)return d[n-1].t+(gi-(n-1))*st;if(gi<=0)return d[0].t+gi*st;const lo=Math.floor(gi);return d[lo].t+(gi-lo)*(d[lo+1].t-d[lo].t)}
  px(t){return(this.gi(t)-this.g.st+.5)*this.g.bw}py(v){const g=this.g;return(g.hi-v)/(g.hi-g.lo)*(g.mh-g.volH-4)+4}
  pt(x,y){const g=this.g,gi=x/g.bw-.5+g.st;let p=g.hi-(y-4)/(g.mh-g.volH-4)*(g.hi-g.lo);
    if(this.magnet){const i=Math.round(gi),b=this.data[i];if(b){const c=[b.o,b.h,b.l,b.c].map(v=>[Math.abs(this.py(v)-y),v]).sort((a,c)=>a[0]-c[0])[0];if(c[0]<14)p=c[1]}}return{t:this.tOf(gi),p}}
  /* ---- data ---- */
  set(d){this.data=d;this.calc();this.draw()}update(){this.calc();this.draw()}
  calc(){const d=this.data,c=d.map(x=>x.c),intr=(TF[this.o.tf]||0)<864e5;this.disp=this.o.type==='ha'?heikin(d):d;
    this.ind={ma20:sma(c,20),ma50:sma(c,50),ema21:this.o.ema?ema(c,21):[],bb:this.o.bb?bollinger(c):null,vwap:this.o.vwap?vwapOf(d,intr):[],rsi:this.o.rsi?rsi(c):[],macd:this.o.macd?macd(c):null,st:this.o.stoch?stoch(d):null}}
  destroy(){this.ro.disconnect();document.removeEventListener('fullscreenchange',this.fsh);this.saveDr()}
  zoom(n){this.count=Math.max(15,Math.min(Math.min(400,this.data.length||400),n));this.draw()}
  dist(){const a=[...this.ptr.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0}
  /* ---- hit testing ---- */
  segDist(x,y,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/l)):0;return Math.hypot(x-(x1+t*dx),y-(y1+t*dy))}
  hit(x,y){const g=this.g;for(let i=this.dr.length-1;i>=0;i--){const d=this.dr[i],ax=this.px(d.a.t),ay=this.py(d.a.p),bx=d.b?this.px(d.b.t):ax,by=d.b?this.py(d.b.p):ay;let h=false;
      if(d.type==='hline')h=Math.abs(y-ay)<7;else if(d.type==='vline')h=Math.abs(x-ax)<7;else if(d.type==='text')h=Math.abs(x-ax)<60&&Math.abs(y-ay)<12;
      else if(d.type==='rect'||d.type==='fib'){const x0=Math.min(ax,bx),x1=d.type==='fib'?g.pw:Math.max(ax,bx),y0=Math.min(ay,by),y1=Math.max(ay,by);h=x>=x0-6&&x<=x1+6&&y>=y0-6&&y<=y1+6&&(d.type==='fib'||Math.min(Math.abs(x-x0),Math.abs(x-x1),Math.abs(y-y0),Math.abs(y-y1))<7||true)}
      else h=this.segDist(x,y,ax,ay,d.type==='ray'?ax+(bx-ax)*1e3:bx,d.type==='ray'?ay+(by-ay)*1e3:by)<8;if(h)return d}return null}
  /* ---- input ---- */
  bind(){const c=this.cv,rel=e=>{const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
    c.addEventListener('pointerdown',e=>{if(!this.g)return;c.setPointerCapture(e.pointerId);const p=rel(e);this.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});this.pd=this.dist();this.pc=this.count;this.moved=0;this.down=p;
      if(this.tool!=='cursor'&&p.x<this.g.pw&&p.y<this.g.mh){const q=this.pt(p.x,p.y),T=this.tool;
        if(T==='hline'||T==='vline'||T==='text'){let txt;if(T==='text'){txt=prompt('Note text','');if(!txt)return}this.add({type:T,a:q,text:txt});return}
        if(this.pend){this.pend.b=q;this.finish()}else{this.pend={type:T,a:q,b:q};this.tmp=this.pend;this.pstart=p}return}
      if(this.tool==='cursor'){const h=this.hit(p.x,p.y);this.sel=h?h.id:null;this.dragD=h?{d:h,ax:this.pt(p.x,p.y),a0:{...h.a},b0:h.b?{...h.b}:null}:null;this.draw()}});
    c.addEventListener('pointermove',e=>{const p=rel(e),pr=this.ptr.get(e.pointerId);if(!this.g)return;
      if(this.pend){this.pend.b=this.pt(Math.min(p.x,this.g.pw-1),Math.min(p.y,this.g.mh)) ;this.hover=p.x;this.hy=p.y;this.draw();return}
      if(!pr){if(e.pointerType==='mouse'){this.hover=p.x;this.hy=p.y;this.draw()}return}
      if(this.dragD){const q=this.pt(p.x,p.y),a=this.dragD.ax,dt=q.t-a.t,dp=q.p-a.p,d=this.dragD.d;d.a={t:this.dragD.a0.t+dt,p:this.dragD.a0.p+dp};if(d.b)d.b={t:this.dragD.b0.t+dt,p:this.dragD.b0.p+dp};this.moved=9;this.draw();return}
      if(this.ptr.size===2){this.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});const d=this.dist();if(this.pd)this.zoom(this.pc*this.pd/d);return}
      const bw=this.g.bw,dx=e.clientX-pr.x;this.moved+=Math.abs(dx);if(Math.abs(dx)>=bw*.5||this.moved>4){this.off=Math.max(-20,Math.min(this.data.length-10,this.off+dx/bw));pr.x=e.clientX;this.hover=e.pointerType==='mouse'?p.x:null;this.hy=p.y;this.draw()}});
    const up=e=>{const p=rel(e);if(this.pend&&this.pstart){if(Math.hypot(p.x-this.pstart.x,p.y-this.pstart.y)>10){this.pend.b=this.pt(Math.min(p.x,this.g.pw-1),Math.min(p.y,this.g.mh));this.finish()}this.pstart=null}
      else if(this.dragD){if(this.moved>=9)this.saveDr();this.dragD=null}
      else if(this.ptr.get(e.pointerId)&&this.moved<5&&e.pointerType!=='mouse'){this.hover=p.x;this.hy=p.y;this.draw()}this.ptr.delete(e.pointerId)};
    c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);c.addEventListener('pointerleave',()=>{if(!this.pend){this.hover=null;this.draw()}});
    c.addEventListener('wheel',e=>{e.preventDefault();this.zoom(this.count*(e.deltaY>0?1.12:.89))},{passive:false});
    c.addEventListener('dblclick',()=>{this.off=0;this.count=100;this.draw()});
    c.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')this.off=Math.min(this.data.length-10,this.off+5);else if(e.key==='ArrowRight')this.off=Math.max(-20,this.off-5);else if(e.key==='+')this.zoom(this.count*.85);else if(e.key==='-')this.zoom(this.count*1.18);else if(e.key==='Delete'||e.key==='Backspace')this.delSel();else if(e.key==='Escape'){this.pend=null;this.tmp=null;this.setTool('cursor')}else return;e.preventDefault();this.draw()})}
  add(d){d.id=Date.now()+Math.random();this.dr.push(d);this.sel=d.id;this.pend=null;this.tmp=null;this.pstart=null;this.saveDr();this.setTool('cursor')}
  finish(){const d=this.pend;if(d&&Math.abs(d.a.t-d.b.t)+Math.abs(d.a.p-d.b.p)>0)this.add({type:d.type,a:d.a,b:d.b});else{this.pend=null;this.tmp=null}}
  /* ---- rendering ---- */
  draw(){if(!this.data.length||!this.cv.isConnected)return;const r=this.wrap.getBoundingClientRect();if(r.width<10||r.height<10)return;this.cv.style.width=r.width+'px';this.cv.style.height=r.height+'px';const[x,W,H]=fit(this.cv);x.clearRect(0,0,W,H);x.font='11px Inter,system-ui';
    const O=this.o,axis=64,pw=W-axis,n=Math.round(this.count),end=Math.min(this.data.length+20,this.data.length-Math.round(this.off)),st=end-n,subsList=['rsi','macd','stoch'].filter(k=>O[k]),sh=subsList.length?Math.min(90,H*.16):0,mh=H-20-sh*subsList.length,bw=pw/n,D=this.disp;
    const a=Math.max(0,st),b=Math.min(D.length,end),vis=D.slice(a,b);if(!vis.length)return;
    let hi=Math.max(...vis.map(d=>d.h)),lo=Math.min(...vis.map(d=>d.l));if(O.bb&&this.ind.bb){for(let i=a;i<b;i++){const u=this.ind.bb.up[i],l=this.ind.bb.lo[i];if(u!=null){hi=Math.max(hi,u);lo=Math.min(lo,l)}}}
    const pad=(hi-lo)*.08||hi*.01;hi+=pad;lo-=pad;const volH=O.vol?mh*.16:0;this.g={st,n,pw,mh,bw,hi,lo,volH,W,H};this.geo=this.g;
    const Y=v=>(hi-v)/(hi-lo)*(mh-volH-4)+4,X=i=>(i-st)*bw+bw/2,intr=(TF[O.tf]||0)<864e5;
    x.strokeStyle=CC.grid;x.fillStyle=CC.txt;x.lineWidth=1;x.textAlign='left';
    for(let i=0;i<=5;i++){const v=lo+(hi-lo)*i/5,y=Y(v);x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.fillText(fmtPrice(v),pw+6,y+4)}
    const ts=Math.max(1,Math.round(n/6));x.textAlign='center';for(let i=Math.ceil(a/ts)*ts;i<b;i+=ts){const d=new Date(D[i].t);x.fillText(intr?d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([], {month:'short',day:'numeric'}),X(i),H-6)}
    x.save();x.beginPath();x.rect(0,0,pw,H);x.clip();
    const vmax=Math.max(...vis.map(d=>d.v||0))||1;
    if(O.type==='line'||O.type==='area'){x.beginPath();vis.forEach((d,j)=>{const px=X(a+j),py=Y(d.c);j?x.lineTo(px,py):x.moveTo(px,py)});x.strokeStyle=CC.acc;x.lineWidth=2;x.stroke();x.lineWidth=1;
      if(O.type==='area'){x.lineTo(X(a+vis.length-1),mh-volH);x.lineTo(X(a),mh-volH);x.closePath();const g=x.createLinearGradient(0,0,0,mh);g.addColorStop(0,CC.acc+'55');g.addColorStop(1,'transparent');x.fillStyle=g;x.fill()}}
    vis.forEach((d,j)=>{const i=a+j,up=d.c>=d.o,col=up?CC.up:CC.down,cx=X(i);if(O.vol){const v=this.data[i].v||0;x.globalAlpha=.3;x.fillStyle=col;x.fillRect(cx-bw*.35,mh-v/vmax*volH,bw*.7,v/vmax*volH);x.globalAlpha=1}
      if(O.type==='line'||O.type==='area')return;x.strokeStyle=col;x.fillStyle=col;
      if(O.type==='bars'){x.beginPath();x.moveTo(cx,Y(d.h));x.lineTo(cx,Y(d.l));x.moveTo(cx-bw*.35,Y(d.o));x.lineTo(cx,Y(d.o));x.moveTo(cx,Y(d.c));x.lineTo(cx+bw*.35,Y(d.c));x.stroke();return}
      x.beginPath();x.moveTo(cx,Y(d.h));x.lineTo(cx,Y(d.l));x.stroke();const t=Y(Math.max(d.o,d.c)),bb=Y(Math.min(d.o,d.c)),w=Math.max(1,bw*.7);
      if(O.type==='hollow'&&up){x.strokeRect(cx-w/2,t,w,Math.max(1,bb-t))}else x.fillRect(cx-w/2,t,w,Math.max(1,bb-t))});
    const line=(arr,col,Yf,py=0,w=1.4)=>{x.strokeStyle=col;x.lineWidth=w;x.beginPath();let s=0;for(let i=a;i<b;i++){const v=arr[i];if(v==null){s=0;continue}const px=X(i),y=Yf(v)+py;s?x.lineTo(px,y):x.moveTo(px,y);s=1}x.stroke();x.lineWidth=1};
    let lx=8;const lab=(t,c)=>{x.textAlign='left';x.fillStyle=c;x.fillText(t,lx,28);lx+=x.measureText(t).width+10};
    if(O.ma){line(this.ind.ma20,CC.ma1,Y);line(this.ind.ma50,CC.ma2,Y);lab('MA20',CC.ma1);lab('MA50',CC.ma2)}
    if(O.ema){line(this.ind.ema21,'#6ee7ff',Y);lab('EMA21','#6ee7ff')}
    if(O.vwap){line(this.ind.vwap,'#c792ff',Y);lab('VWAP','#c792ff')}
    if(O.bb&&this.ind.bb){const B=this.ind.bb;x.globalAlpha=.08;x.fillStyle='#8ab4ff';x.beginPath();let s=0;for(let i=a;i<b;i++){if(B.up[i]==null)continue;s?x.lineTo(X(i),Y(B.up[i])):x.moveTo(X(i),Y(B.up[i]));s=1}for(let i=b-1;i>=a;i--){if(B.lo[i]!=null)x.lineTo(X(i),Y(B.lo[i]))}x.closePath();x.fill();x.globalAlpha=1;line(B.up,'#8ab4ff',Y,0,1);line(B.lo,'#8ab4ff',Y,0,1);line(B.mid,'#8ab4ff88',Y,0,1);lab('BB 20,2','#8ab4ff')}
    const last=this.data[this.data.length-1];if(this.off<=0){const y=Y(last.c);x.setLineDash([4,4]);x.strokeStyle=last.c>=last.o?CC.up:CC.down;x.beginPath();x.moveTo(0,y);x.lineTo(pw,y);x.stroke();x.setLineDash([])}
    /* drawings */
    const all=this.tmp?[...this.dr,{...this.tmp,tmp:1,id:-1}]:this.dr;all.forEach(d=>this.paintDr(x,d,pw,mh,Y));
    x.restore();
    this.dr.filter(d=>d.type==='hline').forEach(d=>{const y=this.py(d.a.p);if(y<0||y>mh)return;x.fillStyle='#ffc72c';x.fillRect(pw,y-9,axis,18);x.fillStyle='#1a0a05';x.textAlign='left';x.fillText(fmtPrice(d.a.p),pw+6,y+4)});
    if(this.off<=0){const y=Y(last.c);x.fillStyle=last.c>=last.o?CC.up:CC.down;x.fillRect(pw,y-9,axis,18);x.fillStyle='#1a0a05';x.textAlign='left';x.fillText(fmtPrice(last.c),pw+6,y+4)}
    /* sub panes */
    let py=mh;const pane=(title,fn)=>{x.strokeStyle=CC.grid;x.strokeRect(0,py,pw,sh-4);x.save();x.beginPath();x.rect(0,py,pw,sh-4);x.clip();fn(py);x.restore();x.fillStyle=CC.txt;x.textAlign='left';x.fillText(title,8,py+12);py+=sh};
    if(O.rsi)pane('RSI 14',p=>{const f=v=>(100-v)/100*(sh-8)+2;[30,70].forEach(l=>{x.beginPath();x.moveTo(0,p+f(l));x.lineTo(pw,p+f(l));x.stroke()});line(this.ind.rsi,CC.rsi,f,p)});
    if(O.macd&&this.ind.macd)pane('MACD 12,26,9',p=>{const m=this.ind.macd,mx=Math.max(...vis.map((_,j)=>Math.abs(m.h[a+j]||0)),1e-9)*1.6,f=v=>(1-v/mx)/2*(sh-8)+2;
      vis.forEach((_,j)=>{const h=m.h[a+j];if(h==null)return;x.fillStyle=h>=0?CC.up:CC.down;x.globalAlpha=.55;const y0=f(0),y1=f(h);x.fillRect(X(a+j)-bw*.3,p+Math.min(y0,y1),bw*.6,Math.abs(y1-y0)||1);x.globalAlpha=1});line(m.m,CC.ma1,f,p);line(m.s,CC.ma2,f,p)});
    if(O.stoch&&this.ind.st)pane('Stoch 14,3,3',p=>{const f=v=>(100-v)/100*(sh-8)+2;[20,80].forEach(l=>{x.beginPath();x.moveTo(0,p+f(l));x.lineTo(pw,p+f(l));x.stroke()});line(this.ind.st.k,CC.ma1,f,p);line(this.ind.st.d,CC.ma2,f,p)});
    /* crosshair + legend */
    const hv=this.hover!=null&&this.hover<pw?Math.min(b-1,Math.max(a,Math.floor(this.hover/bw+st))):null,d=hv!=null?this.data[hv]:last;
    if(hv!=null){const cx=X(hv);x.strokeStyle='#7a6462';x.setLineDash([3,3]);x.beginPath();x.moveTo(cx,0);x.lineTo(cx,H-18);if(this.hy!=null&&this.hy<mh){x.moveTo(0,this.hy);x.lineTo(pw,this.hy)}x.stroke();x.setLineDash([]);
      if(this.hy!=null&&this.hy<mh){const pv=hi-(this.hy-4)/(mh-volH-4)*(hi-lo);x.fillStyle='#3a2a2a';x.fillRect(pw,this.hy-9,axis,18);x.fillStyle='#fff';x.textAlign='left';x.fillText(fmtPrice(pv),pw+6,this.hy+4)}
      const dtx=new Date(d.t).toLocaleString([], {dateStyle:'short',timeStyle:intr?'short':undefined});const tw=x.measureText(dtx).width+10;x.fillStyle='#3a2a2a';x.fillRect(Math.min(pw-tw,Math.max(0,cx-tw/2)),H-18,tw,16);x.fillStyle='#fff';x.textAlign='center';x.fillText(dtx,Math.min(pw-tw/2,Math.max(tw/2,cx)),H-6)}
    const chg=(d.c/d.o-1)*100;x.textAlign='left';x.font='11.5px Inter,system-ui';x.fillStyle=CC.txt;const lg=`O ${fmtPrice(d.o)}  H ${fmtPrice(d.h)}  L ${fmtPrice(d.l)}  C ${fmtPrice(d.c)}`;x.fillText(lg,8,14);const w1=x.measureText(lg).width;x.fillStyle=chg>=0?CC.up:CC.down;x.fillText((chg>=0?'+':'')+chg.toFixed(2)+'%',16+w1,14);x.fillStyle=CC.txt;x.font='11px Inter,system-ui';
    if(this.pend)x.fillText(this.pstart?'Release to place':'Tap the second point',8,mh-8);
  }
  paintDr(x,d,pw,mh,Y){const ax=this.px(d.a.t),ay=this.py(d.a.p),b=d.b||d.a,bx=this.px(b.t),by=this.py(b.p),sel=d.id===this.sel,col=d.tmp?'#ffffffaa':sel?'#fff':'#ffc72c';x.save();x.strokeStyle=col;x.fillStyle=col;x.lineWidth=sel?2:1.4;
    const tag=(txt,xx,yy,bg='#2a1a14')=>{const w=x.measureText(txt).width+10;x.fillStyle=bg;x.fillRect(xx,yy-9,w,18);x.fillStyle='#fff';x.textAlign='left';x.fillText(txt,xx+5,yy+4)};
    switch(d.type){
      case'trend':x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();break;
      case'ray':{const k=1e3;x.beginPath();x.moveTo(ax,ay);x.lineTo(ax+(bx-ax)*k,ay+(by-ay)*k);x.stroke();break}
      case'hline':x.beginPath();x.moveTo(0,ay);x.lineTo(pw,ay);x.stroke();break;
      case'vline':x.beginPath();x.moveTo(ax,0);x.lineTo(ax,this.g.H);x.stroke();break;
      case'rect':x.globalAlpha=.12;x.fillRect(Math.min(ax,bx),Math.min(ay,by),Math.abs(bx-ax),Math.abs(by-ay));x.globalAlpha=1;x.strokeRect(Math.min(ax,bx),Math.min(ay,by),Math.abs(bx-ax),Math.abs(by-ay));break;
      case'fib':{const x0=Math.min(ax,bx);FIBS.forEach((f,i)=>{const p=d.b.p+(d.a.p-d.b.p)*f,y=this.py(p);x.globalAlpha=.9;x.strokeStyle=['#ff4d4f','#ff9f1c','#ffc72c','#fff','#8ab4ff','#c792ff','#ffc72c'][i];x.setLineDash(i&&i<6?[4,3]:[]);x.beginPath();x.moveTo(x0,y);x.lineTo(pw,y);x.stroke();x.setLineDash([]);x.fillStyle=x.strokeStyle;x.textAlign='left';x.fillText(`${(f*100).toFixed(1)}%  ${fmtPrice(p)}`,x0+4,y-3)});x.globalAlpha=.5;x.strokeStyle=col;x.setLineDash([3,3]);x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();break}
      case'measure':{x.setLineDash([5,4]);x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();x.setLineDash([]);const dp=d.b.p-d.a.p,bars=Math.round(this.gi(d.b.t)-this.gi(d.a.t)),txt=`${dp>=0?'+':''}${fmtPrice(dp)} (${(dp/d.a.p*100).toFixed(2)}%) · ${Math.abs(bars)} bars`;tag(txt,Math.min(pw-x.measureText(txt).width-12,Math.max(2,bx+6)),by+(dp>=0?-14:14),dp>=0?'#1f6b3a':'#7a2327');break}
      case'text':tag(d.text||'Note',ax+4,ay-12,'#2a1a14');break}
    if(sel){x.fillStyle='#fff';[[ax,ay],d.b?[bx,by]:null].filter(Boolean).forEach(([hx,hy])=>{x.beginPath();x.arc(hx,hy,4,0,7);x.fill()})}x.restore()}
}

/* ---- 30-shell.js ---- */
/* ============ app shell, router, auth screens ============ */
const go=h=>{if(location.hash===h)route();else location.hash=h};
const App={user:null,profile:null,isAdmin:false,cleanups:[],shell:false,unread:0};
const pages={};
const onLeave=f=>App.cleanups.push(f);
function onData(tables,fn,every=0){let to;const run=()=>{clearTimeout(to);to=setTimeout(()=>fn(),350)};const off=Bus.on('table',t=>{if(!tables||tables.includes(t))run()});onLeave(off);onLeave(()=>clearTimeout(to));
  if(every){const iv=setInterval(()=>{if(!document.hidden)fn()},every);onLeave(()=>clearInterval(iv))}}
const NAV=[['dashboard','Dashboard','dash'],['exchange','Trade','trade'],['markets','Markets','mkt'],['memecoins','Memecoins','meme'],['stocks','Stocks','stock'],['ai','AI Trading','ai'],['bots','Bots','bot'],['wallet','Wallet','wallet'],['swap','Swap','swap'],['analytics','Analytics','chart'],['activity','Activity','list'],['news','News','news'],['account','Settings','gear']];
const ADMIN_SECTIONS=['overview','stats','events','feed','users','withdrawals','deposits','bots','coins','fees','transactions','orders','health','jobs','audit','news'];
const favs=()=>LS.get('novatrade.fav',['BTC/USDT','ETH/USDT','SOL/USDT']);
const toggleFav=s=>{const f=favs(),i=f.indexOf(s);i<0?f.push(s):f.splice(i,1);LS.set('novatrade.fav',f)};
const displayName=()=>App.profile?.display_name||(App.user?.email||'Trader').split('@')[0];
async function guard(view,fn){view.innerHTML=`<div class="card">${skeleton(6)}</div>`;try{await fn()}catch(e){console.error(e);view.innerHTML=errBox(e.message||'Unexpected error');const b=$('[data-act=retry]',view);if(b)b.onclick=()=>guard(view,fn)}}
const head=(t,s,right='')=>`<div class="row between" style="margin-bottom:16px"><div class="grow"><h1>${t}</h1><div class="mut">${s||''}</div></div>${right}</div>`;
function feedPill(){const live=Market.serverLive,any=Object.keys(Market.tickers).length;return live?`<i class="dot"></i><span>Live prices</span>`:any?`<i class="dot w"></i><span>Reference prices · trading paused</span>`:`<i class="dot d"></i><span>Market data offline</span>`}
const notice=()=>{let h='';if(Backend.missing)h+=`<div class="banner bad"><b>Setup required.</b> The trading backend functions are not installed on this Supabase project, so orders, swaps, withdrawals, bots and the AI agent are disabled. Run <code>supabase/migrations/002_trading_logic.sql</code> (see README).</div>`;
  else if(!Market.serverLive&&Object.keys(Market.tickers).length)h+=`<div class="banner warn"><b>Trading prices are offline.</b> The server price feed has not reported recently. You are seeing reference market data, which cannot be traded. Orders, swaps and bot actions will be rejected until the feed is running.</div>`;return h};

/* ============ demo mode: a separate, server-side virtual account (same app, separate data, cannot withdraw) ============ */
const Demo={busy:false,get on(){return !!(App.profile&&App.profile.is_demo)},
  swap(){RT.stop();App.user=null;App.profile=null;App.isAdmin=false;App.shell=false;killViews();location.hash='#/dashboard';route()},
  async enter(){if(this.busy)return;this.busy=true;try{
      let r;try{r=await fetch(CFG.url+'/functions/v1/demo-session',{method:'POST',headers:{apikey:CFG.key,Authorization:'Bearer '+Auth.tok,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(25000)})}catch{throw new ApiError('network','Cannot reach the server.',0)}
      const j=await r.json().catch(()=>({}));if(!r.ok||!j.access_token)throw new ApiError('demo',j.error||'The demo account is not available yet. An administrator must run migration 004 and deploy the demo-session function.',r.status);
      LS.set('novatrade.real_rt',Auth.rt);Auth.set(j);toast('Demo account ready');this.swap()}
    catch(e){toast(e.message,'bad');paintChrome()}finally{this.busy=false}},
  async exit(){if(this.busy)return;this.busy=true;try{const rt=LS.get('novatrade.real_rt',null);
      if(!rt){await AuthApi.logout('local');LS.set('novatrade.real_rt',null);signedOut();return}
      Auth.rt=rt;await Auth.refresh();LS.set('novatrade.real_rt',null);toast('Back to your live account');this.swap()}
    catch(e){Auth.clear();LS.set('novatrade.real_rt',null);signedOut();toast('Please sign in again','bad')}finally{this.busy=false}},
  async reset(){modal({title:'Reset demo account',body:'<div class="mut">This deletes all demo orders, positions, bots and history and restores 100,000 virtual USDT. Your live account is not touched.</div>',actions:[{label:'Cancel'},{label:'Reset',cls:'danger',fn:async()=>{try{await rpc('demo_reset');toast('Demo account reset');route();return true}catch(e){toast(e.message,'bad');return false}}}]})},
  async topup(){try{await rpc('demo_topup',{p_amount:100000});toast('Added 100,000 virtual USDT');route()}catch(e){toast(e.message,'bad')}}};
const demoBlock=t=>`<div class="card">${empty(t+' are disabled in the demo account','Demo money is virtual and cannot be deposited or withdrawn. Switch to Live (top bar) for real balances.')}</div>`;
function renderShell(){
  $('#root').innerHTML=`<div id="app"><aside id="side" aria-label="Main navigation"><div class="brand"><div class="logo"><svg viewBox="0 0 32 32"><path d="M16 5l9 21h-4.6l-1.9-4.6h-5.0L11.6 26H7z"/></svg></div>NovaTrade</div>
  <nav class="nav" id="nav"></nav><div class="foot">Digital assets are volatile. Only trade what you can afford to lose.</div></aside>
  <div id="main"><header id="top"><button class="btn sm" id="menu" aria-label="Open menu">${ic('menu')}</button>
  <div class="seg" id="mode" role="group" aria-label="Account mode"><button data-m="live">Live</button><button data-m="demo" title="Practice with virtual money">Demo</button></div><div class="search"><span>${ic('search')}</span><input id="sq" placeholder="Search coins, pairs, markets…" aria-label="Search markets" autocomplete="off"><div id="sres"></div></div><div class="grow"></div>
  <span class="pill hide-m" id="feed"></span><a class="btn sm" href="#/notifications" id="nb" aria-label="Notifications">${ic('bell')}<span id="nc"></span></a>
  <a href="#/account" class="avatar" id="av" aria-label="Account" title="Account"></a><button class="btn sm" id="lo" aria-label="Sign out">${ic('logout')}</button></header><div id="tstrip" class="tstrip" aria-label="Live prices"></div><div id="demob" class="demob" hidden></div><main id="view" tabindex="-1"></main></div></div>
  <nav id="bnav" aria-label="Quick navigation">${[['dashboard','Home','dash'],['exchange','Trade','trade'],['swap','Swap','swap'],['wallet','Wallet','wallet'],['ai','AI','ai']].map(n=>`<a href="#/${n[0]}" data-r="${n[0]}">${ic(n[2])}${n[1]}</a>`).join('')}</nav>`;
  App.shell=true;$('#menu').onclick=()=>$('#side').classList.toggle('open');$('#side').onclick=e=>{if(e.target.closest('a'))$('#side').classList.remove('open')};
  $('#lo').onclick=async()=>{await AuthApi.logout('local');LS.set('novatrade.real_rt',null);signedOut()};
  $('#mode').onclick=e=>{const m=e.target.dataset.m;if(!m)return;if(m==='demo'&&!Demo.on)Demo.enter();if(m==='live'&&Demo.on)Demo.exit()};
  $('#demob').onclick=e=>{const a=e.target.dataset.a;if(a==='exit')Demo.exit();if(a==='reset')Demo.reset();if(a==='top')Demo.topup()};
  const sq=$('#sq'),sr=$('#sres');sq.oninput=()=>{const q=sq.value.trim().toUpperCase();if(!q){sr.style.display='none';return}const r=Object.values(Market.tickers).filter(t=>t.symbol.includes(q)||(t.name||'').toUpperCase().includes(q)).slice(0,8);
    sr.innerHTML=r.length?r.map(t=>`<a href="#/exchange/${t.symbol.replace('/','-')}"><span>${coinIcon(t.base)}${t.symbol}</span><span class="num">${fmtPrice(t.price)}</span></a>`).join(''):'<div class="empty">No matches</div>';sr.style.display='block'};
  document.addEventListener('click',e=>{if(!e.target.closest('.search'))sr.style.display='none'});sr.onclick=()=>{sr.style.display='none';sq.value=''};
  paintNav();paintChrome();
}
function paintNav(){const nav=$('#nav');if(!nav)return;nav.innerHTML=NAV.map(n=>`<a href="#/${n[0]}" data-r="${n[0]}">${ic(n[2])}${n[1]}</a>`).join('')+(App.isAdmin?`<small>Staff</small><a href="#/admin/overview" data-r="admin">${ic('admin')}Admin</a>`:'');markNav()}
const STRIP=['BTC','ETH','SOL','XAU','NVDA','AAPL','TSLA','DOGE','PEPE','BNB'];
function paintStrip(){const el=$('#tstrip');if(!el)return;const a=STRIP.map(b=>Market.tickers[b+'/USDT']).filter(Boolean);el.innerHTML=a.map(t=>`<a href="#/exchange/${t.symbol.replace('/','-')}" class="ts"><b>${esc(t.base)}</b> <span class="num">${fmtPrice(t.price)}</span> <span class="${cl(t.change24h)}">${pct(t.change24h)}</span></a>`).join('')}
function paintChrome(){paintStrip();const dm=Demo.on;$$('#mode button').forEach(b=>b.classList.toggle('on',(b.dataset.m==='demo')===dm));const bn=$('#demob');if(bn){bn.hidden=!dm;if(dm)bn.innerHTML=`<span><b>DEMO ACCOUNT</b> · virtual money only, nothing here is real. Deposits and withdrawals are disabled.</span><span class="grow"></span><button class="btn sm" data-a="top">Add $100,000</button><button class="btn sm" data-a="reset">Reset account</button><button class="btn sm pri" data-a="exit">Back to live</button>`}const f=$('#feed');if(f)f.innerHTML=feedPill();const av=$('#av');if(av)av.textContent=displayName().slice(0,1).toUpperCase();const nc=$('#nc');if(nc)nc.textContent=App.unread?` ${App.unread}`:''}
async function refreshUnread(){try{const r=await sel('notifications','select=id&read=eq.false&limit=1',{count:true});App.unread=r.count||0;paintChrome()}catch{}}
function markNav(){const h=location.hash.replace(/^#\/?/,'').split('?')[0];$$('#side a[data-r],#bnav a[data-r]').forEach(a=>a.classList.toggle('on',h===a.dataset.r||h.startsWith(a.dataset.r+'/')))}
function signedOut(){RT.stop();App.user=null;App.profile=null;App.isAdmin=false;App.shell=false;killViews();location.hash='#/login';route()}
Bus.on('signedout',signedOut);Bus.on('backend',()=>{const v=$('#view');if(v&&!$('#bk-banner')){const d=document.createElement('div');d.id='bk-banner';d.innerHTML=notice();v.prepend(d)}});
async function loadUser(){
  const u=await AuthApi.user();App.user=u;
  const[pr,roles]=await Promise.all([sel('profiles',`id=eq.${u.id}&select=*`).catch(()=>[]),sel('user_roles',`user_id=eq.${u.id}&select=role`).catch(()=>[])]);
  App.profile=pr[0]||null;App.isAdmin=roles.some(r=>r.role==='admin');Market.loadSettings();RT.start();refreshUnread();await probeBackend();
}
function parseAuthHash(){const h=location.hash;if(!h||h.startsWith('#/')||h==='#')return null;const p=new URLSearchParams(h.slice(1));if(p.get('error_description')){let m=p.get('error_description').replace(/\+/g,' ');if(/expired|invalid/i.test(m))m+='. If you already confirmed your email, just sign in; otherwise use “Forgot password?” or sign up again to get a fresh link.';return{error:m}};if(!p.get('access_token'))return null;
  return{access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_in:+p.get('expires_in')||3600,type:p.get('type')}}
let landing=null;
async function route(){
  App.cleanups.splice(0).forEach(f=>{try{f()}catch{}});killViews();if(modalClose)modalClose();
  const hh=parseAuthHash();if(hh){history.replaceState(null,'',location.pathname+location.search);if(hh.error){toast(hh.error,'bad');location.hash='#/login'}else{Auth.set(hh);landing=hh.type}if(hh.error)return}
  const name=(location.hash.replace(/^#\/?/,'').split('?')[0].split('/')[0])||'dashboard';
  if(['login','register','forgot'].includes(name)&&!(Auth.tok&&landing)){return authPage(name)}
  if(!Auth.tok){if(Auth.rt){try{await Auth.refresh()}catch{Auth.clear()}}if(!Auth.tok){location.hash='#/login';return}}
  try{if(!App.user)await loadUser()}catch(e){Auth.clear();location.hash='#/login';toast(e.message,'bad');return}
  if(landing==='recovery'){landing=null;return authPage('reset')}landing=null;
  if(AuthApi.totp(App.user)&&Auth.aal()!=='aal2')return authPage('mfa');
  if(!App.shell||!$('#view'))renderShell();else{paintNav();paintChrome()}
  markNav();const v=$('#view'),rest=location.hash.replace(/^#\/?/,'').split('?')[0].split('/').slice(1);
  v.onclick=v.onchange=v.oninput=v.onsubmit=v.onkeydown=null; /* page handlers on the shared #view must not leak into the next page */
  const fn=pages[name]||pages.notfound;fn(v,rest);v.focus({preventScroll:true});window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
Market.sub(()=>{if(App.shell)paintChrome()});
function authPage(kind){
  App.shell=false;
  const T={login:['Sign in','Welcome back'],register:['Create account','Start trading in minutes'],forgot:['Reset password','We will email you a secure reset link'],reset:['Set a new password','Choose a strong password'],mfa:['Two-factor verification','Enter the 6-digit code from your authenticator app']}[kind];
  $('#root').innerHTML=`<div class="auth"><div class="bg gl" id="abg"></div><div class="card glow"><div class="brand"><div class="logo"><svg viewBox="0 0 32 32"><path d="M16 5l9 21h-4.6l-1.9-4.6h-5.0L11.6 26H7z"/></svg></div>NovaTrade</div>
  <h1>${T[0]}</h1><div class="mut" style="margin-bottom:16px">${T[1]}</div>
  ${!CFG.url?'<div class="banner bad">This app is not configured. Set <code>url</code> and <code>key</code> in <code>config.js</code>.</div>':''}
  <form id="af" novalidate>${kind==='mfa'?`<div class="f"><label for="otp">Authentication code</label><input id="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" autofocus><div class="err" id="e1"></div></div>`:`
  ${kind!=='reset'?`<div class="f"><label for="em">Email</label><input id="em" type="email" autocomplete="username" required><div class="err" id="e1"></div></div>`:''}
  ${kind!=='forgot'?`<div class="f"><label for="pw">${kind==='reset'?'New password':'Password'}</label><input id="pw" type="password" autocomplete="${kind==='login'?'current-password':'new-password'}" required><div class="err" id="e2"></div></div>`:''}
  ${kind==='register'?`<label class="chk f"><input type="checkbox" id="tos"> I understand trading digital assets is risky and I accept the terms of service.</label>`:''}`}
  <div class="err" id="e0" role="alert"></div><button class="btn pri blk" id="sb">${kind==='mfa'?'Verify':T[0]}</button></form>
  <div class="row between" style="margin-top:14px;font-size:13px">${kind==='login'?'<a href="#/register">Create account</a><a href="#/forgot">Forgot password?</a>':kind==='mfa'?'<a href="#/login" id="cancel">Use a different account</a>':'<a href="#/login">Back to sign in</a>'}</div></div></div>`;
  sceneCoins($('#abg'),{labels:['₿','Ξ','◎','A'],layout:'hero',offsetX:innerWidth>900?2.4:0,particles:90});
  if($('#cancel'))$('#cancel').onclick=async e=>{e.preventDefault();await AuthApi.logout('local');location.hash='#/login'};
  $('#af').onsubmit=async e=>{e.preventDefault();const b=$('#sb'),e0=$('#e0');e0.textContent='';
    try{
      if(kind==='mfa'){const code=$('#otp').value.trim();if(!/^\d{6}$/.test(code))return $('#e1').textContent='Enter the 6-digit code.';b.disabled=true;
        await AuthApi.challengeVerify(AuthApi.totp(App.user).id,code);go('#/dashboard');return}
      const em=($('#em')?.value||'').trim(),pw=$('#pw')?.value||'';
      if($('#em'))$('#e1').textContent=/^\S+@\S+\.\S+$/.test(em)?'':'Enter a valid email address.';
      if($('#pw'))$('#e2').textContent=pw.length>=(kind==='login'?1:10)?'':(kind==='login'?'Enter your password.':'Use at least 10 characters.');
      if($('#e1')?.textContent||$('#e2')?.textContent)return;
      if(kind==='register'&&!$('#tos').checked)return e0.textContent='Please accept the terms to continue.';
      b.disabled=true;
      if(kind==='forgot'){await AuthApi.recover(em);$('#af').innerHTML='<div class="banner">If an account exists for that email, a reset link has been sent. Check your inbox.</div>';return}
      if(kind==='reset'){await AuthApi.setPassword(pw);toast('Password updated','ok');go('#/dashboard');return}
      if(kind==='register'){const r=await AuthApi.signup(em,pw);if(!r.access_token){$('#af').innerHTML='<div class="banner"><b>Almost there.</b> Check your email and confirm your address, then sign in.</div>';return}App.user=null;go('#/dashboard');return}
      await AuthApi.login(em,pw);App.user=null;ins('login_events',{device:(navigator.userAgent||'').slice(0,160)}).catch(()=>{});
      go('#/dashboard');
    }catch(er){e0.textContent=er.code==='invalid_credentials'||er.status===400?(kind==='mfa'?'That code is not valid. Try again.':er.message):er.message}finally{b.disabled=false}};
}
pages.notfound=v=>{v.innerHTML=`<div class="card">${empty('Page not found','Use the navigation to continue.')}</div>`};

/* ---- 35-markets.js ---- */
/* ============ coin picker + Markets page ============ */
const CATS=[['all','All'],['fav','★ Favorites'],['crypto','Crypto'],['meme','Memecoins'],['stock','Stocks'],['commodity','Gold & commodities']];
const inCat=(t,c,f)=>c==='all'||(c==='fav'?f.includes(t.symbol):(t.kind||Market.kind(t.base))===c);
const mkRow=(t,f)=>`<div class="kv click mk-row" data-s="${t.symbol}" data-p="${t.price}"><span>${coinIcon(t.base)} <b>${esc(t.base)}</b> <span class="mut">${esc(Market.names[t.base]||'')}</span>${t.src==='closed'?'<span class="pill">closed</span>':''}</span><span class="num r">${fmtPrice(t.price)}<br><span class="${cl(t.change24h)}" style="font-size:11px">${pct(t.change24h)}</span></span></div>`;
/* searchable coin picker (works on every screen size) */
function pickCoin(cur,onPick){let cat='all',q='';
  const paint=()=>{const f=favs(),all=Object.values(Market.tickers).filter(t=>inCat(t,cat,f)&&(!q||(t.base+' '+(Market.names[t.base]||'')).toLowerCase().includes(q)));
    $('#cpl').innerHTML=all.length?all.map(t=>mkRow(t,f)).join(''):'<div class="mut" style="padding:10px">No matches.</div>'};
  modal({title:'Choose market',body:`<input id="cpq" placeholder="Search coin, stock or commodity…" aria-label="Search markets"><div class="mk-tabs" style="margin:10px 0">${CATS.map(c=>`<button class="btn sm ${c[0]===cat?'pri':''}" data-c="${c[0]}">${c[1]}</button>`).join('')}</div><div id="cpl" class="cpick"></div>`,actions:[{label:'Close'}]});
  paint();const m=$('#modal');$('#cpq').oninput=e=>{q=e.target.value.trim().toLowerCase();paint()};
  m.addEventListener('click',e=>{const c=e.target.closest('[data-c]');if(c){cat=c.dataset.c;$$('[data-c]',m).forEach(b=>b.classList.toggle('pri',b.dataset.c===cat));paint();return}const r=e.target.closest('[data-s]');if(r){modalClose&&modalClose();onPick(r.dataset.s)}})}
pages.markets=v=>guard(v,async()=>{
  const st={cat:LS.get('novatrade.mcat','all'),q:'',sort:LS.get('novatrade.msort','cap')};
  v.innerHTML=head('Markets','Live prices for crypto, memecoins, stocks and gold · updated as the server feed arrives')+`<div id="nt">${notice()}</div><div class="card"><div class="row" style="margin-bottom:10px"><input id="mq" placeholder="Search markets…" style="max-width:280px" aria-label="Search markets"><select id="ms" style="max-width:190px" aria-label="Sort"><option value="cap">Rank</option><option value="chg">24h change</option><option value="vol">Volume</option><option value="name">Name</option></select><span class="mut" id="mc"></span></div><div class="mk-tabs" id="mt">${CATS.map(c=>`<button class="btn sm ${c[0]===st.cat?'pri':''}" data-c="${c[0]}">${c[1]}</button>`).join('')}</div><div class="tw"><table><thead><tr><th>Market</th><th class="r">Price</th><th class="r">24h</th><th class="r hide-m">High</th><th class="r hide-m">Low</th><th class="r hide-m">Volume</th><th class="hide-m">Status</th></tr></thead><tbody id="mb2"></tbody></table></div></div>`;
  $('#ms').value=st.sort;let last={};
  const paint=()=>{const f=favs();let a=Object.values(Market.tickers).filter(t=>inCat(t,st.cat,f)&&(!st.q||(t.base+' '+(Market.names[t.base]||'')).toLowerCase().includes(st.q)));
    a.sort((x,y)=>st.sort==='chg'?y.change24h-x.change24h:st.sort==='vol'?y.volume*y.price-x.volume*x.price:st.sort==='name'?x.base.localeCompare(y.base):(Market.caps[y.base]||0)-(Market.caps[x.base]||0));
    $('#mc').textContent=a.length+' markets';$('#mb2').innerHTML=a.map(t=>{const fl=last[t.symbol]!=null&&last[t.symbol]!==t.price?(t.price>last[t.symbol]?'flash-up':'flash-dn'):'';last[t.symbol]=t.price;
      return`<tr class="mk-row ${fl}" data-s="${t.symbol}"><td><button class="star ${f.includes(t.symbol)?'on':''}" data-f="${t.symbol}" aria-label="Toggle favorite">★</button>${coinIcon(t.base)} <b>${esc(t.base)}</b> <span class="mut">${esc(Market.names[t.base]||'')}</span><span class="pill">${esc((KINDS[t.kind]||'Crypto').replace('Gold & commodities','Commodity'))}</span></td><td class="num r">${fmtPrice(t.price)}</td><td class="num r ${cl(t.change24h)}">${pct(t.change24h)}</td><td class="num r hide-m">${fmtPrice(t.high)}</td><td class="num r hide-m">${fmtPrice(t.low)}</td><td class="num r hide-m">${nf(t.volume*(t.kind==='stock'?1:1),0)}</td><td class="hide-m">${t.src==='server'?'<span class="badge ok">live</span>':t.src==='closed'?'<span class="badge wait">market closed</span>':'<span class="badge wait">reference</span>'}</td></tr>`}).join('')||'<tr><td colspan="7" class="mut" style="padding:14px">Nothing here yet. Prices arrive from the server feed.</td></tr>'};
  paint();onLeave(Market.sub(paint));
  $('#mq').oninput=e=>{st.q=e.target.value.trim().toLowerCase();paint()};$('#ms').onchange=e=>{st.sort=e.target.value;LS.set('novatrade.msort',st.sort);paint()};
  $('#mt').onclick=e=>{const c=e.target.dataset.c;if(!c)return;st.cat=c;LS.set('novatrade.mcat',c);$$('#mt button').forEach(b=>b.classList.toggle('pri',b.dataset.c===c));paint()};
  v.onclick=e=>{const f=e.target.closest('[data-f]');if(f){toggleFav(f.dataset.f);paint();return}const r=e.target.closest('[data-s]');if(r)location.hash='#/exchange/'+r.dataset.s.replace('/','-')}});

/* ---- 36-memecoins.js ---- */
/* ============ Memecoin discovery: public on-chain DEX data via the meme-data function (read-only, no trading, no keys in the browser) ============ */
const MCH=[['all','All chains'],['solana','Solana'],['base','Base'],['ethereum','Ethereum'],['bsc','BNB Chain'],['arbitrum','Arbitrum']];
const GMGN_SLUG={solana:'sol',base:'base',ethereum:'eth',bsc:'bsc'};
const cu=n=>n==null||!isFinite(n)?'—':n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(2)+'B':n>=1e6?'$'+(n/1e6).toFixed(2)+'M':n>=1e3?'$'+(n/1e3).toFixed(1)+'K':'$'+n.toFixed(0);
const ageOf=t=>{if(!t)return'—';const s=Math.max(0,(Date.now()-t)/1000);return s<90?Math.round(s)+'s':s<5400?Math.round(s/60)+'m':s<172800?Math.round(s/3600)+'h':Math.round(s/86400)+'d'};
const tinyPx=p=>{if(p==null||!isFinite(p))return'—';if(p>=1)return'$'+fmtPrice(p);const z=-Math.floor(Math.log10(p))-1;if(z<4)return'$'+p.toFixed(z+4).replace(/0+$/,'');const d=p.toFixed(z+4).replace('.','').replace(/^0+/,'').slice(0,4);return`$0.0<sub>${z}</sub>${d}`};
const pc=n=>n==null?'<span class="mut">—</span>':`<span class="${n>=0?'up':'down'}">${n>=0?'+':''}${Math.abs(n)>=1000?nf(n,0):n.toFixed(2)}%</span>`;
const avatar=(sym)=>{let h=0;for(const ch of String(sym||'?'))h=(h*31+ch.charCodeAt(0))%360;return`<span class="mav" style="background:hsl(${h} 70% 45%)">${esc(String(sym||'?').slice(0,1).toUpperCase())}</span>`};
/* simple rules on public numbers; NOT a security audit */
const memeRisk=r=>{const w=[];if((r.liq||0)<10000)w.push('Thin liquidity (< $10K)');if(r.created&&Date.now()-r.created<3600e3)w.push('Pool under 1 hour old');if(r.buys!=null&&r.sells!=null&&r.buys+r.sells>50&&r.sells/(r.buys+r.sells)>.65)w.push('Mostly sells in 24h');if(r.mcap&&r.liq&&r.mcap/r.liq>200)w.push('Market cap ≫ liquidity');return w};
const riskBadge=r=>{const w=memeRisk(r);return`<span class="badge ${w.length===0?'active':w.length===1?'review':'failed'}" title="${esc(w.join(' · ')||'No simple red flags found. This is not an audit.')}">${w.length===0?'No flags':w.length===1?'Caution':'High risk'}</span>`};
const memeKey=r=>r.chain+':'+r.address;
const memeWatch=()=>LS.get('novatrade.memewatch',[]);
const memeLinks=r=>{const g=GMGN_SLUG[r.chain];return[g?`<a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://gmgn.ai/${g}/token/${enc(r.address)}">GMGN</a>`:'',`<a class="btn sm" target="_blank" rel="noopener noreferrer" href="https://dexscreener.com/${enc(r.chain)}/${enc(r.pair||r.address)}">DexScreener</a>`,r.url&&/^https:\/\/www\.geckoterminal\.com\//.test(r.url)?`<a class="btn sm" target="_blank" rel="noopener noreferrer" href="${esc(r.url)}">GeckoTerminal</a>`:''].join(' ')};

pages.memecoins=v=>guard(v,async()=>{
  const st={tab:LS.get('novatrade.mtab','trending'),chain:LS.get('novatrade.mchain','all'),q:'',rows:[],ts:0,err:'',busy:false,seq:0};
  const TABS=[['trending','Trending'],['new','New pairs'],['hot','Hot (boosted)'],['gain','Top gainers'],['lose','Top losers'],['watch','★ Watchlist']];
  const inApp=Object.values(Market.tickers).filter(t=>(t.kind||Market.kind(t.base))==='meme');
  v.innerHTML=head('Memecoin Discovery','On-chain tokens from public DEX data (GeckoTerminal · DexScreener), refreshed every 30 seconds')+`<div id="nt">${notice()}</div>
  <div class="banner warn"><b>Discovery only.</b> NovaTrade does not buy or sell on-chain tokens. Open a token on GMGN or DexScreener and trade from your own wallet. Prices come from public APIs and can be delayed or wrong; the risk flags are simple rules on public numbers, <b>not a security audit</b>. Most memecoins lose all their value.</div>
  ${inApp.length?`<div class="card" style="margin-top:12px"><h3>Memecoins you can trade on NovaTrade <span class="mut" style="font-weight:400;font-size:12px">server prices, real order flow</span></h3><div class="row" style="gap:8px;flex-wrap:wrap">${inApp.map(t=>`<a class="pill" href="#/exchange/${t.symbol.replace('/','-')}" style="text-decoration:none;color:inherit">${coinIcon(t.base)} <b>${esc(t.base)}</b> <span class="num">${fmtPrice(t.price)}</span> ${pc(t.change24h)}</a>`).join('')}</div></div>`:''}
  <div class="card" style="margin-top:12px"><div class="mk-tabs" id="mtabs" role="tablist">${TABS.map(t=>`<button class="btn sm" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
  <div class="row" style="margin:10px 0;gap:8px;flex-wrap:wrap"><div class="mk-tabs" id="mchains">${MCH.map(c=>`<button class="btn sm" data-c="${c[0]}">${c[1]}</button>`).join('')}</div><span class="grow"></span><input id="mq2" placeholder="Search token name, symbol or contract…" style="max-width:300px" aria-label="Search tokens"><button class="btn sm" id="mrf" title="Refresh">${ic('refresh')||'↻'}</button></div>
  <div id="mmeta" class="mut" style="font-size:12px;margin-bottom:6px"></div><div id="mbody" class="tw">${skeleton(5)}</div></div>`;
  const paintTabs=()=>{$$('#mtabs button').forEach(b=>b.classList.toggle('pri',b.dataset.t===st.tab&&!st.q));$$('#mchains button').forEach(b=>b.classList.toggle('pri',b.dataset.c===st.chain))};
  const view=()=>{let a=st.rows.filter(r=>st.chain==='all'||r.chain===st.chain);
    if(st.tab==='gain'||st.tab==='lose'){a=a.filter(r=>(r.liq||0)>=5000&&r.h24!=null);a.sort((x,y)=>st.tab==='gain'?y.h24-x.h24:x.h24-y.h24)}
    return a.slice(0,60)};
  const paint=()=>{paintTabs();const a=view(),w=memeWatch().map(memeKey);
    $('#mmeta').textContent=st.err?'':st.ts?`${a.length} tokens · updated ${Math.max(0,Math.round((Date.now()-st.ts)/1000))}s ago · source: ${st.q?'DexScreener search':st.tab==='trending'||st.tab==='new'?'GeckoTerminal':'DexScreener'}`:'';
    $('#mbody').innerHTML=st.err?errBox(st.err):a.length?`<table><thead><tr><th>#</th><th>Token</th><th class="r">Price</th><th class="r">5m</th><th class="r">1h</th><th class="r">24h</th><th class="r hide-m">Liquidity</th><th class="r hide-m">Vol 24h</th><th class="r hide-m">Mkt cap</th><th class="r hide-m">Age</th><th class="r hide-m">Buys/Sells</th><th>Risk</th><th></th></tr></thead><tbody>${a.map((r,i)=>`<tr class="mk-row" data-k="${esc(memeKey(r))}"><td class="mut">${i+1}</td><td>${avatar(r.symbol)} <b>${esc(r.symbol||'?')}</b> <span class="mut">${esc((r.name||'').slice(0,22))}</span> <span class="pill">${esc((MCH.find(c=>c[0]===r.chain)||[0,r.chain])[1])}</span></td><td class="num r">${tinyPx(r.price)}</td><td class="num r">${pc(r.m5)}</td><td class="num r">${pc(r.h1)}</td><td class="num r">${pc(r.h24)}</td><td class="num r hide-m">${cu(r.liq)}</td><td class="num r hide-m">${cu(r.vol24)}</td><td class="num r hide-m">${cu(r.mcap)}</td><td class="num r hide-m">${ageOf(r.created)}</td><td class="num r hide-m">${r.buys??'—'}/${r.sells??'—'}</td><td>${riskBadge(r)}</td><td class="r"><button class="star ${w.includes(memeKey(r))?'on':''}" data-w="${esc(memeKey(r))}" aria-label="Toggle watchlist">★</button></td></tr>`).join('')}</tbody></table>`:empty(st.tab==='watch'?'Your watchlist is empty':'No tokens found',st.tab==='watch'?'Tap the star on any token to follow it.':'Try another chain or tab.')};
  const load=async(quiet)=>{const my=++st.seq;if(!quiet&&!st.rows.length)$('#mbody').innerHTML=skeleton(5);
    try{let rows=[];
      if(st.q){rows=(await fnGet('meme-data',{a:'search',q:st.q,chain:st.chain})).rows||[]}
      else if(st.tab==='trending'||st.tab==='new'){rows=(await fnGet('meme-data',{a:st.tab,chain:st.chain})).rows||[]}
      else if(st.tab==='hot'){rows=(await fnGet('meme-data',{a:'hot',chain:st.chain})).rows||[]}
      else if(st.tab==='gain'||st.tab==='lose'){const[t,h]=await Promise.all([fnGet('meme-data',{a:'trending',chain:st.chain}).catch(()=>({rows:[]})),fnGet('meme-data',{a:'hot',chain:st.chain}).catch(()=>({rows:[]}))]);const m=new Map();[...t.rows,...h.rows].forEach(r=>m.set(memeKey(r),r));rows=[...m.values()]}
      else if(st.tab==='watch'){const w=memeWatch();rows=(await Promise.all(w.slice(0,20).map(x=>fnGet('meme-data',{a:'token',chain:x.chain,addr:x.address}).then(j=>(j.rows||[])[0]).catch(()=>null)))).filter(Boolean)}
      if(my!==st.seq)return;st.rows=rows;st.ts=Date.now();st.err=''}
    catch(e){if(my!==st.seq)return;st.err=e.status===404?'The meme-data function is not deployed on this Supabase project yet (see README, "Memecoins").':e.status===401?'Please sign in again.':e.message||'Could not load tokens.';if(quiet)return}
    if($('#mbody'))paint()};
  const go=()=>{st.rows=[];paint();load()};
  $('#mtabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;st.tab=t;st.q='';$('#mq2').value='';LS.set('novatrade.mtab',t);go()};
  $('#mchains').onclick=e=>{const c=e.target.dataset.c;if(!c)return;st.chain=c;LS.set('novatrade.mchain',c);go()};
  $('#mrf').onclick=()=>load();
  let to;$('#mq2').oninput=e=>{clearTimeout(to);const q=e.target.value.trim();to=setTimeout(()=>{st.q=q.length>=2?q:'';go()},500)};
  $('#mbody').onclick=e=>{const w=e.target.closest('[data-w]');if(w){e.stopPropagation();const k=w.dataset.w,list=memeWatch(),i=list.findIndex(x=>memeKey(x)===k);if(i>=0)list.splice(i,1);else{const r=st.rows.find(x=>memeKey(x)===k);if(r)list.push({chain:r.chain,address:r.address,symbol:r.symbol})}LS.set('novatrade.memewatch',list.slice(0,40));if(st.tab==='watch'){st.rows=st.rows.filter(x=>memeWatch().some(y=>memeKey(y)===memeKey(x)))}paint();return}
    const row=e.target.closest('[data-k]');if(!row)return;const r=st.rows.find(x=>memeKey(x)===row.dataset.k);if(!r)return;
    const flags=memeRisk(r);
    modal({title:`${esc(r.symbol||'?')} · ${esc(r.name||'')}`,body:`<div class="row" style="gap:10px;align-items:baseline"><div style="font-size:26px;font-weight:800" class="num">${tinyPx(r.price)}</div>${pc(r.h24)} <span class="mut">24h</span></div>
      ${kv([['Network',esc((MCH.find(c=>c[0]===r.chain)||[0,r.chain])[1])],['Change 5m / 1h / 6h',`${pc(r.m5)} · ${pc(r.h1)} · ${pc(r.h6)}`],['Liquidity',cu(r.liq)],['Volume 24h',cu(r.vol24)],['Market cap / FDV',cu(r.mcap)],['Buys / sells 24h',`${r.buys??'—'} / ${r.sells??'—'}`],['Pool age',ageOf(r.created)],['Exchange',esc(r.dex||'—')]])}
      <div class="f" style="margin-top:10px"><label>Token contract</label><div class="row nw"><input readonly value="${esc(r.address)}" aria-label="Token contract"><button class="btn" id="mcp">${ic('copy')}Copy</button></div></div>
      ${flags.length?`<div class="banner bad" style="margin:10px 0"><b>Risk flags:</b> ${flags.map(esc).join(' · ')}</div>`:'<div class="banner" style="margin:10px 0">No simple red flags in the public numbers. That does not make it safe: check the contract, holders and liquidity lock yourself.</div>'}
      <div class="row" style="gap:6px;flex-wrap:wrap">${memeLinks(r)}</div><div class="mut" style="font-size:12px;margin-top:8px">Links open third-party sites in a new tab. You trade there with your own wallet; NovaTrade never holds or moves on-chain tokens.</div>`,actions:[{label:'Close'}]});
    setTimeout(()=>{const b=$('#mcp');if(b)b.onclick=()=>{navigator.clipboard?.writeText(r.address);toast('Contract copied')}},0)};
  paint();load();const iv=setInterval(()=>{if(!$('#mbody')){clearInterval(iv);return}if(!st.q&&!document.hidden)load(true)},30000);onLeave(()=>clearInterval(iv));
});

/* ---- 37-stocks.js ---- */
/* ============ Stocks: server prices for in-app stocks + Finnhub / Alpha Vantage reference data through the stocks-data function ============ */
const usMarket=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  const m=(+p.hour%24)*60+ +p.minute,wk=!['Sat','Sun'].includes(p.weekday);return{open:wk&&m>=570&&m<960,label:wk?(m<570?'Opens 9:30 ET':m<960?'Open until 16:00 ET':'Closed · opens next trading day'):'Closed · weekend'}};
const STK_RANGES=[['1D','1D'],['1W','1W'],['1M','1M'],['1Y','1Y']];
pages.stocks=(v,rest)=>guard(v,async()=>{
  const st={tab:LS.get('novatrade.stab','watch'),sel:(rest[0]||'AAPL').toUpperCase(),range:'1M',ref:{},cfg:null,movers:null,news:null,err:''};
  const inApp=()=>Object.values(Market.tickers).filter(t=>(t.kind||Market.kind(t.base))==='stock');
  const mk=usMarket(),TABS=[['watch','Watchlist'],['gain','Top gainers'],['lose','Top losers'],['active','Most active'],['news','News']];
  v.innerHTML=head('Stocks','US equities · prices from your server feed (tradable) and Finnhub / Alpha Vantage (reference)',`<span class="pill"><span class="dot ${mk.open?'':'off'}"></span>US market ${mk.open?'open':'closed'} · ${esc(mk.label)}</span>`)+`<div id="nt">${notice()}</div><div id="skey"></div>
  <div class="grid stk" style="margin-top:12px"><div class="card"><div class="mk-tabs" id="stabs">${TABS.map(t=>`<button class="btn sm" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="row" style="margin:10px 0;gap:8px"><input id="sq2" placeholder="Search any US stock (e.g. Apple, NVDA)…" style="max-width:320px" aria-label="Search stocks"><span class="mut" id="smeta" style="font-size:12px"></span></div><div id="sres" class="tw"></div><div id="sbody" class="tw">${skeleton(5)}</div></div>
    <div class="card" id="sdet">${skeleton(4)}</div></div>`;
  const pos=(sym)=>Market.tickers[sym+'/USDT'];
  const price=(sym)=>pos(sym)?.price??st.ref[sym]?.price;
  const row=(sym,name,px,chg,vol,tradable)=>`<tr class="mk-row ${sym===st.sel?'sel':''}" data-s="${esc(sym)}"><td><b>${esc(sym)}</b> <span class="mut">${esc((name||'').slice(0,26))}</span></td><td class="num r">${px==null?'—':'$'+fmtPrice(px)}</td><td class="num r">${chg==null||!isFinite(chg)?'—':pc(chg)}</td><td class="num r hide-m">${vol?cu(vol).replace('$',''):'—'}</td><td class="r">${tradable?`<a class="btn sm pri" href="#/exchange/${sym}-USDT">Trade</a>`:'<span class="mut" style="font-size:11px">reference</span>'}</td></tr>`;
  const table=rows=>rows.length?`<table><thead><tr><th>Symbol</th><th class="r">Price</th><th class="r">24h</th><th class="r hide-m">Volume</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table>`:empty('Nothing to show yet');
  const paintBody=()=>{$$('#stabs button').forEach(b=>b.classList.toggle('pri',b.dataset.t===st.tab));const b=$('#sbody');if(!b)return;
    if(st.tab==='watch'){const a=inApp();b.innerHTML=table(a.map(t=>row(t.base,Market.names[t.base],t.price,t.change24h,t.volume*t.price,true)))+(mk.open?'':'<div class="mut" style="font-size:12px;margin-top:8px">The US market is closed: quotes are the last close and stock orders are refused until it opens.</div>');return}
    if(st.tab==='news'){const n=st.news;b.innerHTML=n==null?skeleton(4):n.err?`<div class="banner warn">${esc(n.err)}</div>`:n.length?n.map(x=>`<div class="kv" style="display:block;padding:8px 0"><a href="${esc(/^https:\/\//.test(x.url)?x.url:'#')}" target="_blank" rel="noopener noreferrer"><b>${esc(x.title)}</b></a><div class="mut" style="font-size:12px">${esc(x.source||'')} · ${ageOf(x.ts)} ago</div></div>`).join(''):empty('No news right now');return}
    const m=st.movers;if(!m){b.innerHTML=skeleton(4);return}if(m.err){b.innerHTML=`<div class="banner warn">${esc(m.err)}</div>`;return}
    const a=st.tab==='gain'?m.gainers:st.tab==='lose'?m.losers:m.active;b.innerHTML=table((a||[]).map(x=>row(x.symbol,'',x.price,x.changePct,x.volume,!!pos(x.symbol)))) + `<div class="mut" style="font-size:12px;margin-top:8px">Alpha Vantage · ${esc(m.updated||'')} · reference data, often includes illiquid penny stocks.</div>`};
  const loadMovers=async()=>{if(st.movers)return;try{st.movers=await fnGet('stocks-data',{a:'movers'})}catch(e){st.movers={err:fnErr(e)}}paintBody()};
  const loadNews=async()=>{if(st.news)return;try{st.news=(await fnGet('stocks-data',{a:'news'})).news||[]}catch(e){st.news=Object.assign([],{err:fnErr(e)})}paintBody()};
  const fnErr=e=>e.status===404?'The stocks-data function is not deployed yet (see README, "Stocks").':e.status===503?'Stock data keys are not set yet. Add FINNHUB_API_KEY and/or ALPHAVANTAGE_API_KEY as Edge Function secrets (see README, "Stocks").':e.status===429?'The data provider rate limit was reached. Free plans allow few calls; try again in a minute.':e.message||'Could not load data.';
  /* detail panel */
  const detail=async()=>{const sym=st.sel,box=$('#sdet');if(!box)return;const t=pos(sym);
    box.innerHTML=`<h3>${esc(sym)} <span class="mut" style="font-weight:400" id="sname">${esc(Market.names[sym]||'')}</span></h3><div class="row" style="gap:10px;align-items:baseline"><div class="num" style="font-size:26px;font-weight:800" id="spx">${t?'$'+fmtPrice(t.price):'—'}</div><span id="schg">${t?pc(t.change24h):''}</span></div>
      <div class="mk-tabs" id="sr" style="margin:8px 0">${STK_RANGES.map(r=>`<button class="btn sm ${r[0]===st.range?'pri':''}" data-r="${r[0]}">${r[1]}</button>`).join('')}</div><div id="sch" style="min-height:200px">${skeleton(3)}</div><div id="sinfo"></div>
      <div class="row" style="margin-top:10px;gap:8px">${t?`<a class="btn pri" href="#/exchange/${sym}-USDT">Open trading terminal</a>`:'<span class="mut" style="font-size:12px">Not listed for trading on NovaTrade; reference data only.</span>'}</div>`;
    const my=sym;
    fnGet('stocks-data',{a:'quotes',s:sym}).then(j=>{const q=(j.quotes||[])[0];if(my!==st.sel||!q||q.price==null)return;st.ref[sym]=q;if(!t&&$('#spx')){$('#spx').textContent='$'+fmtPrice(q.price);$('#schg').innerHTML=pc(q.changePct)}}).catch(()=>{});
    fnGet('stocks-data',{a:'profile',s:sym}).then(p=>{if(my!==st.sel||!$('#sinfo'))return;if(p.name&&$('#sname'))$('#sname').textContent=p.name;
      $('#sinfo').innerHTML=kv([['Industry',esc(p.industry||'—')],['Exchange',esc(p.exchange||'—')],['Market cap',p.marketCapUsd?cu(p.marketCapUsd):'—'],['P/E',p.pe?nf(p.pe,1):'—'],['52-week range',p.low52&&p.high52?`$${nf(p.low52,2)} – $${nf(p.high52,2)}`:'—'],['Beta',p.beta?nf(p.beta,2):'—']])+(p.about?`<p class="mut" style="font-size:12px">${esc(p.about.slice(0,380))}…</p>`:'')}).catch(()=>{});
    try{const j=await fnGet('stocks-data',{a:'candles',s:sym,r:st.range});if(my!==st.sel||!$('#sch'))return;const c=j.candles||[];
      $('#sch').innerHTML=c.length?chartSvg(c.map(x=>new Date(x.t).toISOString().slice(0,10)),[{n:'Close',v:c.map(x=>x.c),c:c[c.length-1].c>=c[0].c?'#26d07c':'#ff3d3d'}],{h:210,label:sym+' price'})+`<div class="mut" style="font-size:11px">Source: ${esc(j.source)} · ${c.length} points · reference chart; use the terminal for full tools.</div>`:empty('No history returned')}
    catch(e){if($('#sch'))$('#sch').innerHTML=`<div class="banner warn">${esc(fnErr(e))}</div>`+(t?`<div style="margin-top:8px"><a class="btn" href="#/exchange/${sym}-USDT">Use the trading terminal chart instead</a></div>`:'')}};
  /* key / function status */
  fnGet('stocks-data',{a:'status'}).then(s=>{st.cfg=s;const el=$('#skey');if(!el)return;if(!s.finnhub&&!s.alphavantage)el.innerHTML=`<div class="banner warn"><b>No stock data keys are set.</b> Add <code>FINNHUB_API_KEY</code> and/or <code>ALPHAVANTAGE_API_KEY</code> in Supabase → Edge Functions → Secrets. Until then only the built-in delayed feed is used.</div>`;else if(!s.finnhub||!s.alphavantage)el.innerHTML=`<div class="banner">Connected: ${s.finnhub?'Finnhub':''}${s.finnhub&&s.alphavantage?' + ':''}${s.alphavantage?'Alpha Vantage':''}. ${!s.finnhub?'Add FINNHUB_API_KEY for live quotes and company news.':'Add ALPHAVANTAGE_API_KEY for top gainers/losers and daily history.'}</div>`}).catch(e=>{const el=$('#skey');if(el)el.innerHTML=`<div class="banner warn">${esc(fnErr(e))} The built-in stock prices below still work.</div>`});
  paintBody();detail();onLeave(Market.sub(()=>{if($('#sbody')&&st.tab==='watch')paintBody()}));
  $('#stabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;st.tab=t;LS.set('novatrade.stab',t);paintBody();if(t==='news')loadNews();if(t==='gain'||t==='lose'||t==='active')loadMovers()};
  if(st.tab==='news')loadNews();if(['gain','lose','active'].includes(st.tab))loadMovers();
  v.onclick=e=>{const r=e.target.closest('[data-s]');if(r&&!e.target.closest('a')){st.sel=r.dataset.s;$$('#sbody .mk-row,#sres .mk-row').forEach(x=>x.classList.toggle('sel',x.dataset.s===st.sel));detail();return}const g=e.target.closest('[data-r]');if(g){st.range=g.dataset.r;detail()}};
  let to;$('#sq2').oninput=e=>{clearTimeout(to);const q=e.target.value.trim();if(q.length<1){$('#sres').innerHTML='';return}to=setTimeout(async()=>{try{const j=await fnGet('stocks-data',{a:'search',q});$('#sres').innerHTML=j.results.length?table(j.results.map(x=>row(x.symbol,x.name,price(x.symbol),null,0,!!pos(x.symbol)))):'<div class="mut">No matches.</div>'}catch(er){$('#sres').innerHTML=`<div class="banner warn">${esc(fnErr(er))}</div>`}},450)};
});

/* ---- 40-pages-a.js ---- */
/* ============ shared data helpers (everything comes from Supabase; nothing is simulated) ============ */
const D={
  async balances(){const r=await sel('balances','select=coin,total,locked&order=coin');return r.map(b=>{const t=num(b.total),l=num(b.locked);return{coin:b.coin,total:t,locked:l,available:t-l,usd:t*Market.price(b.coin)}})},
  _net:null,async networks(){return this._net||(this._net=await sel('networks','select=*&order=coin,code'))},
  summary(bal){let total=0,avail=0,pnl=0;bal.forEach(b=>{total+=b.usd;avail+=b.available*Market.price(b.coin);const ch=Market.tickers[symOf(b.coin)]?.change24h||0;pnl+=b.usd-b.usd/(1+ch/100)});return{total,avail,pnl,pnlPct:total-pnl>0?pnl/(total-pnl)*100:0}},
};
const avOf=(bal,c)=>bal.find(b=>b.coin===c)?.available||0;
const spark={};async function loadSpark(sym){if(spark[sym]!==undefined)return spark[sym];try{const k=await Market.klines(sym,'1h',24);spark[sym]=k.map(x=>x.c)}catch{spark[sym]=null}return spark[sym]}
let qrP=null;const loadQR=()=>qrP||(qrP=new Promise(res=>{const s=document.createElement('script');s.src='vendor/qr.js';s.onload=()=>res(window.qrcode);s.onerror=()=>res(null);document.head.append(s)}));
const actIcon={deposit:'down',withdrawal:'up',conversion:'swap',order:'trade',trade:'trade',bot:'ai',rental:'bot',fee:'list',adjustment:'gear'};
const actRow=a=>`<div class="item"><div class="ic">${ic(actIcon[a.type]||'list')}</div><div class="grow"><b style="text-transform:capitalize">${esc(a.type)}</b> <span class="mut">${esc(a.coin)}</span><div class="mut" style="font-size:12px">${esc(a.detail||'')}</div></div><div class="r"><div class="num">${fmtAmt(num(a.amount),a.coin)}</div><div>${badge(a.status)}</div><div class="mut" style="font-size:11px">${dt(a.created_at)}</div></div></div>`;

/* ============ dashboard ============ */
pages.dashboard=v=>guard(v,async()=>{
  const dcat=LS.get('novatrade.dcat','crypto');
  const[bal,act,ag,trades,rent,deps,wds]=await Promise.all([D.balances(),sel('activity','select=*&order=created_at.desc&limit=5'),sel('agents','select=status,name,strategy,mode&kind=eq.own'),sel('agent_trades','select=pnl&order=created_at.desc&limit=1000'),
    sel('rentals','select=id&status=eq.active'),sel('deposits','select=coin,amount&status=eq.completed'),sel('withdrawals','select=coin,amount&status=eq.completed')]);
  const S=D.summary(bal),profit=trades.reduce((a,t)=>a+num(t.pnl),0),running=(ag[0]?.status==='running'?1:0)+rent.length,sum=(a)=>a.reduce((s,x)=>s+num(x.amount)*Market.price(x.coin),0);
  v.innerHTML=head(`Welcome back, ${esc(displayName())}!`,'Your journey to financial freedom continues.')+`<div id="nt">${notice()}</div><div class="dash"><div class="col">
  <div class="card ap"><div class="row nw" style="gap:14px;align-items:center"><div class="apo ${ag[0]?.status==='running'?'on':''}">${ic('ai')}</div><div class="grow"><h3 style="margin:0">AI Autopilot ${ag[0]?badge(ag[0].status):badge('not set up')}${Demo.on?' <span class="badge info">demo money</span>':''}</h3><div class="mut" style="font-size:12.5px">${ag[0]?`${esc(ag[0].name)} · ${esc(STRAT[ag[0].strategy]||ag[0].strategy)} · watching ${Object.keys(Market.tickers).length} markets`:'Set up a rule-based bot with hard risk limits. It trades your platform balance at server prices.'}</div></div><a class="btn pri" href="#/ai">${ag[0]?'Manage':'Set up'}</a></div></div>
  <div class="grid g4">${[['wallet','Total balance',usd(S.total),`Available ${usd(S.avail)}`,''],['chart',"Today's P/L (24h price)",`<span class="${cl(S.pnl)}">${usd(S.pnl)}</span>`,`<span class="${cl(S.pnl)}">${arrow(S.pnl)} ${pct(S.pnlPct)}</span> on current holdings`,''],['bot','Active bots',running,`${rent.length} rented · AI agent ${esc(ag[0]?.status||'not set up')}`,''],['ai','Total bot profit',`<span class="${cl(profit)}">${usd(profit)}</span>`,'Realized, after fees','']].map(x=>`<div class="card stat"><div class="ico">${ic(x[0])}</div><div><div class="l">${x[1]}</div><div class="v num">${x[2]}</div><div class="s">${x[3]}</div></div></div>`).join('')}</div>
  <div class="tiles">${[['Deposit','down','#/wallet?t=deposit',''],['Withdraw','up','#/wallet?t=withdraw',''],['Buy','buy','#/exchange','b'],['Sell','sell','#/exchange','s'],['Swap','swap','#/swap',''],['Rent a Bot','bot','#/bots','']].map(t=>`<a class="tile ${t[3]}" href="${t[2]}"><i>${ic(t[1])}</i>${t[0]}</a>`).join('')}</div>
  <div class="card" style="padding:0"><div class="gl" id="hero" style="height:290px"><div class="cap">BTC/USDT · 3D market · reference data</div></div></div>
  <div class="card"><h3>Market overview <a class="btn sm" href="#/markets">All markets</a></h3><div class="mk-tabs" id="dmt" style="margin-bottom:8px">${[['fav','★ Favorites'],['crypto','Crypto'],['meme','Memes'],['stock','Stocks'],['commodity','Commodities']].map(c=>`<button class="btn sm ${c[0]===dcat?'pri':''}" data-dc="${c[0]}">${c[1]}</button>`).join('')}</div><div class="tw"><table><thead><tr><th>#</th><th>Coin</th><th class="r">Price</th><th class="r">24h</th><th class="r hide-m">Market cap</th><th class="hide-m">Last 24h</th></tr></thead><tbody id="mk"></tbody></table></div></div></div>
  <div class="col"><div class="card"><h3>Live AI activity <a class="btn sm" href="#/ai">Journal</a></h3><div id="liveai"><div class="mut" style="font-size:12px">Loading…</div></div></div><div class="card"><h3>Portfolio overview</h3><div class="gl" id="ring" style="height:220px"></div><div class="lg" id="lg" style="margin-top:10px"></div></div>
  <div class="card"><h3>Deposits / withdrawals</h3>${kv([['Deposited (completed)',`<span class="up">${usd(sum(deps))}</span>`],['Withdrawn (completed)',`<span class="down">${usd(sum(wds))}</span>`]])}<div class="mut" style="font-size:11px;margin-top:6px">Valued at current prices.</div></div>
  <div class="card"><h3>Watchlist</h3><div id="wl"></div></div>
  <div class="card"><h3>Recent activity <a class="btn sm" href="#/activity">All</a></h3>${act.length?act.map(actRow).join(''):empty('No activity yet','Deposits, trades and bot actions will appear here.')}</div></div></div>`;
  if(!bal.length)$('#nt').insertAdjacentHTML('beforeend',`<div class="banner"><b>Your wallet is empty.</b> <a href="#/wallet?t=deposit">Make a deposit</a> to start trading.</div>`);
  sceneCandles($('#hero'),()=>Market.cache['BTC/USDT|1h']);Market.klines('BTC/USDT','1h').catch(()=>{const h=$('#hero');if(h)h.classList.add('nogl')});
  const items=bal.filter(b=>b.usd>0).sort((a,b)=>b.usd-a.usd);let cur=items;sceneRing($('#ring'),()=>cur.map(i=>({v:i.usd})));
  const tot=items.reduce((a,i)=>a+i.usd,0);$('#lg').innerHTML=items.length?items.map((i,n)=>`<div><span><i style="background:${palCss[n%8]}"></i>${i.coin}</span><span class="num">${nf(i.usd/tot*100,1)}% · ${usd(i.usd)}</span></div>`).join(''):'<div class="mut">Nothing to show yet.</div>';
  const paint=()=>{const f=favs(),t=Object.values(Market.tickers).filter(x=>inCat(x,dcat,f)).sort((a,b)=>(b.marketCap||0)-(a.marketCap||0)||b.volume*b.price-a.volume*a.price);
    $('#mk').innerHTML=t.length?t.slice(0,8).map((x,i)=>`<tr class="click" data-s="${x.symbol}"><td>${i+1}</td><td>${coinIcon(x.base)}${esc(x.name)} <span class="mut">${x.base}</span></td><td class="num r">${fmtPrice(x.price)}</td><td class="num r ${cl(x.change24h)}">${arrow(x.change24h)} ${pct(x.change24h)}</td><td class="num r hide-m">${x.marketCap?'$'+nf(x.marketCap/1e9,1)+'B':'—'}</td><td class="hide-m"><canvas class="spark" data-sp="${x.symbol}"></canvas></td></tr>`).join(''):`<tr><td colspan="6">${empty('Market data unavailable','Prices could not be loaded.')}</td></tr>`;
    $$('canvas[data-sp]').forEach(async c=>{const s=await loadSpark(c.dataset.sp);if(s&&c.isConnected)sparkline(c,s,s[s.length-1]>=s[0]?CC.up:CC.down)});
    $('#wl').innerHTML=f.map(s=>Market.tickers[s]).filter(Boolean).map(x=>`<div class="kv" style="cursor:pointer" data-s="${x.symbol}"><span><button class="star on" data-f="${x.symbol}" aria-label="Remove ${x.symbol} from watchlist">★</button>${x.symbol}</span><span class="num">${fmtPrice(x.price)} <span class="${cl(x.change24h)}">${pct(x.change24h)}</span></span></div>`).join('')||'<div class="mut">Star a pair on the Trade page to watch it here.</div>'};
  sel('agent_log','select=ts,event,symbol,message&order=ts.desc&limit=6').then(r=>{const el=$('#liveai');if(el)el.innerHTML=r.length?r.map(x=>{const m=JEV[x.event]||['info',x.event];return`<div class="jr" style="grid-template-columns:54px 70px 1fr"><span class="mut num">${new Date(x.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><span class="badge ${m[0]==='up'?'active':m[0]==='down'?'failed':m[0]}">${esc(m[1])}</span><span>${esc(x.symbol||'')} ${esc((x.message||'').slice(0,70))}</span></div>`}).join(''):'<div class="mut" style="font-size:12px">No bot steps yet. Start the AI agent or rent a bot and every step is written here.</div>'}).catch(()=>{const el=$('#liveai');if(el)el.innerHTML='<div class="mut" style="font-size:12px">Bot journal is not installed yet (migration 004).</div>'});
  paint();onLeave(Market.sub(()=>{if($('#mk'))paint()}));
  $('#dmt').onclick=e=>{const c=e.target.dataset.dc;if(!c)return;LS.set('novatrade.dcat',c);pages.dashboard(v)};
  v.onclick=e=>{const s=e.target.closest('[data-f]');if(s){e.stopPropagation();toggleFav(s.dataset.f);paint();return}const r=e.target.closest('[data-s]');if(r)location.hash='#/exchange/'+r.dataset.s.replace('/','-')};
  onData(['balances','activity','agent_trades','agents','rentals'],()=>pages.dashboard(v));
});

/* ============ exchange ============ */
pages.exchange=(v,rest)=>guard(v,async()=>{
  let sym=(rest[0]||LS.get('novatrade.pair','BTC/USDT')).replace('-','/');if(!Market.tickers[sym])sym=Object.keys(Market.tickers)[0];if(!sym)throw new Error('Market data is unavailable right now. Please retry shortly.');LS.set('novatrade.pair',sym);
  const st={tf:LS.get('novatrade.tf','1h'),side:'buy',type:'limit',bal:await D.balances(),tab:'open',list:'fav'};
  const base=()=>sym.split('/')[0],T=()=>Market.tickers[sym],avail=c=>avOf(st.bal,c),FEE=()=>Settings.spot_fee_rate;
  v.innerHTML=head('Trade',`Spot trading · fills at the platform's server price`)+`<div id="nt">${notice()}</div><div class="trade">
  <div class="card pl" style="padding:12px"><div class="seg" style="width:100%;display:flex"><button data-l="fav" class="on" style="flex:1">Favorites</button><button data-l="all" style="flex:1">All</button></div><div id="pls" style="margin-top:8px;max-height:560px;overflow:auto"></div></div>
  <div class="col ch" style="min-width:0"><div class="card"><div class="row" id="hd"></div><div class="row" style="margin:10px 0"><div class="seg" id="tfs">${Object.keys(TF).map(t=>`<button data-t="${t}" class="${t===st.tf?'on':''}">${t}</button>`).join('')}</div><span class="mut" style="font-size:11px">Chart: public reference candles</span></div><div id="ch" class="pcbox"></div></div>
  <div class="card"><div class="tabs" id="tabs">${[['open','Open orders'],['hist','Order history'],['fills','Trade history'],['alerts','Price alerts'],['stats','Market stats']].map(t=>`<button data-k="${t[0]}" class="${t[0]===st.tab?'on':''}">${t[1]}</button>`).join('')}</div><div id="tb" class="tw"></div></div></div>
  <div class="col"><div class="card" style="padding:12px"><h3>Order book <span class="badge info">reference</span></h3><table class="ob" id="bk"></table></div><div class="card" style="padding:12px"><h3>Recent trades <span class="badge info">reference</span></h3><table class="ob" id="rt"></table></div></div>
  <div class="card"><div class="seg buy" id="sd" style="width:100%;display:flex"><button data-s="buy" class="on" style="flex:1">Buy</button><button data-s="sell" style="flex:1">Sell</button></div>
   <div class="seg" id="ty" style="margin:10px 0"><button data-ty="limit" class="on">Limit</button><button data-ty="market">Market</button></div>
   <form id="of" novalidate><div class="f" id="pf"><label for="pr">Price (USDT)</label><input id="pr" inputmode="decimal"></div><div class="f"><label for="am">Amount (<span id="bc"></span>)</label><input id="am" inputmode="decimal" placeholder="0.00"><div class="err" id="ea"></div></div>
   <div class="row nw" style="gap:6px;margin-bottom:12px" id="pcs">${[25,50,75,100].map(p=>`<button type="button" class="btn sm ghost" data-p="${p}" style="flex:1">${p}%</button>`).join('')}</div><div id="sm" style="margin-bottom:12px"></div><button class="btn buy blk" id="go">Review buy order</button></form></div></div>`;
  const ch=new ProChart($('#ch'),{tf:st.tf});ch.loadDr(sym);onLeave(()=>ch.destroy());
  async function loadChart(){try{ch.o.tf=st.tf;ch.set(await Market.klines(sym,st.tf));$('#cerr')&&$('#cerr').remove()}catch(e){let m=$('#cerr');if(!m){m=document.createElement('div');m.id='cerr';ch.box.before(m)}m.innerHTML=errBox(e.message);$('#cerr [data-act=retry]').onclick=()=>{m.remove();loadChart()}}}loadChart();
  const pairList=()=>{const f=favs(),all=Object.values(Market.tickers),l=st.list==='fav'?all.filter(t=>f.includes(t.symbol)):all;$('#pls').innerHTML=l.length?l.map(t=>`<div class="kv click" style="cursor:pointer;${t.symbol===sym?'background:#ffffff08;':''}" data-s="${t.symbol}"><span><button class="star ${f.includes(t.symbol)?'on':''}" data-f="${t.symbol}" aria-label="Toggle favorite">★</button>${t.base}</span><span class="num">${fmtPrice(t.price)}<br><span class="${cl(t.change24h)}" style="font-size:11px">${pct(t.change24h)}</span></span></div>`).join(''):'<div class="mut" style="padding:8px">No favorites yet. Star a pair.</div>'};pairList();
  $('.pl .seg').onclick=e=>{const l=e.target.dataset.l;if(!l)return;st.list=l;$$('.pl .seg button').forEach(b=>b.classList.toggle('on',b.dataset.l===l));pairList()};
  $('#pls').onclick=e=>{const s=e.target.closest('[data-f]');if(s){toggleFav(s.dataset.f);pairList();header();return}const r=e.target.closest('[data-s]');if(r)location.hash='#/exchange/'+r.dataset.s.replace('/','-')};
  function header(){const t=T();$('#hd').innerHTML=`<button class="btn" id="pp">${coinIcon(base())}<b>${sym}</b></button><div class="num disp" style="font-size:23px;font-weight:700">${fmtPrice(t.price)}</div><span class="num ${cl(t.change24h)}">${arrow(t.change24h)} ${pct(t.change24h)}</span><span class="mut num hide-m">H ${fmtPrice(t.high)} · L ${fmtPrice(t.low)} · Vol ${nf(t.volume/1e6,1)}M</span><span class="badge ${t.src==='server'?'ok':'wait'}">${t.src==='server'?'tradable price':t.src==='closed'?'market closed':'reference only'}</span><span class="pill">${esc(KINDS[Market.kind(base())]||'Crypto')}</span><button class="star ${favs().includes(sym)?'on':''}" id="fv" aria-label="Toggle favorite">★</button>`;
    $('#fv').onclick=()=>{toggleFav(sym);header();pairList()};$('#pp').onclick=()=>pickCoin(sym,s=>{location.hash='#/exchange/'+s.replace('/','-')});$('#go').disabled=!Market.tradable(base())||Backend.missing}
  header();$('#bc').textContent=base();
  $('#tfs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;st.tf=t;LS.set('novatrade.tf',t);$$('#tfs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));loadChart()};
  const pr=$('#pr'),am=$('#am');pr.value=Number(T().price.toPrecision(6));const px=()=>st.type==='market'?T().price:+pr.value;
  function sum(){const p=px(),a=+am.value||0,tot=p*a,f=FEE(),av=st.side==='buy'?avail('USDT'):avail(base());
    $('#sm').innerHTML=kv([['Available',st.side==='buy'?nf(av,2)+' USDT':fmtAmt(av,base())+' '+base()],['Order value',nf(tot,2)+' USDT'],[`Est. fee (${nf(f*100,2)}%)`,nf(tot*f,4)+' USDT'],['Est. '+(st.side==='buy'?'cost':'proceeds'),nf(st.side==='buy'?tot*(1+f):tot*(1-f),2)+' USDT']])+(st.type==='market'?'<div class="mut" style="font-size:12px;margin-top:6px">Market orders fill at the server price at execution time.</div>':'')}sum();
  $('#sd').onclick=e=>{const s=e.target.dataset.s;if(!s)return;st.side=s;$('#sd').className='seg '+s;$$('#sd button').forEach(b=>b.classList.toggle('on',b.dataset.s===s));const g=$('#go');g.className='btn blk '+s;g.textContent=`Review ${s} order`;sum()};
  $('#ty').onclick=e=>{const t=e.target.dataset.ty;if(!t)return;st.type=t;$$('#ty button').forEach(b=>b.classList.toggle('on',b.dataset.ty===t));$('#pf').style.display=t==='market'?'none':'';sum()};
  $('#pcs').onclick=e=>{const p=+e.target.dataset.p;if(!p)return;const pp=px();if(!pp)return;const f=1+FEE();am.value=Number((st.side==='buy'?avail('USDT')*p/100/(pp*f):avail(base())*p/100).toFixed(6));sum()};pr.oninput=am.oninput=sum;
  $('#of').onsubmit=e=>{e.preventDefault();const a=+am.value,p=px(),ea=$('#ea'),f=FEE();ea.textContent='';
    if(!(a>0))return ea.textContent='Enter an amount greater than zero.';if(!(p>0))return ea.textContent='Enter a valid price.';if(p*a<Settings.min_order_usdt)return ea.textContent=`Minimum order value is ${Settings.min_order_usdt} USDT.`;
    if(st.side==='buy'&&p*a*(1+f)>avail('USDT'))return ea.textContent='Insufficient USDT balance.';if(st.side==='sell'&&a>avail(base()))return ea.textContent=`Insufficient ${base()} balance.`;
    const idem=uid('ord'),args={p_symbol:sym,p_side:st.side,p_type:st.type,p_amount:a,p_price:st.type==='limit'?p:null,p_idem:idem},side=st.side;
    modal({title:`Confirm ${side} order`,body:kv([['Pair',sym],['Side',side.toUpperCase()],['Type',st.type],['Price',st.type==='market'?'Market (≈ '+fmtPrice(p)+')':fmtPrice(p)],['Amount',a+' '+base()],['Est. value',nf(p*a,2)+' USDT'],['Est. fee',nf(p*a*f,4)+' USDT']])+`<div class="banner warn" style="margin:12px 0 0">The order is only complete once the server confirms it.</div>`,
      actions:[{label:'Cancel'},{label:'Confirm & submit',cls:side==='buy'?'buy':'sell',close:false,fn:async(close,btn)=>{btn.disabled=true;$('#mb').innerHTML='<div class="banner">⏳ Submitted — awaiting server confirmation…</div>';
        try{const o=await rpc('place_order',args);$('#mb').innerHTML=o.status==='filled'?`<div class="banner"><b class="up">Order filled</b> (confirmed by server)</div>${kv([['Order ID',`<span class="mono">${esc(o.id)}</span>`],['Filled price',fmtPrice(num(o.filled_price))],['Fee',nf(num(o.fee),4)+' USDT']])}`:o.status==='open'?`<div class="banner"><b>Order placed</b> and resting. It is <b>not</b> filled yet; funds are reserved.</div>${kv([['Order ID',`<span class="mono">${esc(o.id)}</span>`]])}`:`<div class="banner bad"><b>Order ${esc(o.status)}.</b></div>`;
          st.bal=await D.balances();sum();tab()}catch(er){$('#mb').innerHTML=`<div class="banner bad"><b>Order rejected.</b> ${esc(er.message)}</div>`}$('#ma').innerHTML='<button class="btn" id="cx">Close</button>';$('#cx').onclick=()=>modalClose()}}]})};
  async function tab(){const tb=$('#tb');if(!tb)return;tb.innerHTML=skeleton(3);try{
    if(['open','hist','fills'].includes(st.tab)){const q={open:'status=eq.open',hist:'status=neq.open',fills:'status=eq.filled'}[st.tab];const o=await sel('orders',`select=*&${q}&order=created_at.desc&limit=50`);
      tb.innerHTML=o.length?`<table><thead><tr><th>Time</th><th>Pair</th><th>Side</th><th>Type</th><th class="r">Price</th><th class="r">Amount</th><th class="r">Fee</th><th>Status</th><th></th></tr></thead><tbody>${o.map(x=>`<tr><td>${dt(x.created_at)}</td><td>${esc(x.symbol)}</td><td class="${x.side==='buy'?'up':'down'}">${x.side}</td><td>${x.type}</td><td class="num r">${fmtPrice(num(x.filled_price||x.price))}</td><td class="num r">${num(x.amount)}</td><td class="num r">${nf(num(x.fee),4)}</td><td>${badge(x.status)}</td><td>${x.status==='open'?`<button class="btn sm danger" data-c="${x.id}">Cancel</button>`:''}</td></tr>`).join('')}</tbody></table>`:empty('No orders here','Orders appear after the server confirms them.')}
    else if(st.tab==='alerts'){const a=await sel('price_alerts','select=*&order=created_at.desc');tb.innerHTML=`<form id="af2" class="row nw" style="margin-bottom:10px"><select id="ad" style="width:110px"><option value="above">Above</option><option value="below">Below</option></select><input id="ap" placeholder="Price (${sym})" inputmode="decimal" aria-label="Alert price"><button class="btn">Add alert</button></form>${a.length?`<table><tbody>${a.map(x=>`<tr><td>${esc(x.symbol)}</td><td>${x.dir} ${fmtPrice(num(x.price))}</td><td>${badge(x.active?'active':'completed')}</td><td><button class="btn sm danger" data-d="${x.id}">Delete</button></td></tr>`).join('')}</tbody></table>`:empty('No price alerts','You will be notified when a price is reached.')}`;
      $('#af2').onsubmit=async e=>{e.preventDefault();const p=+$('#ap').value;if(!(p>0))return toast('Enter a valid price','bad');try{await ins('price_alerts',{symbol:sym,dir:$('#ad').value,price:p});toast('Alert added');tab()}catch(er){toast(er.message,'bad')}}}
    else{const t=T();tb.innerHTML=`<div class="grid g3" style="gap:0 24px">${kv([['Asset',esc(t.name)],['Market cap',t.marketCap?'$'+nf(t.marketCap/1e9,1)+'B':'—'],['24h volume','$'+nf(t.volume/1e6,1)+'M']])}${kv([['24h high',fmtPrice(t.high)],['24h low',fmtPrice(t.low)],['24h change',`<span class="${cl(t.change24h)}">${pct(t.change24h)}</span>`]])}${kv([['Min order',Settings.min_order_usdt+' USDT'],['Fee',nf(FEE()*100,2)+'%'],['Price source',t.src==='server'?'Platform feed':'Reference only']])}</div>`}
  }catch(e){tb.innerHTML=errBox(e.message);$('[data-act=retry]',tb).onclick=tab}}
  $('#tabs').onclick=e=>{const k=e.target.dataset.k;if(!k)return;st.tab=k;$$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));tab()};
  $('#tb').onclick=async e=>{const c=e.target.dataset.c,d=e.target.dataset.d;try{if(c){await rpc('cancel_order',{p_id:c});toast('Order cancelled');st.bal=await D.balances();sum()}else if(d)await del('price_alerts','id=eq.'+enc(d));else return;tab()}catch(er){toast(er.message,'bad')}};tab();
  async function side(){try{const[b,t]=await Promise.all([Market.book(sym),Market.trades(sym)]);if(!$('#bk'))return;const mx=Math.max(...b.bids.map(x=>x.amount),...b.asks.map(x=>x.amount))||1;
    const row=(l,c)=>`<tr class="bar"><td class="num ${c}">${fmtPrice(l.price)}</td><td class="num r">${nf(l.amount,l.amount>100?0:4)}</td><td style="width:40%"><i style="background:var(--${c==='up'?'y':'r'});width:${l.amount/mx*100}%"></i></td></tr>`;
    $('#bk').innerHTML=[...b.asks].sort((a,b)=>b.price-a.price).slice(-9).map(l=>row(l,'down')).join('')+`<tr><td colspan="3" class="num disp" style="font-size:15px;font-weight:700;padding:6px 8px">${fmtPrice(T().price)}</td></tr>`+[...b.bids].sort((a,b)=>b.price-a.price).slice(0,9).map(l=>row(l,'up')).join('');
    $('#rt').innerHTML=t.slice(0,10).map(x=>`<tr><td class="num ${x.side==='buy'?'up':'down'}">${fmtPrice(x.price)}</td><td class="num r">${nf(x.amount,x.amount>100?0:4)}</td><td class="num r mut">${new Date(x.ts).toLocaleTimeString()}</td></tr>`).join('')}catch{if($('#bk'))$('#bk').innerHTML='<tr><td>'+empty('Depth unavailable')+'</td></tr>'}}
  side();const iv=setInterval(side,3500);onLeave(()=>clearInterval(iv));
  onLeave(Market.sub(()=>{if(!$('#hd'))return;header();ch.update()}));onData(['balances','orders'],async()=>{st.bal=await D.balances();sum();tab()});
});

/* ============ swap ============ */
pages.swap=v=>guard(v,async()=>{
  const coins=['USDT',...Market.coins];let bal=await D.balances();const st={q:null,timer:null,seq:0};const av=c=>avOf(bal,c);
  v.innerHTML=head('Swap','Convert one asset to another at a server-issued, time-limited quote')+`<div id="nt">${notice()}</div><div class="grid g2"><div class="col"><div class="card"><form id="sf" novalidate>
   <div class="f"><label for="fc">From</label><div class="row nw"><select id="fc" style="width:130px">${coins.map(c=>`<option>${c}</option>`).join('')}</select><input id="fa" inputmode="decimal" placeholder="0.00" aria-describedby="fh"></div><div class="mut" id="fh" style="font-size:12px;margin-top:4px"></div><div class="err" id="fe"></div></div>
   <div class="row" style="justify-content:center;margin:-4px 0 8px"><button type="button" class="btn sm" id="sw" aria-label="Reverse coins">${ic('swap')}</button></div>
   <div class="f"><label for="tc">To (estimated)</label><div class="row nw"><select id="tc" style="width:130px">${coins.map(c=>`<option>${c}</option>`).join('')}</select><input id="ta" readonly placeholder="0.00" aria-label="Estimated amount received"></div></div><div id="qs" style="min-height:120px"></div><button class="btn pri blk" id="qb" disabled>Preview conversion</button></form></div>
   <div class="card" style="padding:0"><div class="gl" id="sg" style="height:200px"></div></div></div>
  <div class="card"><h3>Recent swaps</h3><div id="sh" class="tw"></div></div></div>`;
  const fc=$('#fc'),tc=$('#tc'),fa=$('#fa');fc.value='USDT';tc.value=Market.coins.includes('BTC')?'BTC':coins[1];
  let gv=null;const lab=c=>({BTC:'₿',ETH:'Ξ',USDT:'₮',SOL:'◎',BNB:'B'}[c]||c.slice(0,3));const mkCoins=()=>{gv&&gv.destroy();gv=sceneCoins($('#sg'),{labels:[lab(fc.value),lab(tc.value)],layout:'pair',particles:40})};mkCoins();
  const hint=()=>{$('#fh').innerHTML=`Available: <b class="num">${fmtAmt(av(fc.value),fc.value)} ${fc.value}</b> · <a href="#" id="mx">Max</a>`;$('#mx').onclick=e=>{e.preventDefault();fa.value=av(fc.value);getQuote()}};hint();
  const histPaint=async()=>{try{const h=await sel('swaps','select=*&order=created_at.desc&limit=12');$('#sh').innerHTML=h.length?`<table><thead><tr><th>Time</th><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>${h.map(x=>`<tr><td>${dt(x.created_at)}</td><td class="num">${fmtAmt(num(x.amount),x.from_coin)} ${x.from_coin}</td><td class="num">${fmtAmt(num(x.receive),x.to_coin)} ${x.to_coin}</td><td>${badge(x.status)}</td></tr>`).join('')}</tbody></table>`:empty('No conversions yet')}catch(e){$('#sh').innerHTML=errBox(e.message)}};histPaint();
  $('#sw').onclick=()=>{[fc.value,tc.value]=[tc.value,fc.value];mkCoins();hint();getQuote()};
  async function getQuote(){clearInterval(st.timer);st.q=null;$('#qb').disabled=true;$('#fe').textContent='';const a=+fa.value;if(!(a>0)){$('#ta').value='';$('#qs').innerHTML='';return}
    if(fc.value===tc.value){$('#fe').textContent='Choose two different coins.';return}if(a>av(fc.value)){$('#fe').textContent='Amount exceeds your available balance.';return}
    const my=++st.seq;$('#qs').innerHTML='<div class="sk"></div><div class="sk"></div>';
    try{const q=await rpc('swap_quote',{p_from:fc.value,p_to:tc.value,p_amount:a});if(my!==st.seq)return;q.till=Date.now()+14500;st.q=q;$('#ta').value=nf(q.receive,6);$('#qb').disabled=false;
      const tick=()=>{const s=Math.max(0,Math.ceil((q.till-Date.now())/1000));if(!$('#qs'))return clearInterval(st.timer);$('#qs').innerHTML=kv([['Rate (estimate)',`1 ${q.from} ≈ ${fmtPrice(q.rate)} ${q.to}`],['Fee',`${nf(q.fee,6)} ${q.feeCoin} (${nf(Settings.swap_fee_rate*100,2)}%)`],['Slippage','None modeled — rejected if price moves >0.3%'],['Minimum',`≈ ${q.minUsd} USD`],['Quote expires',s?`<b>${s}s</b>`:'<span class="down">expired</span>']]);if(!s){clearInterval(st.timer);getQuote()}};tick();st.timer=setInterval(tick,1000)}
    catch(er){if(my===st.seq){$('#qs').innerHTML='';$('#fe').textContent=er.message}}}
  let dbn;fa.oninput=()=>{clearTimeout(dbn);dbn=setTimeout(getQuote,400)};fc.onchange=tc.onchange=()=>{mkCoins();hint();getQuote()};onLeave(()=>clearInterval(st.timer));
  $('#sf').onsubmit=e=>{e.preventDefault();const q=st.q;if(!q)return;const idem=uid('swp');
    modal({title:'Confirm conversion',body:kv([['You pay',`${q.amount} ${q.from}`],['You receive (est.)',`${nf(q.receive,6)} ${q.to}`],['Rate (est.)',fmtPrice(q.rate)],['Fee',`${nf(q.fee,6)} ${q.feeCoin}`]])+'<div class="banner warn" style="margin-top:12px">Estimated quote. If it expires or the price moves, the server will reject it and you can request a new one.</div>',
     actions:[{label:'Cancel'},{label:'Confirm conversion',cls:'pri',close:false,fn:async()=>{$('#mb').innerHTML='<div class="banner">⏳ Submitted — awaiting server confirmation…</div>';
       try{const s=await rpc('swap_execute',{p_quote:q.id,p_idem:idem});$('#mb').innerHTML=s.status==='completed'?`<div class="banner"><b class="up">Conversion completed</b> (confirmed by server)</div>${kv([['Paid',`${num(s.amount)} ${s.from_coin}`],['Received',`${nf(num(s.receive),6)} ${s.to_coin}`]])}`:`<div class="banner warn">Status: ${esc(s.status)}.</div>`;bal=await D.balances();histPaint();hint();fa.value='';$('#ta').value='';$('#qs').innerHTML='';st.q=null;$('#qb').disabled=true}
       catch(er){$('#mb').innerHTML=`<div class="banner bad"><b>Conversion failed.</b> ${esc(er.message)}</div>`;if(['quote_expired','price_moved'].includes(er.code))getQuote()}$('#ma').innerHTML='<button class="btn" id="cx">Close</button>';$('#cx').onclick=()=>modalClose()}}]})};
  onData(['balances','swaps'],async()=>{bal=await D.balances();hint();histPaint()});
});

/* ============ wallet ============ */
pages.wallet=(v,rest)=>guard(v,async()=>{
  const[bal0,nets]=await Promise.all([D.balances(),D.networks()]);let bal=bal0;const st={t:(location.hash.match(/t=(\w+)/)||[])[1]||'balances'};
  const coinsAll=[...new Set(nets.map(n=>n.coin))],netsOf=c=>nets.filter(n=>n.coin===c);const S=()=>D.summary(bal);
  v.innerHTML=head('Wallet','Balances, deposits and withdrawals')+`<div id="nt">${notice()}</div><div class="card" style="padding:0;margin-bottom:14px"><div class="row nw" style="padding:18px"><div class="grow"><div class="mut">Total balance</div><div class="disp num" style="font-size:34px;font-weight:800" id="tb">${usd(S().total)}</div><div class="${cl(S().pnl)}">${arrow(S().pnl)} ${pct(S().pnlPct)} <span class="mut">24h</span></div><div class="row" style="margin-top:12px"><button class="btn pri" data-go="deposit">Deposit</button><button class="btn" data-go="withdraw">Withdraw</button><a class="btn" href="#/swap">Swap</a></div></div><div class="gl hide-m" id="wg" style="width:260px;height:150px"></div></div></div>
  <div class="tabs" id="wt">${[['balances','Overview'],['deposit','Deposit'],['withdraw','Withdraw'],['history','History']].map(t=>`<button data-t="${t[0]}">${t[1]}</button>`).join('')}</div><div id="wb"></div>`;
  sceneCoins($('#wg'),{labels:['₿','$'],layout:'single',particles:25});
  const views={
   balances:wb=>{wb.innerHTML=`<div class="card tw">${bal.length?`<table><thead><tr><th>Asset</th><th class="r">Total</th><th class="r">Available</th><th class="r hide-m">In orders / locked</th><th class="r hide-m">Price</th><th class="r">USD value</th><th></th></tr></thead><tbody>${bal.map(b=>`<tr><td>${coinIcon(b.coin)}${b.coin}</td><td class="num r">${fmtAmt(b.total,b.coin)}</td><td class="num r">${fmtAmt(b.available,b.coin)}</td><td class="num r hide-m">${fmtAmt(b.locked,b.coin)}</td><td class="num r hide-m">${b.coin==='USDT'?'1.00':fmtPrice(Market.price(b.coin))}</td><td class="num r">${usd(b.usd)}</td><td>${b.coin!=='USDT'?`<a class="btn sm" href="#/exchange/${b.coin}-USDT">Trade</a>`:''}</td></tr>`).join('')}</tbody></table>`:empty('No assets yet','Deposit funds to see your balances here.')}</div>`},
   deposit:async wb=>{if(Demo.on){wb.innerHTML=demoBlock('Deposits');return}wb.innerHTML=`<div class="grid g2"><div class="card"><div class="f"><label for="dc">Coin</label><select id="dc">${coinsAll.map(c=>`<option>${c}</option>`).join('')}</select></div><div class="f"><label for="dn">Network</label><select id="dn"></select></div><div id="di"></div></div><div class="card"><h3>Deposit history</h3><div id="dh" class="tw"></div></div></div>`;
     const dc=$('#dc'),dn=$('#dn');dc.value='USDT';const fill=()=>{dn.innerHTML=netsOf(dc.value).filter(n=>n.deposit_enabled).map(n=>`<option value="${esc(n.code)}">${esc(n.name)}</option>`).join('');load()};
     const load=async()=>{const n=netsOf(dc.value).find(x=>x.code===dn.value);if(!n){$('#di').innerHTML='<div class="banner warn">Deposits are not available for this coin right now.</div>';return}$('#di').innerHTML=skeleton(3);
       try{const r=(await sel('deposit_addresses',`coin=eq.${enc(dc.value)}&network=eq.${enc(dn.value)}&select=address,memo`))[0];
         $('#di').innerHTML=`<div class="banner warn"><b>Only send ${esc(dc.value)} on ${esc(n.name)}.</b> Sending another asset or using a different network can result in permanent loss.</div>${kv([['Minimum deposit',num(n.min_deposit)+' '+dc.value],['Confirmations required',n.confirmations]])}`+
          (r?`<div class="f" style="margin-top:12px"><label>Deposit address</label><div class="row nw"><input readonly value="${esc(r.address)}" aria-label="Deposit address"><button class="btn" id="cp">${ic('copy')}Copy</button></div></div>${r.memo?`<div class="f"><label>Memo / tag (required)</label><input readonly value="${esc(r.memo)}"></div>`:''}<div id="qr"></div><label class="chk" style="margin-top:12px"><input type="checkbox" id="dk"> I confirm I am depositing ${esc(dc.value)} using the ${esc(n.name)} network.</label>`:`<div class="banner bad" style="margin-top:12px"><b>No deposit address has been issued to you for this network yet.</b> Addresses are provisioned by the platform's custody integration. Contact support to have one assigned; do not send funds until an address appears here.</div>`);
         if(r){$('#cp').onclick=()=>{navigator.clipboard?.writeText(r.address);toast('Address copied')};const q=await loadQR();if(q&&$('#qr')){try{const c=q(0,'M');c.addData(r.address);c.make();$('#qr').innerHTML=`<div style="background:#fff;padding:8px;border-radius:12px;display:inline-block;margin-top:10px" role="img" aria-label="Deposit address QR code">${c.createSvgTag({cellSize:4,margin:1,scalable:true}).replace('<svg','<svg width="168" height="168"')}</div>`}catch{}}}}
       catch(er){$('#di').innerHTML=errBox(er.message);$('[data-act=retry]',$('#di')).onclick=load}};
     dc.onchange=fill;dn.onchange=load;fill();
     try{const d=await sel('deposits','select=*&order=created_at.desc&limit=20');$('#dh').innerHTML=d.length?`<table><thead><tr><th>Time</th><th>Coin</th><th class="r">Amount</th><th>Conf.</th><th>Status</th><th>TxID</th></tr></thead><tbody>${d.map(x=>`<tr><td>${dt(x.created_at)}</td><td>${esc(x.coin)}/${esc(x.network)}</td><td class="num r">${num(x.amount)}</td><td class="num">${x.confirmations}/${x.required}</td><td>${badge(x.status)}</td><td class="mono" style="max-width:130px;overflow:hidden;text-overflow:ellipsis">${esc(x.txid||'—')}</td></tr>`).join('')}</tbody></table>`:empty('No deposits yet')}catch(e){$('#dh').innerHTML=errBox(e.message)}},
   withdraw:async wb=>{if(Demo.on){wb.innerHTML=demoBlock('Withdrawals');return}const hasMfa=!!AuthApi.totp(App.user);wb.innerHTML=`${hasMfa?'':`<div class="banner warn"><b>Protect your withdrawals.</b> Turn on two-factor authentication in <a href="#/account">Settings</a> to require a code for every withdrawal.</div>`}<div class="grid g2"><div class="card"><form id="wf" novalidate><div class="row nw"><div class="f grow"><label for="wc">Coin</label><select id="wc">${coinsAll.map(c=>`<option>${c}</option>`).join('')}</select></div><div class="f grow"><label for="wn">Network</label><select id="wn"></select></div></div>
     <div class="f"><label for="wa">Destination address</label><input id="wa" autocomplete="off" spellcheck="false" placeholder="Paste wallet address"><div class="err" id="e1"></div></div><div class="f" id="wm" style="display:none"><label for="wmm">Memo / tag</label><input id="wmm"></div>
     <div class="f"><label for="wq">Amount</label><input id="wq" inputmode="decimal"><div class="mut" id="wh" style="font-size:12px;margin-top:4px"></div><div class="err" id="e2"></div></div><div id="ws"></div><button class="btn pri blk" style="margin-top:10px">Review withdrawal</button></form></div>
     <div class="card"><h3>Withdrawal history</h3><div id="wl" class="tw"></div></div></div>`;
     const wc=$('#wc'),wn=$('#wn'),net=()=>netsOf(wc.value).find(n=>n.code===wn.value),av=()=>avOf(bal,wc.value);wc.value='USDT';
     const fill=()=>{wn.innerHTML=netsOf(wc.value).filter(n=>n.withdraw_enabled).map(n=>`<option value="${esc(n.code)}">${esc(n.name)}</option>`).join('');upd()};
     const upd=()=>{const n=net();if(!n){$('#ws').innerHTML='<div class="banner warn">Withdrawals are unavailable for this coin.</div>';return}const a=+$('#wq').value||0;$('#wm').style.display=n.memo_required?'':'none';
       $('#wh').innerHTML=`Available ${fmtAmt(av(),wc.value)} ${wc.value} · Min ${num(n.min_withdraw)} · Max ${num(n.max_withdraw)} · <a href="#" id="wmx">Max</a>`;$('#wmx').onclick=e=>{e.preventDefault();$('#wq').value=Math.max(0,Math.min(av(),num(n.max_withdraw)));upd()};
       $('#ws').innerHTML=kv([['Network fee',num(n.withdraw_fee)+' '+wc.value],['You will receive',`<b>${nf(Math.max(0,a-num(n.withdraw_fee)),6)} ${wc.value}</b>`]])};
     wc.onchange=fill;wn.onchange=upd;$('#wq').oninput=upd;fill();
     $('#wf').onsubmit=e=>{e.preventDefault();const n=net();if(!n)return;const a=+$('#wq').value,ad=$('#wa').value.trim();let ok=true;try{ok=new RegExp(n.address_regex).test(ad)}catch{}
       $('#e1').textContent=ok?'':`This does not look like a valid ${n.name} address. Check the network.`;$('#e2').textContent=!(a>0)?'Enter an amount.':a<num(n.min_withdraw)?`Minimum is ${num(n.min_withdraw)} ${wc.value}.`:a>num(n.max_withdraw)?`Maximum is ${num(n.max_withdraw)} ${wc.value}.`:a>av()?'Amount exceeds your available balance.':a<=num(n.withdraw_fee)?'Amount must exceed the network fee.':'';if($('#e1').textContent||$('#e2').textContent)return;
       const idem=uid('wd'),coin=wc.value,args={p_coin:coin,p_network:n.code,p_address:ad,p_memo:$('#wmm').value||null,p_amount:a,p_idem:idem};
       modal({title:'Review withdrawal',body:kv([['Coin',coin],['Network',esc(n.name)],['To',`<span class="mono" style="word-break:break-all;white-space:normal">${esc(ad)}</span>`],['Amount',a+' '+coin],['Network fee',num(n.withdraw_fee)+' '+coin],['You receive',nf(a-num(n.withdraw_fee),6)+' '+coin]])+`<div class="banner warn" style="margin:12px 0">Withdrawals cannot be reversed. Verify the address and network. Withdrawals are reviewed before they are sent.</div>${hasMfa?`<div class="f"><label for="vc">Authenticator code</label><input id="vc" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><div class="err" id="ve"></div></div>`:''}`,
        actions:[{label:'Cancel'},{label:'Confirm withdrawal',cls:'pri',close:false,fn:async(close,btn)=>{if(hasMfa){const code=$('#vc').value;if(!/^\d{6}$/.test(code))return $('#ve').textContent='Enter the 6-digit code.';btn.disabled=true;try{await AuthApi.challengeVerify(AuthApi.totp(App.user).id,code)}catch(er){btn.disabled=false;return $('#ve').textContent=er.message||'Code not accepted.'}}
          btn.disabled=true;try{const r=await rpc('request_withdrawal',args);$('#mb').innerHTML=`<div class="banner"><b>Withdrawal submitted.</b> Status: ${esc(r.status)}. It is not complete until the server confirms it.</div>`;$('#ma').innerHTML='<button class="btn" id="cx">Close</button>';$('#cx').onclick=()=>modalClose();bal=await D.balances();loadW();upd();$('#tb').textContent=usd(S().total)}
          catch(er){btn.disabled=false;const t=$('#ve');if(t)t.textContent=er.message;else toast(er.message,'bad');if(er.code==='mfa_required')toast('Two-factor verification is required.','bad')}}}]})};
     const loadW=async()=>{try{const d=await sel('withdrawals','select=*&order=created_at.desc&limit=20');$('#wl').innerHTML=d.length?`<table><thead><tr><th>Time</th><th>Coin</th><th class="r">Amount</th><th>Status</th><th>Tx hash</th></tr></thead><tbody>${d.map(x=>`<tr><td>${dt(x.created_at)}</td><td>${esc(x.coin)}/${esc(x.network)}</td><td class="num r">${num(x.amount)}</td><td>${badge(x.status)}${x.note&&['rejected','failed'].includes(x.status)?`<div class="mut" style="font-size:11px">${esc(x.note)}</div>`:''}</td><td class="mono">${esc(x.txid||'—')}</td></tr>`).join('')}</tbody></table>`:empty('No withdrawals yet')}catch(e){$('#wl').innerHTML=errBox(e.message)}};loadW();onData(['withdrawals'],loadW)},
   history:async wb=>{wb.innerHTML=`<div class="card">${skeleton(4)}</div>`;try{const[d,w]=await Promise.all([sel('deposits','select=*&order=created_at.desc&limit=30'),sel('withdrawals','select=*&order=created_at.desc&limit=30')]);const rows=[...d.map(x=>({...x,k:'Deposit'})),...w.map(x=>({...x,k:'Withdrawal'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
     wb.innerHTML=`<div class="card tw">${rows.length?`<table><thead><tr><th>Time</th><th>Type</th><th>Coin</th><th class="r">Amount</th><th>Status</th><th>Tx</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${dt(x.created_at)}</td><td>${x.k}</td><td>${esc(x.coin)}/${esc(x.network)}</td><td class="num r">${num(x.amount)}</td><td>${badge(x.status)}</td><td class="mono">${esc(x.txid||'—')}</td></tr>`).join('')}</tbody></table>`:empty('No deposits or withdrawals yet')}</div>`}catch(e){wb.innerHTML=errBox(e.message)}}};
  const show=()=>{$$('#wt button').forEach(b=>b.classList.toggle('on',b.dataset.t===st.t));views[st.t]($('#wb'))};$('#wt').onclick=e=>{if(e.target.dataset.t){st.t=e.target.dataset.t;show()}};
  v.onclick=e=>{const g=e.target.closest('[data-go]');if(g){st.t=g.dataset.go;show()}};show();
  onData(['balances'],async()=>{bal=await D.balances();if($('#tb'))$('#tb').textContent=usd(S().total);if(st.t==='balances')views.balances($('#wb'))});
});

/* ---- 45-journal.js ---- */
/* ============ bot journal: every step a bot takes, written by the server engine (agent_log) ============ */
const JEV={signal:['info','Signal'],buy:['up','Buy'],sell:['down','Sell'],skip:['review','Skipped'],risk:['failed','Risk'],start:['active','Started'],stop:['review','Stopped'],pause:['review','Paused'],resume:['active','Resumed'],halt:['failed','Halted'],check:['info','Check'],error:['failed','Error'],expire:['review','Expired']};
function journal(box,agentIds,o={}){
  if(!box)return;const ids=[].concat(agentIds||[]).filter(Boolean);let rows=[],ev='all',ag=ids[0]||'all',off=false;
  box.innerHTML=`<div class="card"><h3>Bot journal <span class="mut" style="font-weight:400;font-size:12px">every step the bot takes, newest first</span></h3>
    <div class="row" style="margin-bottom:8px;gap:8px"><select id="jf" aria-label="Filter journal events"><option value="all">All events</option>${Object.entries(JEV).map(([k,x])=>`<option value="${k}">${x[1]}</option>`).join('')}</select>${ids.length>1?`<select id="ja" aria-label="Filter by bot"><option value="all">All bots</option>${ids.map((x,i)=>`<option value="${x}">${esc((o.names&&o.names[x])||'Bot '+(i+1))}</option>`).join('')}</select>`:''}<button class="btn sm" id="jd">Download CSV</button></div>
    <div id="jl" style="max-height:420px;overflow:auto">${skeleton(3)}</div></div>`;
  const paint=()=>{const r=rows.filter(x=>(ev==='all'||x.event===ev)&&(ag==='all'||x.agent_id===ag));const el=$('#jl',box);if(!el)return;
    el.innerHTML=r.length?r.map(x=>{const m=JEV[x.event]||['info',x.event];const det=x.detail&&Object.keys(x.detail).length?`<details><summary class="mut" style="cursor:pointer">details</summary><pre class="mono mut" style="white-space:pre-wrap;margin:4px 0 0;font-size:11px">${esc(JSON.stringify(x.detail,null,1))}</pre></details>`:'';
      return `<div class="jr"><span class="mut num">${dt(x.ts)}</span><span class="badge ${m[0]==='up'?'active':m[0]==='down'?'failed':m[0]}">${esc(m[1])}</span><span><b>${esc(x.symbol||'')}</b> ${esc(x.message||'')}${det}</span></div>`}).join(''):empty('No journal entries yet','Entries appear as soon as a bot is started and the engine evaluates it (about every minute while the market feed is scheduled).')};
  const load=async()=>{try{if(!ids.length){rows=[];paint();return}rows=await sel('agent_log',`agent_id=in.(${ids.join(',')})&select=*&order=ts.desc&limit=300`);off=false}catch(e){off=true;const el=$('#jl',box);if(el)el.innerHTML=`<div class="banner warn">The bot journal is not installed on this project yet. Run the setup SQL that includes migration 004 (see README).</div>`;return}paint()};
  box.onchange=e=>{if(e.target.id==='jf'){ev=e.target.value;paint()}if(e.target.id==='ja'){ag=e.target.value;paint()}};
  box.onclick=e=>{if(e.target.id==='jd'){if(!rows.length)return toast('No entries to export');download('bot-journal.csv',csv(['ts','agent_id','event','symbol','message'],rows))}};
  load();onData(['agent_log'],load,8000);
}

/* ---- 46-aikey.js ---- */
/* ============ AI advisor: bring your own LLM API key (stored server-side only; the advisor can read, never trade) ============ */
const AI_PRESETS=[['zai','Z.ai (GLM)','glm-4.6'],['openai','OpenAI','gpt-4o-mini'],['openrouter','OpenRouter','openai/gpt-4o-mini'],['deepseek','DeepSeek','deepseek-chat'],['custom','Other (OpenAI-compatible)','']];
function aiAdvisor(box){
  if(!box)return;let info=null,busy=false;
  const fe=e=>e.status===404?'The ai-advisor function is not deployed on this project yet.':e.message||'Request failed';
  const paint=()=>{const p=info?AI_PRESETS.find(x=>x[0]===info.provider):null;
    box.innerHTML=`<div class="card"><h3>AI advisor <span class="badge info">your own API key</span></h3>
    <div class="banner" style="margin-bottom:10px">Add an API key from an LLM provider and ask the advisor to review your bot and the market. <b>The advisor only gives suggestions: it cannot place trades or change your settings.</b> Your key is stored on the server, never shown again (only the last 4 characters), and is never put in the browser or in code. Usage is billed by your provider. Never paste a key into a chat; paste it only here.</div>
    ${info?`<div class="kv"><span>Connected</span><span class="num">${esc(p?p[1]:info.provider)} · ${esc(info.model)} · key …${esc(info.last4)}</span></div>`:''}
    <form id="aif" novalidate><fieldset style="border:0;padding:0;margin:0"><div class="row nw"><div class="f grow"><label for="aip">Provider</label><select id="aip">${AI_PRESETS.map(x=>`<option value="${x[0]}" ${x[0]===(info?.provider||'zai')?'selected':''}>${x[1]}</option>`).join('')}</select></div><div class="f grow"><label for="aim">Model name</label><input id="aim" value="${esc(info?.model||'glm-4.6')}" maxlength="80" autocomplete="off" spellcheck="false"></div></div>
    <div class="f" id="aiu" style="display:none"><label for="aib">API base URL (https, OpenAI-compatible)</label><input id="aib" value="${esc(info&&info.provider==='custom'?info.base_url:'')}" placeholder="https://api.example.com/v1" autocomplete="off" spellcheck="false"></div>
    <div class="f"><label for="aik">API key</label><input id="aik" type="password" autocomplete="new-password" spellcheck="false" placeholder="${info?'Enter a new key to replace the saved one':'Paste your API key'}"></div><div class="err" id="aie" role="alert"></div>
    <div class="row"><button class="btn pri" id="ais">Save key</button><button type="button" class="btn" id="ait" ${info?'':'disabled'}>Test connection</button><button type="button" class="btn danger" id="air" ${info?'':'disabled'}>Remove key</button></div></fieldset></form>
    <div id="aiq" style="margin-top:14px;${info?'':'opacity:.5;pointer-events:none'}"><div class="f"><label for="aiqq">Ask the advisor</label><textarea id="aiqq" rows="2" maxlength="600" placeholder="e.g. Is my stop-loss too tight for these pairs? What are the risks this week?" style="width:100%"></textarea></div><button class="btn" id="aia">Ask</button><div id="aiout" style="margin-top:10px;white-space:pre-wrap"></div></div></div>`;
    const pv=()=>{$('#aiu').style.display=$('#aip').value==='custom'?'':'none'};$('#aip').onchange=()=>{const x=AI_PRESETS.find(q=>q[0]===$('#aip').value);if(x&&x[2])$('#aim').value=x[2];pv()};pv();
    $('#aif').onsubmit=async e=>{e.preventDefault();if(busy)return;const k=$('#aik').value.trim();$('#aie').textContent='';if(!k)return $('#aie').textContent='Paste your API key first.';
      busy=true;$('#ais').disabled=true;try{await fnPost('ai-advisor',{action:'save',provider:$('#aip').value,model:$('#aim').value.trim(),base_url:$('#aib').value.trim(),api_key:k});$('#aik').value='';toast('Key saved');await load()}catch(er){$('#aie').textContent=fe(er)}finally{busy=false;const b=$('#ais');if(b)b.disabled=false}};
    $('#ait').onclick=async()=>{const b=$('#ait');b.disabled=true;try{const r=await fnPost('ai-advisor',{action:'test'});toast('Connected: '+(r.reply||'OK'))}catch(er){$('#aie').textContent=fe(er)}finally{b.disabled=false}};
    $('#air').onclick=()=>modal({title:'Remove AI key',body:'<div class="mut">The saved key is deleted from the server. You can add it again at any time.</div>',actions:[{label:'Cancel'},{label:'Remove',cls:'danger',fn:async()=>{try{await fnPost('ai-advisor',{action:'remove'});toast('Key removed');await load();return true}catch(er){toast(fe(er),'bad');return false}}}]});
    $('#aia').onclick=async()=>{const b=$('#aia'),o=$('#aiout');b.disabled=true;o.innerHTML='<span class="mut">Thinking…</span>';try{const r=await fnPost('ai-advisor',{action:'ask',question:$('#aiqq').value});o.innerHTML=`<div class="card" style="background:var(--bg3,#1c1c24)">${esc(r.answer)}<div class="mut" style="font-size:11px;margin-top:8px">${esc(r.model)} · suggestions only, not financial advice. You decide and apply any change yourself.</div></div>`}catch(er){o.innerHTML=`<div class="banner bad">${esc(fe(er))}</div>`}finally{b.disabled=false}}};
  const load=async()=>{try{info=await rpc('ai_key_info')}catch{info=null}paint()};
  load();
}

/* ---- 50-pages-b.js ---- */
const STRAT={trend:'Trend following',meanrev:'Mean reversion',momentum:'Momentum',dca:'Dollar-cost averaging'};
const RISKTXT={Low:'Lower expected volatility, but losses are still possible.',Medium:'Moderate volatility. Drawdowns can be significant.',High:'High volatility. You can lose most or all of the allocated capital.'};
/* same rule set as the server engine, for the client-side historical simulation only */
function sig(c,i,strategy){if(i<19)return 0;const w=c.slice(i-19,i+1),s20=w.reduce((a,b)=>a+b,0)/20,s5=w.slice(-5).reduce((a,b)=>a+b,0)/5,sd=stdev(w),px=c[i];
  if(strategy==='trend')return s5>s20*1.0005?1:s5<s20*.9995?-1:0;if(strategy==='meanrev'){if(!sd)return 0;const z=(px-s20)/sd;return z<-1.5?1:z>.5?-1:0}
  if(strategy==='momentum'){const r=px/c[i-9]-1;return r>.003?1:r<-.003?-1:0}return 1}
function backtest(k,cfg){const c=k.map(x=>x.c),f=Settings.spot_fee_rate,maxA=cfg.capital*cfg.maxAlloc/100;let cash=cfg.capital,pos=null,eq=[],tr=[],lastBuy=-99;
  for(let i=19;i<c.length;i++){const px=c[i],s=sig(c,i,cfg.strategy);
    if(pos){const why=px<=pos.p*(1-cfg.stopLoss/100)?'SL':px>=pos.p*(1+cfg.takeProfit/100)?'TP':(s===-1&&cfg.strategy!=='dca')?'sig':null;if(why){const pr=px*pos.q,fee=pr*f;cash+=pr-fee;tr.push({pnl:(px-pos.p)*pos.q-fee-pos.fee});pos=null}}
    else if(s===1&&cash>=Settings.min_order_usdt&&!(cfg.strategy==='dca'&&i-lastBuy<6)){const n=Math.min(cash,maxA),q=n/px,fee=n*f;cash-=n+fee;pos={p:px,q,fee};lastBuy=i}
    eq.push(cash+(pos?pos.q*px:0))}
  const end=eq[eq.length-1]||cfg.capital,w=tr.filter(t=>t.pnl>0).length;return{ret:(end/cfg.capital-1)*100,trades:tr.length,win:tr.length?w/tr.length*100:null,dd:maxDrawdown([cfg.capital,...eq]),bars:c.length-19,open:!!pos}}

/* ============ AI trading ============ */
pages.ai=v=>guard(v,async()=>{
  let ag=(await sel('agents','select=*&kind=eq.own'))[0]||null,trades=[],pos=[];
  const load=async()=>{ag=(await sel('agents','select=*&kind=eq.own'))[0]||null;if(ag){[trades,pos]=await Promise.all([sel('agent_trades',`agent_id=eq.${ag.id}&select=*&order=created_at.desc&limit=200`),sel('agent_positions',`agent_id=eq.${ag.id}&select=*`)])}else{trades=[];pos=[]}};await load();
  const c0=ag||{name:'My AI Agent',strategy:'trend',pairs:['BTC/USDT','ETH/USDT'].filter(s=>Market.tickers[s]),capital:500,risk:'medium',stop_loss:3,take_profit:6,max_alloc:15,max_daily_loss:50,status:'stopped'};const active=()=>ag&&['running','paused'].includes(ag.status);
  const pairs=Object.keys(Market.tickers);
  v.innerHTML=head('AI Trading','Rule-based strategies with hard risk limits you control',`<span id="ast"></span>`)+`<div id="nt">${notice()}</div><div class="banner"><b>Ledger mode.</b> The agent trades against your platform balance at the server's market price, using the rule set below. No external exchange is connected and live exchange trading is not available. Signals are rules applied to price history, not predictions, and results can be negative.</div><div id="stat"></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Strategy &amp; risk settings</h3><form id="cf" novalidate><fieldset id="fs" style="border:0;padding:0;margin:0">
   <div class="row nw"><div class="f grow"><label for="nm">Bot name</label><input id="nm" value="${esc(c0.name)}" maxlength="40"></div><div class="f grow"><label for="stg">Strategy</label><select id="stg">${Object.entries(STRAT).map(s=>`<option value="${s[0]}" ${s[0]===c0.strategy?'selected':''}>${s[1]}</option>`).join('')}</select></div></div>
   <div class="f"><label>Trading pairs</label><div class="row" id="pp">${pairs.slice(0,10).map(p=>`<label class="chk" style="margin:0"><input type="checkbox" value="${p}" ${(c0.pairs||[]).includes(p)?'checked':''}>${p.split('/')[0]}</label>`).join('')}</div></div>
   <div class="row nw"><div class="f grow"><label for="cap">Allocated capital (USDT)</label><input id="cap" inputmode="decimal" value="${num(c0.capital)}"></div><div class="f grow"><label for="rk">Risk level</label><select id="rk">${['low','medium','high'].map(r=>`<option ${r===c0.risk?'selected':''}>${r}</option>`).join('')}</select></div></div>
   <div class="row nw"><div class="f grow"><label for="sl">Stop-loss %</label><input id="sl" inputmode="decimal" value="${num(c0.stop_loss)}"></div><div class="f grow"><label for="tp">Take-profit %</label><input id="tp" inputmode="decimal" value="${num(c0.take_profit)}"></div></div>
   <div class="row nw"><div class="f grow"><label for="ma">Max allocation / trade %</label><input id="ma" inputmode="decimal" value="${num(c0.max_alloc)}"></div><div class="f grow"><label for="dl">Max daily loss (USDT)</label><input id="dl" inputmode="decimal" value="${num(c0.max_daily_loss)}"></div></div></fieldset>
   <div class="f"><label>Execution mode</label><div class="seg"><button type="button" class="on">Ledger (server price)</button><button type="button" disabled title="No exchange connected">Live exchange (unavailable)</button></div></div>
   <div class="err" id="ce" role="alert"></div><div class="row"><button class="btn pri" id="sv">Save settings</button><button type="button" class="btn" id="bt">Backtest</button></div><div class="mut" id="lock" style="font-size:12px;margin-top:8px"></div></form></div>
  <div class="col"><div class="card"><h3>Controls</h3><div class="row"><button class="btn buy" data-a="start">Start</button><button class="btn" data-a="pause">Pause</button><button class="btn" data-a="resume">Resume</button><button class="btn danger" data-a="stop">Stop</button></div><div class="mut" style="margin-top:10px;font-size:12px">Start reserves your allocated capital. Stop closes open positions at the server price and releases the capital.</div></div>
  <div class="card" style="padding:0"><div class="gl" id="ag" style="height:190px"><div class="cap">Selected market · 3D</div></div></div>
  <div class="card"><h3>Market analysis <span class="badge info">rules on public data</span></h3><div id="an">${skeleton(3)}</div></div></div></div>
  <div id="adv" style="margin-top:14px"></div><div id="jn" style="margin-top:14px"></div><div class="card" style="margin-top:14px"><h3>Recent AI activity <button class="btn sm" id="dlc">Download CSV</button></h3><div id="tl" class="tw" style="max-height:360px;overflow:auto"></div></div>`;
  const paint=()=>{const sells=trades.filter(t=>t.side==='sell'),wins=sells.filter(t=>num(t.pnl)>0).length,real=trades.reduce((a,t)=>a+num(t.pnl),0),fees=trades.reduce((a,t)=>a+num(t.fee),0),unr=pos.reduce((a,p)=>a+num(p.qty)*(Market.price(p.symbol.split('/')[0])-num(p.avg_price)),0),cap=ag?num(ag.capital):0;
    $('#ast').innerHTML=ag?badge(ag.status):badge('not set up');
    $('#stat').innerHTML=ag?`<div class="card"><h3>${esc(ag.name)} · ${esc(STRAT[ag.strategy]||ag.strategy)} ${badge(ag.status)} <span class="badge info">ledger</span></h3>${ag.halted_reason?`<div class="banner bad">Halted: ${esc(ag.halted_reason)}</div>`:''}<div class="grid g4" style="gap:12px">${[['Pairs',esc((ag.pairs||[]).join(', '))],['Allocated capital',usd(cap)],['Portfolio value',usd(cap+real+unr)],['Realized P&L',`<span class="${cl(real)}">${usd(real)}</span>`],['Unrealized P&L',`<span class="${cl(unr)}">${usd(unr)}</span>`],['Executed trades',trades.length],['Win rate',sells.length?`${nf(wins/sells.length*100,1)}% <span class="mut" style="font-size:11px">(${sells.length} closed trades since ${dt(ag.started_at)})</span>`:'n/a — no closed trades yet'],['Fees paid',usd(fees)]].map(x=>`<div><div class="mut" style="font-size:12px">${x[0]}</div><div class="num" style="font-weight:600">${x[1]}</div></div>`).join('')}</div>
      <div class="mut" style="font-size:12px;margin-top:10px">Risk ${esc(ag.risk)} · SL ${num(ag.stop_loss)}% · TP ${num(ag.take_profit)}% · max ${num(ag.max_alloc)}% / trade · daily loss cap ${num(ag.max_daily_loss)} USDT · Last activity ${dt(trades[0]?.created_at)} · Last engine run ${dt(ag.last_run)}</div></div>`:`<div class="card">${empty('No agent yet','Choose a strategy and risk limits below, then save to create your agent.')}</div>`;
    $('#tl').innerHTML=trades.length?`<table><thead><tr><th>Time</th><th>Pair</th><th>Side</th><th class="r">Price</th><th class="r">Qty</th><th class="r">P&amp;L</th><th>Reason</th></tr></thead><tbody>${trades.slice(0,80).map(t=>`<tr><td>${dt(t.created_at)}</td><td>${esc(t.symbol)}</td><td class="${t.side==='buy'?'up':'down'}">${t.side}</td><td class="num r">${fmtPrice(num(t.price))}</td><td class="num r">${nf(num(t.qty),6)}</td><td class="num r ${cl(num(t.pnl))}">${nf(num(t.pnl),2)}</td><td>${esc(t.reason||'')}</td></tr>`).join('')}</tbody></table>`:empty('No trades yet','Executions appear here only after the server records them.');
    $('#fs').disabled=!!active();$('#sv').disabled=!!active();$('#lock').textContent=active()?'Stop the agent to change its settings.':''};paint();
  const refresh=async()=>{try{await load();if($('#stat'))paint()}catch{}};let jid=ag&&ag.id;onData(['agents','agent_trades'],()=>{refresh().then(()=>{if(ag&&ag.id!==jid){jid=ag.id;journal($('#jn'),[ag.id])}})},6000);journal($('#jn'),ag?[ag.id]:[]);aiAdvisor($('#adv'));
  $('#dlc').onclick=()=>{if(!trades.length)return toast('No trades to export');download('ai-trades.csv',csv(['id','created_at','symbol','side','price','qty','fee','pnl','reason'],trades))};
  const read=()=>{const n=id=>+$(id).value;return{name:$('#nm').value.trim(),strategy:$('#stg').value,pairs:$$('#pp input:checked').map(i=>i.value),capital:n('#cap'),risk:$('#rk').value,stopLoss:n('#sl'),takeProfit:n('#tp'),maxAlloc:n('#ma'),maxDailyLoss:n('#dl')}};
  const check=c=>!c.name?'Name is required.':!c.pairs.length?'Select at least one pair.':!(c.capital>0)?'Capital must be greater than zero.':!(c.stopLoss>0&&c.stopLoss<100)?'Stop-loss must be between 0 and 100.':!(c.takeProfit>0)?'Take-profit must be greater than zero.':!(c.maxAlloc>0&&c.maxAlloc<=100)?'Max allocation per trade must be 1–100%.':!(c.maxDailyLoss>0)?'Set a maximum daily loss.':'';
  $('#cf').onsubmit=async e=>{e.preventDefault();const c=read(),er=check(c);$('#ce').textContent=er;if(er)return;try{await rpc('agent_save',{p_name:c.name,p_strategy:c.strategy,p_pairs:c.pairs,p_capital:c.capital,p_risk:c.risk,p_stop_loss:c.stopLoss,p_take_profit:c.takeProfit,p_max_alloc:c.maxAlloc,p_max_daily_loss:c.maxDailyLoss,p_mode:'ledger'});toast('Settings saved');refresh()}catch(x){$('#ce').textContent=x.message}};
  $('#bt').onclick=async()=>{const c=read(),er=check(c);$('#ce').textContent=er;if(er)return;const b=$('#bt');b.disabled=true;try{const rows=await Promise.all(c.pairs.slice(0,4).map(async p=>({p,r:backtest(await Market.klines(p,'1h',500),c)})));
    modal({title:'Historical simulation',body:`<div class="banner warn">This replays your rules on recent public hourly candles, with fees. It is <b>not</b> a prediction and ignores slippage and live-price differences.</div><table><thead><tr><th>Pair</th><th class="r">Return</th><th class="r">Trades</th><th class="r">Win rate</th><th class="r">Max drawdown</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${x.p}</td><td class="num r ${cl(x.r.ret)}">${pct(x.r.ret)}</td><td class="num r">${x.r.trades}</td><td class="num r">${x.r.win==null?'—':nf(x.r.win,0)+'%'}</td><td class="num r">${pct(x.r.dd)}</td></tr>`).join('')}</tbody></table><div class="mut" style="font-size:12px;margin-top:8px">Each pair simulated separately over ${rows[0]?.r.bars||0} bars.</div>`,actions:[{label:'Close'}]})}catch(x){toast('Backtest failed: '+x.message,'bad')}finally{b.disabled=false}};
  v.onclick=async e=>{const a=e.target.closest('[data-a]')?.dataset.a;if(!a)return;try{const r=await rpc('agent_action',{p_action:a});toast('Agent '+r.status);refresh()}catch(x){toast(x.message,'bad')}};
  const ap=pairs.includes('BTC/USDT')?'BTC/USDT':pairs[0];if(ap){sceneCandles($('#ag'),()=>Market.cache[ap+'|1h']);Market.klines(ap,'1h').then(async k=>{if(!$('#an'))return;const c=k.map(x=>x.c),m20=sma(c,20).pop(),m50=sma(c,50).pop(),r=rsi(c).pop(),rr=c.slice(1).map((x,i)=>x/c[i]-1),vol=stdev(rr.slice(-48))*100,t=Market.tickers[ap];
    $('#an').innerHTML=`<p style="margin:0 0 8px">${ap} is at <b>${fmtPrice(t.price)}</b> (${pct(t.change24h)} over 24h). The 20-period average is ${m20>m50?'above':'below'} the 50-period average, which describes a ${m20>m50?'short-term uptrend':'short-term downtrend'}. RSI(14) is <b>${nf(r,0)}</b> (${r>70?'overbought zone':r<30?'oversold zone':'neutral zone'}). Recent hourly volatility is ${nf(vol,2)}%.</p><div class="mut" style="font-size:12px">Computed from ${k.length} hourly candles (public data). Descriptive only — not a forecast or advice.</div>`}).catch(()=>{if($('#an'))$('#an').innerHTML='<div class="mut">Analysis unavailable: chart history could not be loaded.</div>'})}
});

/* ============ bots ============ */
pages.bots=v=>guard(v,async()=>{
  let[list,rentals]=await Promise.all([sel('bots','select=*&order=sort'),sel('rentals','select=*,bots(name,strategy,risk)&order=starts_at.desc')]);
  const st={tab:'market',risk:'',q:'',sel:list[0]?.id,cmp:new Set()};let gv=null;
  v.innerHTML=head('Rent a Trader Bot','Browse, compare, rent and manage trading bots')+`<div id="nt">${notice()}</div><div class="banner warn">Renting a bot does not guarantee a return. <b>The rental fee is separate from your trading allocation</b>, which can lose value. No verified performance history is published for these bots yet.</div><div class="tabs" id="bt"><button data-t="market" class="on">Marketplace</button><button data-t="mine">My rentals (${rentals.length})</button></div><div id="bb"></div>`;
  const bot=id=>list.find(b=>b.id===id);
  const rent=b=>{const idem=uid('rent');let plan='weekly';const P=k=>num(b['price_'+k]);
    modal({title:'Rent '+b.name,body:`<div class="f"><label>Plan</label><div class="seg" id="pl">${['daily','weekly','monthly'].map(k=>`<button type="button" data-p="${k}" class="${k===plan?'on':''}">${k} · ${P(k)} USDT</button>`).join('')}</div></div><div class="f"><label for="al">Trading allocation (USDT) — min ${num(b.min_allocation)}</label><input id="al" inputmode="decimal" value="${num(b.min_allocation)}"><div class="err" id="ae"></div></div><div id="rs"></div><label class="chk" style="margin-top:10px"><input type="checkbox" id="tm"> I have read the risk disclosures. I understand the rental fee is charged now and may be non-refundable, my allocation can lose value, and past results do not predict future results.</label>`,
      actions:[{label:'Cancel'},{label:'Confirm rental',cls:'pri',close:false,fn:async(close,btn)=>{const a=+$('#al').value;$('#ae').textContent=a<num(b.min_allocation)?`Minimum allocation is ${num(b.min_allocation)} USDT.`:!$('#tm').checked?'Please accept the terms.':'';if($('#ae').textContent)return;btn.disabled=true;
        try{const r=await rpc('rent_bot',{p_bot:b.id,p_plan:plan,p_allocation:a,p_idem:idem});$('#mb').innerHTML=`<div class="banner"><b class="up">Rental confirmed by server.</b> Status: ${esc(r.status)}.</div>`;$('#ma').innerHTML='<button class="btn" id="cx">Close</button>';$('#cx').onclick=()=>modalClose();await reload()}catch(er){btn.disabled=false;$('#ae').textContent=er.message}}}]});
    const sum=()=>{const a=+$('#al').value||0;$('#rs').innerHTML=kv([['Rental fee (charged now)',P(plan)+' USDT'],['Trading allocation (reserved)',nf(a,2)+' USDT'],['Total needed available',nf(a+P(plan),2)+' USDT'],['Duration',{daily:'1 day',weekly:'7 days',monthly:'30 days'}[plan]]])};sum();$('#pl').onclick=e=>{const p=e.target.dataset.p;if(!p)return;plan=p;$$('#pl button').forEach(x=>x.classList.toggle('on',x.dataset.p===p));sum()};$('#al').oninput=sum};
  async function reload(){[list,rentals]=await Promise.all([sel('bots','select=*&order=sort'),sel('rentals','select=*,bots(name,strategy,risk)&order=starts_at.desc')]);show()}
  const detail=()=>{const b=bot(st.sel);if(!b)return `<div class="card">${empty('Select a bot')}</div>`;return `<div class="card glow"><div class="gl" id="bg" style="height:150px;margin:-16px -16px 12px;border-radius:14px 14px 0 0"></div><div class="row nw"><div class="logo" style="width:46px;height:46px;font-size:20px;color:#200a06;font-weight:800">${esc(b.name[0])}</div><div class="grow"><h2>${esc(b.name)}</h2><span class="tag">${esc(STRAT[b.strategy]||b.strategy)}</span><span class="badge ${b.risk==='High'?'bad':b.risk==='Medium'?'wait':'ok'}">${b.risk} risk</span> ${badge(b.available?'active':'paused')}</div></div>
    <p class="mut">${esc(b.description)}</p>${kv([['Supported coins',esc((b.coins||[]).join(', '))],['Trading frequency',esc(b.frequency)],['Stop-loss / take-profit',`${num(b.stop_loss)}% / ${num(b.take_profit)}%`],['Max per trade',num(b.max_alloc)+'% of allocation'],['Rental plans',`${num(b.price_daily)} / ${num(b.price_weekly)} / ${num(b.price_monthly)} USDT (day / week / month)`],['Minimum allocation',num(b.min_allocation)+' USDT'],['Revenue share','None'],['Execution','Platform ledger, server price'],['Performance history','<span class="mut">Not yet published</span>'],['Max drawdown','<span class="mut">Not available</span>']])}
    <div class="banner warn" style="margin:12px 0 0"><b>Risk disclosure.</b> ${RISKTXT[b.risk]||''} Past results do not predict future results.</div><button class="btn pri blk" style="margin-top:12px" data-rent="${b.id}" ${b.available&&!Backend.missing?'':'disabled'}>${b.available?'Rent Bot':'Currently unavailable'}</button></div>`};
  const market=()=>{const l=list.filter(b=>(!st.risk||b.risk===st.risk)&&(!st.q||(b.name+b.description).toLowerCase().includes(st.q)));
    $('#bb').innerHTML=`<div class="botsl"><div class="col"><div class="row"><input id="bq" placeholder="Search bots…" value="${esc(st.q)}" aria-label="Search bots"><div class="seg" id="fr">${['','Low','Medium','High'].map(r=>`<button data-r="${r}" class="${st.risk===r?'on':''}">${r||'All'}</button>`).join('')}</div><button class="btn" id="cmp" ${st.cmp.size<2?'disabled':''}>Compare (${st.cmp.size})</button></div>
    ${l.length?l.map(b=>`<div class="card card-btn ${b.id===st.sel?'sel':''}" data-v="${b.id}"><div class="row nw"><div class="logo" style="width:42px;height:42px;color:#200a06;font-weight:800">${esc(b.name[0])}</div><div class="grow"><b>${esc(b.name)}</b><div class="mut">${esc(STRAT[b.strategy]||b.strategy)} · ${(b.coins||[]).join(', ')}</div></div><div class="r"><div class="num"><b>${num(b.price_weekly)} USDT</b>/week</div><span class="badge ${b.risk==='High'?'bad':b.risk==='Medium'?'wait':'ok'}">${b.risk}</span></div></div><label class="chk" style="margin-top:8px"><input type="checkbox" data-c="${b.id}" ${st.cmp.has(b.id)?'checked':''}>Compare</label></div>`).join(''):`<div class="card">${empty('No bots match')}</div>`}</div><div id="bd">${detail()}</div></div>`;
    const mount=()=>{gv&&gv.destroy();gv=null;const h=$('#bg');if(h)gv=sceneCoins(h,{labels:[(bot(st.sel)?.name[0]||'A')],layout:'single',particles:30})};mount();
    $('#bq').oninput=e=>{st.q=e.target.value.toLowerCase();clearTimeout(st.t);st.t=setTimeout(()=>{market();$('#bq').focus()},250)};$('#fr').onclick=e=>{if(e.target.dataset.r===undefined)return;st.risk=e.target.dataset.r;market()};
    $('#cmp').onclick=()=>{const bs=list.filter(b=>st.cmp.has(b.id));modal({title:'Compare bots',body:`<div class="tw"><table><thead><tr><th></th>${bs.map(b=>`<th>${esc(b.name)}</th>`).join('')}</tr></thead><tbody>${[['Strategy',b=>STRAT[b.strategy]],['Risk',b=>b.risk],['Frequency',b=>b.frequency],['Coins',b=>(b.coins||[]).join(', ')],['Stop-loss',b=>num(b.stop_loss)+'%'],['Take-profit',b=>num(b.take_profit)+'%'],['Max / trade',b=>num(b.max_alloc)+'%'],['Daily / weekly / monthly',b=>`${num(b.price_daily)} / ${num(b.price_weekly)} / ${num(b.price_monthly)}`],['Min allocation',b=>num(b.min_allocation)+' USDT']].map(r=>`<tr><td class="mut">${r[0]}</td>${bs.map(b=>`<td>${esc(r[1](b))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,actions:[{label:'Close'}]})};
    $('#bb').onclick=e=>{const rb=e.target.closest('[data-rent]');if(rb)return rent(bot(rb.dataset.rent));const c=e.target.dataset.c;if(c){if(e.target.checked&&st.cmp.size>=3){e.target.checked=false;return toast('Compare up to 3 bots')}e.target.checked?st.cmp.add(c):st.cmp.delete(c);$('#cmp').disabled=st.cmp.size<2;$('#cmp').textContent=`Compare (${st.cmp.size})`;return}
      const cd=e.target.closest('[data-v]');if(cd&&!e.target.closest('label')){st.sel=cd.dataset.v;$$('[data-v]').forEach(x=>x.classList.toggle('sel',x.dataset.v===st.sel));$('#bd').innerHTML=detail();mount()}}};
  const mine=async()=>{gv&&gv.destroy();gv=null;let pnl={};if(rentals.length){try{const ids=rentals.map(r=>r.agent_id).filter(Boolean);if(ids.length){(await sel('agent_trades',`agent_id=in.(${ids.join(',')})&select=agent_id,pnl`)).forEach(t=>{pnl[t.agent_id]=(pnl[t.agent_id]||0)+num(t.pnl)})}}catch{}}
    $('#bb').innerHTML=rentals.length?`<div class="card tw"><table><thead><tr><th>Bot</th><th>Plan</th><th class="r">Fee</th><th class="r">Allocation</th><th class="r">Realized P&amp;L</th><th>Ends</th><th>Status</th><th></th></tr></thead><tbody>${rentals.map(r=>`<tr><td>${esc(r.bots?.name||r.bot_id)}</td><td>${r.plan}</td><td class="num r">${num(r.fee)}</td><td class="num r">${num(r.allocation)}</td><td class="num r ${cl(pnl[r.agent_id]||0)}">${nf(pnl[r.agent_id]||0,2)}</td><td>${dt(r.ends_at)}</td><td>${badge(r.status)}</td><td>${['active','paused'].includes(r.status)?`<button class="btn sm" data-a="${r.status==='active'?'pause':'resume'}" data-id="${r.id}">${r.status==='active'?'Pause':'Resume'}</button> <button class="btn sm danger" data-a="cancel" data-id="${r.id}">Cancel</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:`<div class="card">${empty('No rentals yet','Rented bots appear here after the server confirms the rental.')}</div>`;if(rentals.length&&$('#bb')){const jb=document.createElement('div');jb.style.marginTop='14px';$('#bb').append(jb);journal(jb,rentals.map(r=>r.agent_id),{names:Object.fromEntries(rentals.map(r=>[r.agent_id,r.bots?.name||r.bot_id]))})}
    $('#bb').onclick=e=>{const a=e.target.dataset.a,id=e.target.dataset.id;if(!a)return;const run=async()=>{try{await rpc('rental_action',{p_id:id,p_action:a});toast('Rental '+a+' confirmed by server');await reload()}catch(er){toast(er.message,'bad')}};
      a==='cancel'?modal({title:'Cancel rental?',body:'The bot stops trading and its open positions are closed at the server price. The rental fee already charged may not be refunded. Your reserved allocation is released.',actions:[{label:'Keep rental'},{label:'Cancel rental',cls:'danger',fn:run}]}):run()}};
  function show(){$$('#bt button').forEach(b=>b.classList.toggle('on',b.dataset.t===st.tab));$('#bt button[data-t=mine]').textContent=`My rentals (${rentals.length})`;st.tab==='market'?market():mine()}
  $('#bt').onclick=e=>{if(!e.target.dataset.t)return;st.tab=e.target.dataset.t;show()};show();onData(['rentals','agents'],()=>{if(st.tab==='mine')reload()});
});

/* ============ analytics ============ */
pages.analytics=v=>guard(v,async()=>{
  const[snaps,trades,bots,news,bal]=await Promise.all([sel('portfolio_snapshots','select=ts,value&order=ts.asc&limit=500'),sel('agent_trades','select=pnl,created_at&order=created_at.asc&limit=1000'),sel('bots','select=*&order=sort'),sel('news','select=*&order=published_at.desc&limit=5'),D.balances()]);
  const syms=Object.keys(Market.tickers);let sym=LS.get('novatrade.apair',syms.includes('BTC/USDT')?'BTC/USDT':syms[0]),tf='1h',mode='2d';if(!syms.length)throw new Error('Market data is unavailable right now.');
  const vals=snaps.map(s=>num(s.value)),rets=vals.slice(1).map((x,i)=>x/vals[i]-1),hasP=vals.length>=2,days={};trades.forEach(t=>{const d=t.created_at.slice(0,10);days[d]=(days[d]||0)+num(t.pnl)});const dk=Object.keys(days).slice(-30);
  v.innerHTML=head('Analytics','Charts, indicators and portfolio metrics')+`<div id="nt">${notice()}</div><div class="card"><div class="row"><select id="ap" style="width:150px" aria-label="Pair">${syms.map(s=>`<option ${s===sym?'selected':''}>${s}</option>`).join('')}</select><div class="seg" id="atf">${Object.keys(TF).map(t=>`<button data-t="${t}" class="${t===tf?'on':''}">${t}</button>`).join('')}</div><div class="seg" id="ai2"><button data-i="ma" class="on">MA</button><button data-i="rsi" class="on">RSI</button><button data-i="macd" class="on">MACD</button></div><div class="seg" id="vm"><button data-m="2d" class="on">2D chart</button><button data-m="3d">3D view</button></div></div><div class="chartbox" id="ac" style="height:500px;margin-top:10px"></div><div class="gl" id="a3" style="height:500px;margin-top:10px;display:none"></div></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Market depth <span class="badge info">reference</span></h3><div class="chartbox" style="height:190px"><canvas id="dp"></canvas></div></div><div class="card"><h3>Market summary <span class="badge info">rules on public data</span></h3><div id="sm">${skeleton(3)}</div></div></div>
  <div class="grid g4" style="margin-top:14px">${[['Return (snapshots)',hasP?`<span class="${cl(vals[vals.length-1]/vals[0]-1)}">${pct((vals[vals.length-1]/vals[0]-1)*100)}</span>`:'—'],['Max drawdown',hasP?pct(maxDrawdown(vals)):'—'],['Annualized volatility',hasP&&rets.length>2?nf(stdev(rets)*Math.sqrt(365*24)*100,1)+'%':'—'],['Closed bot P&L',usd(trades.reduce((a,t)=>a+num(t.pnl),0))]].map(x=>`<div class="card stat"><div><div class="l">${x[0]}</div><div class="v num" style="font-size:20px">${x[1]}</div></div></div>`).join('')}</div>
  <div class="grid g3" style="margin-top:14px"><div class="card"><h3>Portfolio value</h3><div class="chartbox" style="height:200px"><canvas id="pf"></canvas></div><div class="mut" style="font-size:11px">Hourly snapshots recorded by the server.</div></div><div class="card"><h3>Bot P&amp;L by day</h3><div class="chartbox" style="height:200px"><canvas id="pl"></canvas></div></div><div class="card"><h3>Asset allocation</h3><div class="gl" id="al" style="height:170px"></div><div class="lg" id="lg" style="margin-top:8px"></div></div></div>
  <div class="grid g2" style="margin-top:14px"><div class="card tw"><h3>Bot catalog comparison</h3><table><thead><tr><th>Bot</th><th>Strategy</th><th>Risk</th><th class="r">Weekly</th><th class="r">Min alloc</th></tr></thead><tbody>${bots.map(b=>`<tr><td>${esc(b.name)}</td><td>${esc(STRAT[b.strategy]||b.strategy)}</td><td>${b.risk}</td><td class="num r">${num(b.price_weekly)}</td><td class="num r">${num(b.min_allocation)}</td></tr>`).join('')}</tbody></table><div class="mut" style="font-size:11px;margin-top:6px">Verified performance data is not available yet.</div></div>
  <div class="card"><h3>Market news <a class="btn sm" href="#/news">All</a></h3>${news.length?news.map(n=>`<div class="kv"><span style="color:var(--text)">${esc(n.title)}</span><span>${esc(n.source||'')}</span></div>`).join(''):empty('No news published yet')}</div></div>`;
  const ch=new CandleChart($('#ac'),{tf,rsi:true,macd:true});onLeave(()=>ch.destroy());let g3=null;
  const summary=()=>{const d=ch.data;if(d.length<60)return;const c=d.map(x=>x.c),m20=sma(c,20).pop(),m50=sma(c,50).pop(),r=rsi(c).pop(),rr=c.slice(1).map((x,i)=>x/c[i]-1),vv=stdev(rr.slice(-48))*100,t=Market.tickers[sym],mh=macd(c).h.pop();
    $('#sm').innerHTML=`<p style="margin-top:0">${sym} trades at <b>${fmtPrice(t.price)}</b> (${pct(t.change24h)} over 24h). The 20-period average is ${m20>m50?'above':'below'} the 50-period average. RSI(14) is <b>${nf(r,0)}</b> (${r>70?'overbought zone':r<30?'oversold zone':'neutral zone'}); the MACD histogram is ${mh>=0?'positive':'negative'}. Per-candle volatility is ${nf(vv,2)}%.</p><div class="mut" style="font-size:12px">Generated by rules from ${d.length} ${tf} candles (public data). It describes the past; it is not a forecast or advice.</div>`};
  const load=async()=>{try{ch.o.tf=tf;ch.set(await Market.klines(sym,tf));summary();try{const b=await Market.book(sym);depthChart($('#dp'),b.bids,b.asks)}catch{}}catch(e){toast('Chart data failed: '+e.message,'bad')}};load();
  $('#ap').onchange=e=>{sym=e.target.value;LS.set('novatrade.apair',sym);load();if(mode==='3d')set3d()};$('#atf').onclick=e=>{if(!e.target.dataset.t)return;tf=e.target.dataset.t;$$('#atf button').forEach(b=>b.classList.toggle('on',b.dataset.t===tf));load();if(mode==='3d')set3d()};
  $('#ai2').onclick=e=>{const i=e.target.dataset.i;if(!i)return;ch.o[i]=!ch.o[i];e.target.classList.toggle('on',ch.o[i]);ch.draw()};
  const set3d=()=>{g3&&g3.destroy();g3=sceneCandles($('#a3'),()=>Market.cache[sym+'|'+tf])};
  $('#vm').onclick=e=>{const m=e.target.dataset.m;if(!m)return;mode=m;$$('#vm button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));$('#ac').style.display=m==='2d'?'':'none';$('#a3').style.display=m==='3d'?'':'none';if(m==='3d')set3d();else{g3&&g3.destroy();g3=null;ch.draw()}};
  const it=bal.filter(b=>b.usd>0);const tt=it.reduce((a,i)=>a+i.usd,0)||1;sceneRing($('#al'),()=>it.map(i=>({v:i.usd})));$('#lg').innerHTML=it.length?it.map((i,n)=>`<div><span><i style="background:${palCss[n%8]}"></i>${i.coin}</span><span class="num">${nf(i.usd/tt*100,1)}%</span></div>`).join(''):'<div class="mut">No holdings yet.</div>';
  const paint=()=>{lineChart($('#pf'),[{data:vals,color:CC.acc,fill:true}],{fmt:n=>'$'+nf(n,0),empty:'Snapshots appear after your first deposit'});barChart($('#pl'),dk.map(k=>days[k]),n=>'$'+nf(n,2))};paint();const ro=new ResizeObserver(paint);ro.observe(v);onLeave(()=>ro.disconnect());onLeave(Market.sub(()=>ch.update()));
});

/* ============ activity ============ */
pages.activity=v=>guard(v,async()=>{
  const st={page:1,size:15,type:'',status:'',coin:'',from:'',to:'',items:[]};
  v.innerHTML=head('Activity','Every entry comes from the server',`<button class="btn" id="ex">Export CSV</button>`)+`<div id="nt">${notice()}</div><div class="card"><div class="row" id="fl" style="margin-bottom:10px">
   <select data-k="type" aria-label="Type"><option value="">All types</option>${['deposit','withdrawal','conversion','order','trade','bot','rental','fee','adjustment'].map(x=>`<option>${x}</option>`).join('')}</select>
   <select data-k="status" aria-label="Status"><option value="">All statuses</option>${['pending','completed','failed','cancelled','rejected'].map(x=>`<option>${x}</option>`).join('')}</select>
   <select data-k="coin" aria-label="Coin"><option value="">All coins</option>${['USDT',...Market.coins].map(x=>`<option>${x}</option>`).join('')}</select>
   <input type="date" data-k="from" aria-label="From date" style="width:150px"><input type="date" data-k="to" aria-label="To date" style="width:150px"></div><div id="at" class="tw"></div><div class="row between" style="margin-top:10px" id="pg"></div></div>`;
  const q=(extra='')=>{let s='select=*&order=created_at.desc';if(st.type)s+='&type=eq.'+enc(st.type);if(st.status)s+='&status=eq.'+enc(st.status);if(st.coin)s+='&coin=eq.'+enc(st.coin);if(st.from)s+='&created_at=gte.'+enc(new Date(st.from).toISOString());if(st.to)s+='&created_at=lte.'+enc(new Date(new Date(st.to).getTime()+864e5-1).toISOString());return s+extra};
  const load=async()=>{$('#at').innerHTML=skeleton(5);try{const r=await sel('activity',q(`&limit=${st.size}&offset=${(st.page-1)*st.size}`),{count:true});st.items=r.data;const total=r.count??r.data.length,pgs=Math.max(1,Math.ceil(total/st.size));
    $('#at').innerHTML=r.data.length?`<table><thead><tr><th>Time</th><th>Type</th><th>Coin</th><th class="r">Amount</th><th>Status</th><th>ID</th></tr></thead><tbody>${r.data.map(a=>`<tr class="click" data-id="${a.id}" tabindex="0"><td>${dt(a.created_at)}</td><td>${esc(a.type)}</td><td>${esc(a.coin)}</td><td class="num r">${fmtAmt(num(a.amount),a.coin)}</td><td>${badge(a.status)}</td><td class="mono mut">${esc(a.id.slice(0,8))}</td></tr>`).join('')}</tbody></table>`:empty('No matching activity','Try widening your filters.');
    $('#pg').innerHTML=`<span class="mut">${total} entries</span><div class="row"><button class="btn sm" id="pv" ${st.page<=1?'disabled':''}>Prev</button><span>Page ${st.page} / ${pgs}</span><button class="btn sm" id="nx" ${st.page>=pgs?'disabled':''}>Next</button></div>`;$('#pv').onclick=()=>{st.page--;load()};$('#nx').onclick=()=>{st.page++;load()}}catch(e){$('#at').innerHTML=errBox(e.message);$('[data-act=retry]',$('#at')).onclick=load}};
  $('#fl').onchange=e=>{const k=e.target.dataset.k;if(!k)return;st[k]=e.target.value;st.page=1;load()};
  $('#at').onclick=e=>{const tr=e.target.closest('tr[data-id]');if(!tr)return;const a=st.items.find(x=>x.id===tr.dataset.id);modal({title:'Transaction details',body:kv([['ID',`<span class="mono">${esc(a.id)}</span>`],['Type',esc(a.type)],['Coin',esc(a.coin)],['Amount',fmtAmt(num(a.amount),a.coin)],['Status',badge(a.status)],['Time',dt(a.created_at)],['Reference',`<span class="mono">${esc(a.ref||'—')}</span>`],['Details',esc(a.detail||'—')]]),actions:[{label:'Close'}]})};
  $('#ex').onclick=async e=>{e.target.disabled=true;try{const r=await sel('activity',q('&limit=1000'));download('activity.csv',csv(['id','created_at','type','coin','amount','status','ref','detail'],r))}catch(er){toast(er.message,'bad')}finally{e.target.disabled=false}};load();onData(['activity'],load);
});

/* ============ notifications ============ */
pages.notifications=v=>guard(v,async()=>{
  let n=await sel('notifications','select=*&order=created_at.desc&limit=100'),pf=(await sel('notification_prefs','select=*'))[0]||{push:false,email:true,telegram:false,types:{}};
  const ico={deposits:'down',withdrawals:'up',orders:'trade',ai:'ai',rentals:'bot',alerts:'bell',security:'shield'};
  const paint=()=>{v.innerHTML=head('Notifications','Account, trading and security events',`<button class="btn" id="mr">Mark all read</button>`)+`<div id="nt">${notice()}</div><div class="grid g2"><div class="card">${n.length?n.map(x=>`<div class="item" style="opacity:${x.read?.6:1}"><div class="ic">${ic(ico[x.type]||'bell')}</div><div class="grow"><b>${esc(x.title)}</b><div class="mut">${esc(x.message)}</div></div><div class="mut" style="font-size:11px">${dt(x.created_at)}</div></div>`).join(''):empty('No notifications yet')}</div>
   <div class="card"><h3>Preferences</h3><form id="pfm"><div class="banner" style="font-size:12px">In-app notifications are always on. Push, email and Telegram delivery need a server delivery integration that is not connected yet; your choices are saved for when it is.</div>${[['push','Push notifications'],['email','Email'],['telegram','Telegram']].map(([k,l])=>`<label class="chk f"><input type="checkbox" data-c="${k}" ${pf[k]?'checked':''}>${l}</label>`).join('')}<div class="mut" style="margin:6px 0">Event types</div>${['deposits','withdrawals','orders','ai','rentals','alerts','security'].map(k=>`<label class="chk f"><input type="checkbox" data-t="${k}" ${(pf.types||{})[k]!==false?'checked':''}>${k}</label>`).join('')}<button class="btn pri">Save preferences</button></form></div></div>`;
    $('#mr').onclick=async()=>{try{await rpc('mark_notifications_read',{p_ids:null});n=await sel('notifications','select=*&order=created_at.desc&limit=100');paint();refreshUnread()}catch(e){toast(e.message,'bad')}};
    $('#pfm').onsubmit=async e=>{e.preventDefault();const t={};$$('#pfm [data-t]').forEach(i=>t[i.dataset.t]=i.checked);const g=k=>$(`#pfm [data-c=${k}]`).checked;try{await rpc('save_notification_prefs',{p_push:g('push'),p_email:g('email'),p_telegram:g('telegram'),p_types:t});toast('Preferences saved')}catch(er){toast(er.message,'bad')}}};paint();
  onData(['notifications'],async()=>{n=await sel('notifications','select=*&order=created_at.desc&limit=100');paint();refreshUnread()},20000);
});

/* ============ news ============ */
pages.news=v=>guard(v,async()=>{const n=await sel('news','select=*&order=published_at.desc&limit=40');
  v.innerHTML=head('News','Market headlines published by the platform')+`<div class="card">${n.length?n.map(x=>`<div class="item"><div class="ic">${ic('news')}</div><div class="grow">${/^https?:\/\//.test(x.url||'')?`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(x.title)}</b></a>`:`<b>${esc(x.title)}</b>`}<div class="mut">${esc(x.source||'')}</div></div><div class="mut" style="font-size:11px">${dt(x.published_at)}</div></div>`).join(''):empty('No news published yet','Administrators can publish headlines from the admin console.')}</div>`});

/* ============ account & security ============ */
pages.account=v=>guard(v,async()=>{
  const[kycr,logins]=await Promise.all([sel('profiles',`id=eq.${App.user.id}&select=kyc_status,display_name`),sel('login_events','select=*&order=created_at.desc&limit=8')]);const kyc=kycr[0]?.kyc_status||'unverified',f=AuthApi.totp(App.user);
  v.innerHTML=head('Settings','Profile, security and verification')+`<div id="nt">${notice()}</div><div class="grid g2"><div class="col">
  <div class="card"><h3>Profile</h3><form id="pfm" class="row nw"><div class="grow"><label for="dn">Display name</label><input id="dn" maxlength="40" value="${esc(kycr[0]?.display_name||'')}"></div><button class="btn" style="align-self:flex-end">Save</button></form>${kv([['Email',esc(App.user.email)],['User ID',`<span class="mono">${esc(App.user.id)}</span>`]])}</div>
  <div class="card"><h3>Two-factor authentication ${f?badge('active'):badge('unverified')}</h3><p class="mut" style="margin-top:0">${f?'Your authenticator app is required at sign-in and for every withdrawal.':'Add an authenticator app (TOTP). Once enabled it is required at sign-in and for withdrawals.'}</p><div id="mfa">${f?'<button class="btn danger" id="m-off">Disable 2FA</button>':'<button class="btn pri" id="m-on">Set up 2FA</button>'}</div></div>
  <div class="card"><h3>Identity verification ${badge(kyc)}</h3><p class="mut" style="margin-top:0">Daily withdrawal limit: ${kyc==='verified'?'50,000':'500'} USD-equivalent. ${kyc==='unverified'||kyc==='rejected'?'Submit for review to raise your limit.':kyc==='review'?'Your submission is under review.':''}</p><button class="btn" id="kb" ${['unverified','rejected'].includes(kyc)?'':'disabled'}>Request verification</button></div>
  <div class="card"><h3>Change password</h3><form id="pw" class="f"><input id="np" type="password" autocomplete="new-password" placeholder="New password (10+ characters)" aria-label="New password"><div class="err" id="pe"></div><button class="btn" style="margin-top:8px">Update password</button></form></div></div>
  <div class="col"><div class="card"><h3>Sessions</h3><p class="mut" style="margin-top:0">You are signed in on this device. Signing out of other devices revokes their access.</p><div class="row"><button class="btn" id="so">Sign out other devices</button><button class="btn danger" id="sa">Sign out everywhere</button></div></div>
  <div class="card"><h3>Login activity</h3>${logins.length?`<table><tbody>${logins.map(l=>`<tr><td>${dt(l.created_at)}</td><td style="max-width:260px;overflow:hidden;text-overflow:ellipsis">${esc(l.device||'Unknown device')}</td></tr>`).join('')}</tbody></table>`:empty('No sign-ins recorded')}</div>
  <div class="card"><h3>Exchange API connections</h3><div class="banner warn" style="margin:0">Not available. This platform runs in ledger mode and has no external exchange connector, so there is nothing to connect and no API keys are accepted or stored.</div></div>
  <div class="card"><h3>Security alerts</h3><p class="mut" style="margin-top:0">Security events (sign-ins, withdrawals, 2FA changes) appear in your notifications.</p><a class="btn" href="#/notifications">View notifications</a></div></div></div>`;
  $('#pfm').onsubmit=async e=>{e.preventDefault();try{await rpc('update_profile',{p_display_name:$('#dn').value});App.profile=(await sel('profiles',`id=eq.${App.user.id}&select=*`))[0];paintChrome();toast('Profile updated')}catch(er){toast(er.message,'bad')}};
  $('#kb').onclick=async()=>{try{await rpc('start_kyc');toast('Verification requested');pages.account(v)}catch(er){toast(er.message,'bad')}};
  $('#pw').onsubmit=async e=>{e.preventDefault();const p=$('#np').value;$('#pe').textContent=p.length<10?'Use at least 10 characters.':'';if(p.length<10)return;try{await AuthApi.setPassword(p);$('#np').value='';toast('Password updated')}catch(er){$('#pe').textContent=er.message}};
  $('#so').onclick=async()=>{await AuthApi.logout('others');toast('Other devices signed out')};$('#sa').onclick=async()=>{await AuthApi.logout('global');signedOut()};
  if($('#m-on'))$('#m-on').onclick=async()=>{try{const r=await AuthApi.enroll();$('#mfa').innerHTML=`<div class="banner" style="font-size:12px">Scan the QR code with your authenticator app, or enter the key manually, then type the 6-digit code.</div><div style="background:#fff;padding:8px;border-radius:12px;display:inline-block"><img alt="2FA QR code" width="170" height="170" src="${esc(r.totp.qr_code)}"></div><div class="mono" style="word-break:break-all;margin:8px 0">${esc(r.totp.secret)}</div><div class="row nw"><input id="mc" inputmode="numeric" maxlength="6" placeholder="123456" aria-label="Authenticator code"><button class="btn pri" id="mv">Verify</button></div><div class="err" id="me"></div>`;
    $('#mv').onclick=async()=>{try{await AuthApi.challengeVerify(r.id,$('#mc').value.trim());App.user=await AuthApi.user();toast('Two-factor authentication enabled');pages.account(v)}catch(er){$('#me').textContent=er.message}}}catch(er){$('#mfa').insertAdjacentHTML('beforeend',`<div class="err">${esc(er.message)}</div>`)}};
  if($('#m-off'))$('#m-off').onclick=()=>modal({title:'Disable two-factor authentication?',body:'Your account and withdrawals will be less protected.',actions:[{label:'Keep it on'},{label:'Disable',cls:'danger',fn:async()=>{try{await AuthApi.unenroll(f.id);App.user=await AuthApi.user();toast('2FA disabled');pages.account(v)}catch(er){toast(er.message,'bad');return false}}}]});
});

/* ---- 60-admin.js ---- */
/* ============ admin console (every mutation is an admin RPC that re-checks is_admin() on the server) ============ */
const ADM_TITLES={overview:'Platform overview',stats:'Statistics',events:'Live events',feed:'Market feed',users:'Users & accounts',withdrawals:'Withdrawal review',deposits:'Deposits & addresses',bots:'Bot catalog',coins:'Coins & networks',fees:'Fees & limits',transactions:'Transaction monitor',orders:'Order monitor',health:'Integration health',jobs:'Failed jobs',audit:'Audit trail',news:'News'};

/* tiny dependency-free SVG charts (CSP allows no external libs) */
const nfmt=n=>Math.abs(n)>=1e6?(n/1e6).toFixed(1)+'M':Math.abs(n)>=1e3?(n/1e3).toFixed(1)+'k':(+n).toFixed(n%1?2:0);
const chartSvg=(labels,series,o={})=>{const W=640,H=o.h||190,L=44,R=8,T=10,B=22,n=labels.length;if(!n)return'<div class="mut">No data yet</div>';
  const all=series.flatMap(s=>s.v.map(Number)),mx=Math.max(1e-9,...all),mn=o.bars?0:Math.min(...all)-(o.pad??0),y=v=>T+(H-T-B)*(1-(v-mn)/((mx-mn)||1)),x=i=>L+(W-L-R)*(n===1?.5:i/(n-1));
  const bw=Math.max(2,(W-L-R)/n*.7/(o.stack?1:series.length));
  let g='';for(let i=0;i<=4;i++){const v=mn+(mx-mn)*i/4,yy=y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="var(--line,#2a2a33)" stroke-width="1"/><text x="${L-6}" y="${yy+4}" text-anchor="end" fill="var(--dim,#888)" font-size="10">${nfmt(v)}</text>`}
  const step=Math.ceil(n/7);for(let i=0;i<n;i+=step)g+=`<text x="${x(i)}" y="${H-6}" text-anchor="middle" fill="var(--dim,#888)" font-size="10">${esc(String(labels[i]).slice(5))}</text>`;
  series.forEach((s,k)=>{const c=s.c||'#ffc72c';if(o.bars){s.v.forEach((v,i)=>{const bx=x(i)-bw*series.length/2+k*bw,y0=y(0),y1=y(+v);g+=`<rect x="${bx.toFixed(1)}" y="${Math.min(y0,y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(y0-y1).toFixed(1)}" fill="${c}" rx="1"><title>${esc(labels[i])} · ${esc(s.n)}: ${nfmt(v)}</title></rect>`})}
    else{g+=`<polyline fill="none" stroke="${c}" stroke-width="2" points="${s.v.map((v,i)=>x(i).toFixed(1)+','+y(+v).toFixed(1)).join(' ')}"/>`+s.v.map((v,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(+v).toFixed(1)}" r="6" fill="transparent"><title>${esc(labels[i])} · ${esc(s.n)}: ${nfmt(v)}</title></circle>`).join('')}});
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'chart')}" style="width:100%;height:auto;display:block">${g}</svg>`};
const chartCard=(title,labels,series,o)=>`<div class="card"><h3>${esc(title)}</h3>${chartSvg(labels,series,{...o,label:title})}<div class="row" style="gap:12px;margin-top:6px">${series.map(s=>`<span class="mut"><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${s.c||'#ffc72c'};margin-right:5px"></i>${esc(s.n)}</span>`).join('')}</div></div>`;
const hbars=(obj,c='#ff3d3d')=>{const e=Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]);const m=Math.max(1,...e.map(x=>x[1]));return e.length?e.map(([k,v])=>`<div class="hb"><span>${esc(k)}</span><div><i style="width:${(v/m*100).toFixed(1)}%;background:${c}"></i></div><b class="num">${nfmt(v)}</b></div>`).join(''):'<div class="mut">No data yet</div>'};
const admErr=e=>e.code==='forbidden'||e.status===403?'Administrator access required.':e.message;

pages.admin=(v,rest)=>{
  const s=ADMIN_SECTIONS.includes(rest[0])?rest[0]:'overview';
  if(!App.isAdmin){v.innerHTML=`<div class="card">${empty('Administrator access required','Your account does not have the admin role. The server enforces this on every admin action.')}</div>`;return}
  return guard(v,async()=>{
    const nav=`<div class="tabs" id="at">${ADMIN_SECTIONS.map(x=>`<button data-sec="${x}" class="${x===s?'on':''}">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}</div>`;
    const users=await sel('profiles','select=id,email,display_name,kyc_status,created_at&order=created_at.desc&limit=500').catch(()=>[]);
    const who=Object.fromEntries(users.map(u=>[u.id,u.email||u.display_name||u.id.slice(0,8)]));const W=id=>esc(who[id]||String(id).slice(0,8));
    const draw=html=>{v.innerHTML=head('Admin · '+ADM_TITLES[s],'Every action is authorized and audited by the server')+nav+html;$('#at').onclick=e=>{const x=e.target.dataset.sec;if(x)location.hash='#/admin/'+x}};
    const reload=()=>pages.admin(v,[s]);
    const run=async(fn,ok)=>{try{await fn();toast(ok||'Done');reload();return true}catch(e){toast(admErr(e),'bad');return false}};
    const table=(cols,rows,rowFn)=>rows.length?`<div class="card tw"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(rowFn).join('')}</tbody></table></div>`:`<div class="card">${empty('Nothing here yet')}</div>`;

    if(s==='overview'){
      const o=await rpc('admin_overview'),st=await sel('system_status','select=*').catch(()=>[]);
      const eng=st.find(x=>x.provider==='engine'),ageS=eng?Math.round((Date.now()-new Date(eng.checked_at))/1000):null;
      draw(`<div class="grid g4">${[['Users',o.users,'users'],['Pending withdrawals',o.pending_withdrawals,'withdrawals'],['Active agents',o.active_agents,'stats'],['Active rentals',o.active_rentals,'stats'],['Orders (24h)',o.orders_24h,'orders'],['Volume (24h)',usd(o.volume_24h),'stats'],['Failed jobs (24h)',o.failed_jobs_24h,'jobs'],['Engine',eng?(ageS<180?'<span class="up">running</span>':'<span class="down">stale</span>'):'<span class="down">never ran</span>','feed']].map(c=>`<a href="#/admin/${c[2]}" class="card stat" style="display:block;color:inherit;text-decoration:none"><h3>${c[0]}</h3><div class="v num">${c[1]}</div>${c[0]==='Engine'&&eng?`<div class="s">last run ${ageS}s ago</div>`:''}</a>`).join('')}</div>
      ${!eng||ageS>=180?`<div class="banner bad" style="margin-top:14px"><b>Engine is not running.</b> Limit orders, price alerts and AI agents only progress while the market-feed function is scheduled. See the README (market feed).</div>`:''}`);
      return}


    if(s==='stats'){
      const q=new URLSearchParams(location.hash.split('?')[1]||''),days=+q.get('d')||30,demo=q.get('demo')==='1';
      const st=await rpc('admin_stats',{p_days:days,p_demo:demo}),D=st.days||[],L=D.map(x=>x.d),col=k=>D.map(x=>+x[k]||0),t=st.totals||{};
      draw(`<div class="row" style="margin-bottom:12px;gap:10px"><div class="seg" id="sd">${[7,30,90].map(x=>`<button data-d="${x}" class="${x===days?'on':''}">${x}d</button>`).join('')}</div><div class="seg" id="sm"><button data-m="0" class="${demo?'':'on'}">Real users</button><button data-m="1" class="${demo?'on':''}">Incl. demo</button></div></div>
      <div class="grid g4">${[['Users',t.users],['Order volume',usd(t.volume)],['Fees earned',usd(t.fees)],['Deposits',usd(t.deposits_usd)],['Withdrawals',usd(t.withdrawals_usd)],['Bot trades',t.bot_trades],['Bot P&L',usd(t.bot_pnl)],['Demo accounts',t.demo_users]].map(c=>`<div class="card stat"><h3>${c[0]}</h3><div class="v num">${c[1]??0}</div></div>`).join('')}</div>
      <div class="grid g2" style="margin-top:14px">
      ${chartCard('Sign-ups and sign-ins per day',L,[{n:'Sign-ups',v:col('signups'),c:'#ffc72c'},{n:'Sign-ins',v:col('logins'),c:'#ff3d3d'}],{bars:1})}
      ${chartCard('Orders per day',L,[{n:'Orders',v:col('orders'),c:'#ff3d3d'},{n:'Swaps',v:col('swaps'),c:'#ffc72c'}],{bars:1})}
      ${chartCard('Trading volume (USD)',L,[{n:'Orders',v:col('order_volume'),c:'#ffc72c'},{n:'Swaps',v:col('swap_volume'),c:'#ff3d3d'}])}
      ${chartCard('Fees earned (USD)',L,[{n:'Order fees',v:col('order_fees'),c:'#ffc72c'},{n:'Bot rentals',v:col('rental_revenue'),c:'#ff3d3d'}],{bars:1})}
      ${chartCard('Deposits vs withdrawals (USD)',L,[{n:'Deposits',v:col('deposits'),c:'#26d07c'},{n:'Withdrawals',v:col('withdrawals'),c:'#ff3d3d'}])}
      ${chartCard('Bot activity',L,[{n:'Bot trades',v:col('bot_trades'),c:'#ffc72c'},{n:'Bot P&L',v:col('bot_pnl'),c:'#26d07c'}])}
      </div><div class="grid g3" style="margin-top:14px">
      <div class="card"><h3>Top pairs (orders)</h3>${hbars(Object.fromEntries((st.top_pairs||[]).map(x=>[x.symbol,x.orders])),'#ffc72c')}</div>
      <div class="card"><h3>Orders by status</h3>${hbars(st.orders_by_status)}</div>
      <div class="card"><h3>Withdrawals by status</h3>${hbars(st.withdrawals_by_status)}</div>
      <div class="card"><h3>Verification (KYC)</h3>${hbars(st.kyc,'#26d07c')}</div>
      <div class="card"><h3>Activity by type</h3>${hbars(st.activity_by_type,'#ffc72c')}</div>
      <div class="card"><h3>Bots (trades)</h3>${hbars(Object.fromEntries((st.bots||[]).map(x=>[x.bot,x.trades])))}${(st.bots||[]).length?`<div class="mut" style="margin-top:6px">P&L: ${(st.bots||[]).map(x=>esc(x.bot)+' '+usd(x.pnl)).join(' · ')}</div>`:''}</div>
      </div>`);
      const go=(d,m)=>location.hash=`#/admin/stats?d=${d}&demo=${m}`;
      $('#sd').onclick=e=>{const x=e.target.dataset.d;if(x)go(x,demo?1:0)};$('#sm').onclick=e=>{const x=e.target.dataset.m;if(x!=null)go(days,x)};return}

    if(s==='events'){
      const demo=new URLSearchParams(location.hash.split('?')[1]||'').get('demo')==='1';
      const paint=async()=>{const ev=await rpc('admin_events',{p_limit:150,p_demo:demo});const el=$('#evl');if(!el)return;
        el.innerHTML=table(['Time','Kind','User','What happened'],ev,x=>`<tr><td>${dt(x.ts)}</td><td>${badge(x.kind)}${x.demo?' <span class="mut">demo</span>':''}</td><td>${esc(x.user||'—')}</td><td class="mut" style="white-space:normal;max-width:520px">${esc(x.text||'')}</td></tr>`)};
      draw(`<div class="row" style="margin-bottom:10px;gap:10px"><div class="seg" id="sm"><button data-m="0" class="${demo?'':'on'}">Real users</button><button data-m="1" class="${demo?'on':''}">Incl. demo</button></div><span class="mut">Every deposit, order, swap, bot trade, admin action and sign-in. Refreshes every 10 s.</span></div><div id="evl"></div>`);
      $('#sm').onclick=e=>{const x=e.target.dataset.m;if(x!=null)location.hash='#/admin/events?demo='+x};
      await paint();const t=setInterval(()=>{if(!$('#evl')||!location.hash.startsWith('#/admin/events')){clearInterval(t);return}paint().catch(()=>{})},10000);return}

    if(s==='feed'){
      const [cs,mp,ss]=await Promise.all([sel('coins','select=*&order=kind,symbol').catch(()=>[]),sel('market_prices','select=symbol,price,updated_at,quote_ts').catch(()=>sel('market_prices','select=symbol,price,updated_at')),sel('system_status','select=*').catch(()=>[])]);
      const P=Object.fromEntries(mp.map(x=>[x.symbol,x])),age=u=>u?Math.round((Date.now()-new Date(u))/1000):null;
      const byKind={};cs.forEach(c=>{const p=P[c.symbol+'/USDT']||P[c.symbol];const a=p?age(p.updated_at):null;(byKind[c.kind||'crypto']??={n:0,fresh:0,old:null});const k=byKind[c.kind||'crypto'];k.n++;if(a!=null&&a<=180)k.fresh++;if(a!=null)k.old=Math.max(k.old??0,a)});
      draw(`<div class="grid g4">${Object.entries(byKind).map(([k,x])=>`<div class="card stat"><h3>${esc(k)}</h3><div class="v num">${x.fresh}/${x.n}</div><div class="s">fresh · oldest ${x.old==null?'never':x.old+'s'}</div></div>`).join('')}</div>
      <div class="banner" style="margin:14px 0">Crypto, memecoins and tokenised gold come from Binance; stocks, gold, silver and oil come from Stooq (delayed quotes, market hours only). The feed function runs on the schedule in your database and also runs the order and bot engine.</div>
      ${table(['Provider','State','Detail','Checked'],ss,x=>`<tr><td>${esc(x.provider)}</td><td>${badge(x.status==='ok'&&age(x.checked_at)<180?'active':'review')} ${esc(x.status)}</td><td class="mut">${esc(x.detail||'')}</td><td>${dt(x.checked_at)}</td></tr>`)}
      <div style="height:12px"></div>${table(['Instrument','Kind','Source','Price','Age'],cs,c=>{const p=P[c.symbol+'/USDT']||P[c.symbol],a=p?age(p.updated_at):null;return `<tr><td>${coinIcon(c.symbol)}${esc(c.symbol)}</td><td>${esc(c.kind||'crypto')}</td><td>${esc(c.source||'binance')}</td><td class="num">${p?fmtPrice(num(p.price)):'—'}</td><td class="${a!=null&&a<=180?'up':'down'}">${a==null?'never':a+'s'}</td></tr>`})}`);return}

    if(s==='users'){
      const rows=users;
      draw(`<div class="row" style="margin-bottom:10px"><input id="uq" placeholder="Filter by email or name…" style="max-width:320px" aria-label="Filter users"></div><div id="ut"></div>`);
      const paint=()=>{const q=$('#uq').value.trim().toLowerCase();const r=rows.filter(u=>!q||(u.email||'').toLowerCase().includes(q)||(u.display_name||'').toLowerCase().includes(q));
        $('#ut').innerHTML=table(['User','KYC','Joined',''],r,u=>`<tr><td>${esc(u.email||'—')}<div class="mut mono">${esc(u.id)}</div></td><td>${badge(u.kyc_status)}</td><td>${dt(u.created_at)}</td><td class="r"><button class="btn sm" data-k="${u.id}">KYC</button> <button class="btn sm" data-a="${u.id}">Adjust balance</button></td></tr>`)};
      paint();$('#uq').oninput=paint;
      $('#ut').onclick=e=>{const k=e.target.dataset.k,a=e.target.dataset.a;
        if(k)modal({title:'Set verification status',body:`<div class="f"><label for="ks">Status</label><select id="ks">${['unverified','review','verified','rejected'].map(x=>`<option>${x}</option>`).join('')}</select></div>`,actions:[{label:'Cancel'},{label:'Save',cls:'pri',fn:async()=>{const st=$('#ks').value;return run(()=>rpc('admin_set_kyc',{p_user:k,p_status:st}),'Status updated')}}]});
        if(a)modal({title:'Adjust balance',body:`<div class="mut" style="margin-bottom:10px">${esc(who[a]||a)}. Use a negative amount to debit. A reason is required and is written to the audit log.</div><div class="row" style="flex-wrap:nowrap"><div class="f" style="flex:1"><label for="ac">Coin</label><select id="ac">${['USDT',...Market.coins].map(c=>`<option>${c}</option>`).join('')}</select></div><div class="f" style="flex:1"><label for="aa">Amount</label><input id="aa" inputmode="decimal"></div></div><div class="f"><label for="ar">Reason</label><input id="ar" maxlength="200"></div><div class="err" id="ae"></div>`,
          actions:[{label:'Cancel'},{label:'Apply adjustment',cls:'pri',fn:async()=>{const amt=Number($('#aa').value),why=$('#ar').value.trim();if(!isFinite(amt)||amt===0){$('#ae').textContent='Enter a non-zero amount.';return false}if(!why){$('#ae').textContent='A reason is required.';return false}return run(()=>rpc('admin_adjust_balance',{p_user:a,p_coin:$('#ac').value,p_amount:amt,p_reason:why}),'Balance adjusted')}}]})};
      return}

    if(s==='withdrawals'){
      const st=new URLSearchParams(location.hash.split('?')[1]||'').get('f')||'open';
      const all=await sel('withdrawals','select=*&order=created_at.desc&limit=200');const rows=all.filter(w=>st==='all'||(st==='open'?['pending','processing'].includes(w.status):w.status===st));
      draw(`<div class="row" style="margin-bottom:10px"><div class="seg" id="wf">${['open','completed','rejected','all'].map(x=>`<button data-f="${x}" class="${x===st?'on':''}">${x}</button>`).join('')}</div></div>${table(['Time','User','Amount','Network','Destination','Status',''],rows,w=>`<tr><td>${dt(w.created_at)}</td><td>${W(w.user_id)}</td><td class="num">${fmtAmt(w.amount,w.coin)} ${w.coin}<div class="mut">fee ${w.fee}</div></td><td>${esc(w.network)}</td><td class="mono" style="max-width:220px;overflow:hidden;text-overflow:ellipsis" title="${esc(w.address)}">${esc(w.address)}${w.memo?`<div class="mut">memo ${esc(w.memo)}</div>`:''}</td><td>${badge(w.status)}${w.txid?`<div class="mono mut">${esc(w.txid)}</div>`:''}</td><td class="r">${w.status==='pending'?`<button class="btn sm" data-a="approve" data-id="${w.id}">Approve</button> `:''}${['pending','processing'].includes(w.status)?`<button class="btn sm pri" data-a="complete" data-id="${w.id}">Complete</button> <button class="btn sm danger" data-a="reject" data-id="${w.id}">Reject</button>`:''}</td></tr>`)}`);
      $('#wf').onclick=e=>{const f=e.target.dataset.f;if(f)location.hash='#/admin/withdrawals?f='+f};
      v.onclick=e=>{const a=e.target.dataset.a,id=e.target.dataset.id;if(!a||!id)return;const w=all.find(x=>x.id===id);
        const needTx=a==='complete';modal({title:{approve:'Approve withdrawal',complete:'Mark withdrawal completed',reject:'Reject withdrawal'}[a],body:`${kv([['User',W(w.user_id)],['Amount',`${w.amount} ${w.coin} (${esc(w.network)})`],['To',`<span class="mono" style="word-break:break-all;white-space:normal">${esc(w.address)}</span>`]])}${needTx?`<div class="banner warn" style="margin:10px 0">Send the funds from your custody wallet first, then paste the on-chain transaction hash. Completing deducts the user's balance.</div><div class="f"><label for="tx">Transaction hash</label><input id="tx" autocomplete="off"></div>`:''}${a==='reject'?`<div class="banner" style="margin:10px 0">Rejecting releases the user's locked funds.</div>`:''}<div class="f"><label for="nt2">Note (kept in the audit log)</label><input id="nt2" maxlength="200"></div><div class="err" id="we"></div>`,
          actions:[{label:'Cancel'},{label:'Confirm',cls:a==='reject'?'danger':'pri',fn:async()=>{const tx=needTx?$('#tx').value.trim():null;if(needTx&&!tx){$('#we').textContent='Transaction hash is required.';return false}return run(()=>rpc('admin_review_withdrawal',{p_id:id,p_action:a,p_txid:tx,p_note:$('#nt2').value.trim()||null}),'Withdrawal '+a+(a==='approve'?'d':a==='complete'?'d':'ed'))}}]})};
      return}

    if(s==='deposits'){
      const [deps,nets,addrs]=await Promise.all([sel('deposits','select=*&order=created_at.desc&limit=100'),sel('networks','select=*&order=coin,code'),sel('deposit_addresses','select=*&order=created_at.desc&limit=100')]);
      draw(`<div class="banner">Deposits are credited only after you verify the on-chain transaction in your custody provider. A custody webhook can call <code>admin_credit_deposit</code> with the service role to automate this.</div><div class="row" style="margin:12px 0"><button class="btn pri" id="cd">Credit a deposit</button><button class="btn" id="sa">Assign deposit address</button></div>
      <h3 class="mut" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em">Deposits</h3>${table(['Time','User','Amount','Network','Tx','Status'],deps,d=>`<tr><td>${dt(d.created_at)}</td><td>${W(d.user_id)}</td><td class="num">${fmtAmt(d.amount,d.coin)} ${d.coin}</td><td>${esc(d.network)}</td><td class="mono" style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(d.txid||'—')}</td><td>${badge(d.status)}</td></tr>`)}
      <h3 class="mut" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-top:16px">Issued deposit addresses</h3>${table(['User','Coin','Network','Address'],addrs,a=>`<tr><td>${W(a.user_id)}</td><td>${esc(a.coin)}</td><td>${esc(a.network)}</td><td class="mono">${esc(a.address)}${a.memo?` · memo ${esc(a.memo)}`:''}</td></tr>`)}`);
      const userSel=`<div class="f"><label for="du">User</label><select id="du">${users.map(u=>`<option value="${u.id}">${esc(u.email||u.id)}</option>`).join('')}</select></div>`;
      const netSel=`<div class="row" style="flex-wrap:nowrap"><div class="f" style="flex:1"><label for="dc2">Coin</label><select id="dc2">${[...new Set(nets.map(n=>n.coin))].map(c=>`<option>${c}</option>`).join('')}</select></div><div class="f" style="flex:1"><label for="dn2">Network</label><select id="dn2"></select></div></div>`;
      const wireNet=()=>{const f=()=>{$('#dn2').innerHTML=nets.filter(n=>n.coin===$('#dc2').value).map(n=>`<option value="${n.code}">${esc(n.name)}</option>`).join('')};$('#dc2').onchange=f;f()};
      $('#cd').onclick=()=>{modal({title:'Credit a deposit',body:`${userSel}${netSel}<div class="f"><label for="dq">Amount</label><input id="dq" inputmode="decimal"></div><div class="f"><label for="dx">On-chain transaction id (unique)</label><input id="dx" autocomplete="off"></div><div class="err" id="de"></div>`,
        actions:[{label:'Cancel'},{label:'Credit',cls:'pri',fn:async()=>{const amt=Number($('#dq').value),tx=$('#dx').value.trim();if(!(amt>0)){$('#de').textContent='Enter an amount.';return false}if(!tx){$('#de').textContent='Transaction id is required.';return false}
          try{await rpc('admin_credit_deposit',{p_user:$('#du').value,p_coin:$('#dc2').value,p_network:$('#dn2').value,p_amount:amt,p_txid:tx});toast('Deposit credited');reload();return true}catch(e){$('#de').textContent=admErr(e);return false}}}]});wireNet()};
      $('#sa').onclick=()=>{modal({title:'Assign deposit address',body:`<div class="mut" style="margin-bottom:10px">Use an address generated by your custody provider for this user. Users only ever see addresses stored here.</div>${userSel}${netSel}<div class="f"><label for="da">Address</label><input id="da" autocomplete="off" spellcheck="false"></div><div class="f"><label for="dm">Memo / tag (if required)</label><input id="dm"></div><div class="err" id="de"></div>`,
        actions:[{label:'Cancel'},{label:'Save address',cls:'pri',fn:async()=>{const a=$('#da').value.trim(),n=nets.find(x=>x.coin===$('#dc2').value&&x.code===$('#dn2').value);if(!a||!n||!new RegExp(n.address_regex).test(a)){$('#de').textContent='That does not look like a valid '+(n?.name||'')+' address.';return false}
          try{await rpc('admin_set_deposit_address',{p_user:$('#du').value,p_coin:n.coin,p_network:n.code,p_address:a,p_memo:$('#dm').value.trim()||null});toast('Address saved');reload();return true}catch(e){$('#de').textContent=admErr(e);return false}}}]});wireNet()};
      return}

    if(s==='bots'){
      const b=await sel('bots','select=*&order=sort');
      draw(`<div class="banner">Plan prices and risk parameters live in the <code>bots</code> table. Edit them in Supabase; availability can be toggled here.</div>${table(['Bot','Strategy','Risk','Daily / weekly / monthly','Min allocation','Status',''],b,x=>`<tr><td><b>${esc(x.name)}</b><div class="mut">${esc(x.id)}</div></td><td>${esc(x.strategy)}</td><td>${esc(x.risk)}</td><td class="num">${x.price_daily} / ${x.price_weekly} / ${x.price_monthly} USDT</td><td class="num">${x.min_allocation} USDT</td><td>${badge(x.available?'active':'paused')}</td><td class="r"><button class="btn sm" data-b="${x.id}" data-v="${x.available?0:1}">${x.available?'Disable':'Enable'}</button></td></tr>`)}`);
      v.onclick=e=>{const id=e.target.dataset.b;if(id)run(()=>rpc('admin_set_bot_available',{p_bot:id,p_available:e.target.dataset.v==='1'}),'Bot updated')};return}

    if(s==='coins'){
      const n=await sel('networks','select=*&order=coin,code');
      draw(`${table(['Coin','Network','Min deposit','Confirmations','Fee','Min / max withdraw','Deposits','Withdrawals'],n,x=>`<tr><td>${coinIcon(x.coin)}${esc(x.coin)}</td><td>${esc(x.name)}</td><td class="num">${x.min_deposit}</td><td class="num">${x.confirmations}</td><td class="num">${x.withdraw_fee}</td><td class="num">${x.min_withdraw} / ${x.max_withdraw}</td><td><button class="btn sm ${x.deposit_enabled?'':'danger'}" data-n="${x.id}" data-t="d">${x.deposit_enabled?'enabled':'disabled'}</button></td><td><button class="btn sm ${x.withdraw_enabled?'':'danger'}" data-n="${x.id}" data-t="w">${x.withdraw_enabled?'enabled':'disabled'}</button></td></tr>`)}`);
      v.onclick=e=>{const id=e.target.dataset.n;if(!id)return;const x=n.find(q=>String(q.id)===id),d=e.target.dataset.t==='d'?!x.deposit_enabled:x.deposit_enabled,w=e.target.dataset.t==='w'?!x.withdraw_enabled:x.withdraw_enabled;run(()=>rpc('admin_set_network',{p_id:+id,p_deposit:d,p_withdraw:w}),'Network updated')};return}

    if(s==='fees'){
      const st=await sel('settings','select=key,value&order=key');const hint={spot_fee_rate:'Spot trading fee as a fraction (0.001 = 0.10%)',swap_fee_rate:'Swap fee as a fraction',min_order_usdt:'Minimum spot order value (USDT)',min_swap_usd:'Minimum swap value (USD)',price_max_age_seconds:'Prices older than this are treated as offline and trading pauses'};
      draw(`${table(['Setting','Value','Meaning',''],st,x=>`<tr><td class="mono">${esc(x.key)}</td><td class="num"><input data-k="${esc(x.key)}" value="${esc(x.value)}" style="width:120px" inputmode="decimal" aria-label="${esc(x.key)}"></td><td class="mut">${esc(hint[x.key]||'')}</td><td><button class="btn sm pri" data-s="${esc(x.key)}">Save</button></td></tr>`)}`);
      v.onclick=e=>{const k=e.target.dataset.s;if(!k)return;const val=$(`input[data-k="${k}"]`).value.trim();if(!/^\d+(\.\d+)?$/.test(val))return toast('Enter a positive number','bad');run(()=>rpc('admin_set_setting',{p_key:k,p_value:val}),'Setting saved')};return}

    if(s==='transactions'){const a=await sel('activity','select=*&order=created_at.desc&limit=150');
      draw(`<div class="row" style="margin-bottom:10px"><button class="btn" id="ex">Export CSV</button></div>${table(['Time','User','Type','Coin','Amount','Status','Detail'],a,x=>`<tr><td>${dt(x.created_at)}</td><td>${W(x.user_id)}</td><td>${esc(x.type)}</td><td>${esc(x.coin)}</td><td class="num">${fmtAmt(x.amount,x.coin)}</td><td>${badge(x.status)}</td><td class="mut" style="max-width:260px;overflow:hidden;text-overflow:ellipsis">${esc(x.detail||'')}</td></tr>`)}`);
      $('#ex').onclick=()=>download('transactions.csv',csv(['id','created_at','user_id','type','coin','amount','status','ref','detail'],a));return}

    if(s==='orders'){const o=await sel('orders','select=*&order=created_at.desc&limit=150');
      draw(table(['Time','User','Pair','Side','Type','Price','Amount','Status'],o,x=>`<tr><td>${dt(x.created_at)}</td><td>${W(x.user_id)}</td><td>${esc(x.symbol)}</td><td class="${x.side==='buy'?'up':'down'}">${x.side}</td><td>${x.type}</td><td class="num">${fmtPrice(num(x.filled_price||x.price))}</td><td class="num">${x.amount}</td><td>${badge(x.status)}</td></tr>`));return}

    if(s==='health'){
      const [st,mp]=await Promise.all([sel('system_status','select=*').catch(()=>[]),sel('market_prices','select=symbol,updated_at')]);
      const newest=mp.reduce((m,x)=>Math.max(m,new Date(x.updated_at)),0),age=newest?Math.round((Date.now()-newest)/1000):null,lim=Settings.price_max_age_seconds;
      const rows=[['Market price feed',age==null?'down':age<=lim?'ok':'stale',age==null?'No prices have ever been written':`Newest price ${age}s old (limit ${lim}s)`],...st.map(x=>[x.provider,x.status==='ok'&&(Date.now()-new Date(x.checked_at))<180000?'ok':'stale',`${x.detail||''} · checked ${dt(x.checked_at)}`])];
      draw(table(['Integration','State','Detail'],rows,r=>`<tr><td>${esc(r[0])}</td><td>${badge(r[1]==='ok'?'active':r[1]==='stale'?'review':'failed')} ${esc(r[1])}</td><td class="mut">${esc(r[2])}</td></tr>`)+`<div class="banner" style="margin-top:14px">Custody provider, email and Telegram delivery are not connected to this platform. Deposits and withdrawals are reviewed manually in the sections above.</div>`);return}

    if(s==='jobs'){const j=await sel('job_runs','select=*&order=created_at.desc&limit=100');
      draw(table(['Time','Job','Status','Error'],j,x=>`<tr><td>${dt(x.created_at)}</td><td>${esc(x.job)}</td><td>${badge(x.status==='failed'?'failed':'completed')}</td><td class="mut" style="white-space:normal;max-width:520px">${esc(x.error||'')}</td></tr>`));return}

    if(s==='audit'){const a=await sel('audit_log','select=*&order=created_at.desc&limit=200');
      draw(table(['Time','Actor','Action','Target','Detail'],a,x=>`<tr><td>${dt(x.created_at)}</td><td>${W(x.actor)}</td><td>${esc(x.action)}</td><td class="mono">${esc(x.target||'')}</td><td class="mono mut" style="white-space:normal;max-width:380px">${esc(JSON.stringify(x.detail||{}))}</td></tr>`));return}

    if(s==='news'){const n=await sel('news','select=*&order=published_at.desc&limit=50');
      draw(`<div class="card"><form id="nf" class="col"><div class="f"><label for="nt3">Headline</label><input id="nt3" maxlength="160"></div><div class="f"><label for="ns">Source</label><input id="ns" maxlength="60"></div><div class="f"><label for="nu">Link (optional, https://)</label><input id="nu"></div><div class="err" id="ne"></div><button class="btn pri">Publish</button></form></div><div style="height:12px"></div>${table(['Published','Headline','Source',''],n,x=>`<tr><td>${dt(x.published_at)}</td><td style="white-space:normal">${esc(x.title)}</td><td>${esc(x.source||'')}</td><td class="r"><button class="btn sm danger" data-d="${x.id}">Delete</button></td></tr>`)}`);
      $('#nf').onsubmit=async e=>{e.preventDefault();const t=$('#nt3').value.trim(),u=$('#nu').value.trim();if(!t)return $('#ne').textContent='Headline is required.';if(u&&!/^https:\/\//.test(u))return $('#ne').textContent='Links must start with https://';
        run(()=>ins('news',{title:t,source:$('#ns').value.trim()||null,url:u||null}),'Published')};
      v.onclick=e=>{const d=e.target.dataset.d;if(d)run(()=>del('news','id=eq.'+enc(d)),'Deleted')};return}
  });
};

/* ---- 90-boot.js ---- */
/* ============ boot ============ */
(function boot(){
  if(!CFG.url||!CFG.key){
    $('#root').innerHTML=`<div class="auth"><div class="card"><div class="brand"><div class="logo"><svg viewBox="0 0 32 32"><path d="M16 5l9 21h-4.6l-1.9-4.6h-5.0L11.6 26H7z"/></svg></div>NovaTrade</div><h1>Configuration missing</h1><p class="mut">Set your Supabase project URL and public (anon) key in <code>config.js</code>, then reload.</p></div></div>`;return}
  Market.init().catch(e=>console.warn('market init',e));
  route();
  setInterval(()=>{if(Auth.tok&&!document.hidden)refreshUnread()},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Auth.tok)Market.poll().catch(()=>{})});
})();

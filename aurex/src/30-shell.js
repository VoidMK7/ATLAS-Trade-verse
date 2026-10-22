/* ============ app shell, router, auth screens ============ */
const go=h=>{if(location.hash===h)route();else location.hash=h};
const App={user:null,profile:null,isAdmin:false,cleanups:[],shell:false,unread:0};
const pages={};
const onLeave=f=>App.cleanups.push(f);
function onData(tables,fn,every=0){let to;const run=()=>{clearTimeout(to);to=setTimeout(()=>fn(),350)};const off=Bus.on('table',t=>{if(!tables||tables.includes(t))run()});onLeave(off);onLeave(()=>clearTimeout(to));
  if(every){const iv=setInterval(()=>{if(!document.hidden)fn()},every);onLeave(()=>clearInterval(iv))}}
const NAV=[['dashboard','Dashboard','dash'],['exchange','Trade','trade'],['ai','AI Trading','ai'],['bots','Bots','bot'],['wallet','Wallet','wallet'],['swap','Swap','swap'],['analytics','Analytics','chart'],['activity','Activity','list'],['news','News','news'],['account','Settings','gear']];
const ADMIN_SECTIONS=['overview','users','withdrawals','deposits','bots','coins','fees','transactions','orders','health','jobs','audit','news'];
const favs=()=>LS.get('novatrade.fav',['BTC/USDT','ETH/USDT','SOL/USDT']);
const toggleFav=s=>{const f=favs(),i=f.indexOf(s);i<0?f.push(s):f.splice(i,1);LS.set('novatrade.fav',f)};
const displayName=()=>App.profile?.display_name||(App.user?.email||'Trader').split('@')[0];
async function guard(view,fn){view.innerHTML=`<div class="card">${skeleton(6)}</div>`;try{await fn()}catch(e){console.error(e);view.innerHTML=errBox(e.message||'Unexpected error');const b=$('[data-act=retry]',view);if(b)b.onclick=()=>guard(view,fn)}}
const head=(t,s,right='')=>`<div class="row between" style="margin-bottom:16px"><div class="grow"><h1>${t}</h1><div class="mut">${s||''}</div></div>${right}</div>`;
function feedPill(){const live=Market.serverLive,any=Object.keys(Market.tickers).length;return live?`<i class="dot"></i><span>Live prices</span>`:any?`<i class="dot w"></i><span>Reference prices · trading paused</span>`:`<i class="dot d"></i><span>Market data offline</span>`}
const notice=()=>{let h='';if(Backend.missing)h+=`<div class="banner bad"><b>Setup required.</b> The trading backend functions are not installed on this Supabase project, so orders, swaps, withdrawals, bots and the AI agent are disabled. Run <code>supabase/migrations/002_trading_logic.sql</code> (see README).</div>`;
  else if(!Market.serverLive&&Object.keys(Market.tickers).length)h+=`<div class="banner warn"><b>Trading prices are offline.</b> The server price feed has not reported recently. You are seeing reference market data, which cannot be traded. Orders, swaps and bot actions will be rejected until the feed is running.</div>`;return h};
function renderShell(){
  $('#root').innerHTML=`<div id="app"><aside id="side" aria-label="Main navigation"><div class="brand"><div class="logo"><svg viewBox="0 0 32 32"><path d="M16 5l9 21h-4.6l-1.9-4.6h-5.0L11.6 26H7z"/></svg></div>NovaTrade</div>
  <nav class="nav" id="nav"></nav><div class="foot">Digital assets are volatile. Only trade what you can afford to lose.</div></aside>
  <div id="main"><header id="top"><button class="btn sm" id="menu" aria-label="Open menu">${ic('menu')}</button>
  <div class="search"><span>${ic('search')}</span><input id="sq" placeholder="Search coins, pairs, markets…" aria-label="Search markets" autocomplete="off"><div id="sres"></div></div><div class="grow"></div>
  <span class="pill hide-m" id="feed"></span><a class="btn sm" href="#/notifications" id="nb" aria-label="Notifications">${ic('bell')}<span id="nc"></span></a>
  <a href="#/account" class="avatar" id="av" aria-label="Account" title="Account"></a><button class="btn sm" id="lo" aria-label="Sign out">${ic('logout')}</button></header><main id="view" tabindex="-1"></main></div></div>
  <nav id="bnav" aria-label="Quick navigation">${[['dashboard','Home','dash'],['exchange','Trade','trade'],['swap','Swap','swap'],['wallet','Wallet','wallet'],['ai','AI','ai']].map(n=>`<a href="#/${n[0]}" data-r="${n[0]}">${ic(n[2])}${n[1]}</a>`).join('')}</nav>`;
  App.shell=true;$('#menu').onclick=()=>$('#side').classList.toggle('open');$('#side').onclick=e=>{if(e.target.closest('a'))$('#side').classList.remove('open')};
  $('#lo').onclick=async()=>{await AuthApi.logout('local');signedOut()};
  const sq=$('#sq'),sr=$('#sres');sq.oninput=()=>{const q=sq.value.trim().toUpperCase();if(!q){sr.style.display='none';return}const r=Object.values(Market.tickers).filter(t=>t.symbol.includes(q)||(t.name||'').toUpperCase().includes(q)).slice(0,8);
    sr.innerHTML=r.length?r.map(t=>`<a href="#/exchange/${t.symbol.replace('/','-')}"><span>${coinIcon(t.base)}${t.symbol}</span><span class="num">${fmtPrice(t.price)}</span></a>`).join(''):'<div class="empty">No matches</div>';sr.style.display='block'};
  document.addEventListener('click',e=>{if(!e.target.closest('.search'))sr.style.display='none'});sr.onclick=()=>{sr.style.display='none';sq.value=''};
  paintNav();paintChrome();
}
function paintNav(){const nav=$('#nav');if(!nav)return;nav.innerHTML=NAV.map(n=>`<a href="#/${n[0]}" data-r="${n[0]}">${ic(n[2])}${n[1]}</a>`).join('')+(App.isAdmin?`<small>Staff</small><a href="#/admin/overview" data-r="admin">${ic('admin')}Admin</a>`:'');markNav()}
function paintChrome(){const f=$('#feed');if(f)f.innerHTML=feedPill();const av=$('#av');if(av)av.textContent=displayName().slice(0,1).toUpperCase();const nc=$('#nc');if(nc)nc.textContent=App.unread?` ${App.unread}`:''}
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

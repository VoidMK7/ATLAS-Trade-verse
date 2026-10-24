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

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

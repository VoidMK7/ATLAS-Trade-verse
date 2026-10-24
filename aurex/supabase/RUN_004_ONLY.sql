-- NovaTrade migration 004 (stocks, memecoins, commodities, demo account, bot journal, admin statistics). Paste ALL into Supabase > SQL Editor > New query > Run. Safe to re-run. Run it AFTER the earlier setup SQL.

-- 004_features: instrument categories (crypto / meme / stock / commodity), more coins, demo accounts,
-- bot journal (agent_log), admin statistics. Additive + idempotent; run after 002.

-- ---------- A. instruments ----------
alter table public.coins add column if not exists kind text not null default 'crypto';
alter table public.coins add column if not exists source text not null default 'binance';   -- binance | stooq
alter table public.coins add column if not exists src_symbol text;
alter table public.coins add column if not exists about text;
alter table public.market_prices add column if not exists quote_ts text;
do $$ begin alter table public.coins add constraint coins_kind_chk check (kind in ('crypto','meme','stock','commodity')); exception when duplicate_object then null; end $$;

insert into public.settings(key,value) values('price_max_age_stock','300'),('demo_start_balance','100000') on conflict(key) do nothing;

insert into public.coins(symbol,name,market_cap,enabled,kind,source,src_symbol,about) values
 ('DOT','Polkadot',0.60,true,'crypto','binance',null,'Multi-chain network connecting independent blockchains.'),
 ('LTC','Litecoin',0.61,true,'crypto','binance',null,'Peer-to-peer digital cash, a Bitcoin fork with faster blocks.'),
 ('TRX','TRON',0.62,true,'crypto','binance',null,'Smart-contract chain widely used for USDT transfers.'),
 ('ATOM','Cosmos',0.55,true,'crypto','binance',null,'Internet of blockchains built on the Cosmos SDK.'),
 ('UNI','Uniswap',0.56,true,'crypto','binance',null,'Governance token of the Uniswap decentralised exchange.'),
 ('NEAR','NEAR Protocol',0.57,true,'crypto','binance',null,'Sharded layer-1 focused on usability.'),
 ('APT','Aptos',0.54,true,'crypto','binance',null,'Move-language layer-1 blockchain.'),
 ('ARB','Arbitrum',0.53,true,'crypto','binance',null,'Ethereum layer-2 optimistic rollup.'),
 ('OP','Optimism',0.52,true,'crypto','binance',null,'Ethereum layer-2 optimistic rollup.'),
 ('SUI','Sui',0.58,true,'crypto','binance',null,'Move-language layer-1 with object-centric design.'),
 ('INJ','Injective',0.50,true,'crypto','binance',null,'Layer-1 optimised for decentralised finance.'),
 ('FIL','Filecoin',0.51,true,'crypto','binance',null,'Decentralised storage network.'),
 ('BCH','Bitcoin Cash',0.63,true,'crypto','binance',null,'Bitcoin fork with larger blocks.'),
 ('XLM','Stellar',0.59,true,'crypto','binance',null,'Network for fast, low-cost cross-border payments.'),
 ('HBAR','Hedera',0.49,true,'crypto','binance',null,'Enterprise-grade public ledger using hashgraph consensus.'),
 ('AAVE','Aave',0.48,true,'crypto','binance',null,'Decentralised lending protocol token.'),
 ('ETC','Ethereum Classic',0.47,true,'crypto','binance',null,'Original Ethereum chain, proof-of-work.'),
 ('ICP','Internet Computer',0.46,true,'crypto','binance',null,'Blockchain that hosts web-speed smart contracts.'),
 ('RENDER','Render',0.45,true,'crypto','binance',null,'Decentralised GPU rendering network.'),
 ('SEI','Sei',0.44,true,'crypto','binance',null,'Layer-1 built for trading applications.'),
 ('TIA','Celestia',0.43,true,'crypto','binance',null,'Modular data-availability network.'),
 ('POL','Polygon',0.42,true,'crypto','binance',null,'Ethereum scaling ecosystem (formerly MATIC).'),
 ('SHIB','Shiba Inu',0.70,true,'meme','binance',null,'Dog-themed memecoin on Ethereum.'),
 ('PEPE','Pepe',0.69,true,'meme','binance',null,'Frog-themed memecoin on Ethereum.'),
 ('WIF','dogwifhat',0.68,true,'meme','binance',null,'Solana memecoin of a dog in a pink hat.'),
 ('BONK','Bonk',0.67,true,'meme','binance',null,'Solana community memecoin.'),
 ('FLOKI','Floki',0.66,true,'meme','binance',null,'Dog-themed memecoin with a utility ecosystem.'),
 ('PAXG','Gold token (PAXG)',0.80,true,'commodity','binance',null,'Token backed 1:1 by physical gold, trades 24/7.'),
 ('XAU','Gold (spot)',0.79,true,'commodity','stooq','xauusd','Gold spot price in USD per troy ounce. Delayed quote, follows market hours.'),
 ('XAG','Silver (spot)',0.78,true,'commodity','stooq','xagusd','Silver spot price in USD per troy ounce. Delayed quote, follows market hours.'),
 ('WTI','Crude oil (WTI)',0.77,true,'commodity','stooq','cl.f','WTI crude oil futures. Delayed quote, follows market hours.'),
 ('AAPL','Apple Inc.',0.40,true,'stock','stooq','aapl.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('MSFT','Microsoft',0.40,true,'stock','stooq','msft.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('NVDA','NVIDIA',0.40,true,'stock','stooq','nvda.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('TSLA','Tesla',0.40,true,'stock','stooq','tsla.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('AMZN','Amazon',0.40,true,'stock','stooq','amzn.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('GOOGL','Alphabet (Google)',0.40,true,'stock','stooq','googl.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('META','Meta Platforms',0.40,true,'stock','stooq','meta.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('NFLX','Netflix',0.40,true,'stock','stooq','nflx.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('AMD','Advanced Micro Devices',0.40,true,'stock','stooq','amd.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('COIN','Coinbase Global',0.40,true,'stock','stooq','coin.us','US stock. Delayed quote, only tradable while the US market is open.'),
 ('MSTR','Strategy (MicroStrategy)',0.40,true,'stock','stooq','mstr.us','US stock. Delayed quote, only tradable while the US market is open.')
on conflict(symbol) do update set kind=excluded.kind, source=excluded.source, src_symbol=excluded.src_symbol, about=excluded.about;
update public.coins set kind='meme', about=coalesce(about,'Dog-themed original memecoin.') where symbol='DOGE';

-- stock/commodity quotes follow market hours: they age out separately
create or replace function public._price(c text) returns numeric language plpgsql stable security definer set search_path=public as $$
declare p numeric; src text; age numeric;
begin
  if c='USDT' then return 1; end if;
  select source into src from public.coins where symbol=c;
  age := case when src='stooq' then coalesce(public._setting('price_max_age_stock'),300) else coalesce(public._setting('price_max_age_seconds'),120) end;
  select price into p from public.market_prices where symbol=c||'/USDT' and updated_at > now()-make_interval(secs=>age);
  if p is null or p<=0 then
    raise exception '%', case when src='stooq' then 'The market for '||c||' is closed or its quote is stale right now.' else 'Market price for '||c||' is unavailable right now. Try again shortly.' end using hint='price_unavailable';
  end if;
  return p;
end $$;

-- public market data: tick history lets the UI draw a chart for any instrument
alter table public.price_ticks enable row level security;
drop policy if exists pt_read on public.price_ticks;
create policy pt_read on public.price_ticks for select to authenticated using (true);
grant select on public.price_ticks to authenticated;

-- ---------- B. demo accounts ----------
alter table public.profiles add column if not exists is_demo boolean not null default false;
create table if not exists public.demo_accounts(owner uuid primary key references auth.users(id) on delete cascade, demo_user uuid not null unique references auth.users(id) on delete cascade, secret text not null, created_at timestamptz not null default now());
alter table public.demo_accounts enable row level security;
revoke all on public.demo_accounts from anon, authenticated;

create or replace function public._is_demo(u uuid) returns boolean language sql stable security definer set search_path=public as
$$ select coalesce((select is_demo from public.profiles where id=u),false) $$;

create or replace function public.demo_provision(p_demo uuid) returns void language plpgsql security definer set search_path=public as $$
declare s numeric := coalesce(public._setting('demo_start_balance'),100000);
begin
  insert into public.profiles(id,email,display_name) select id,email,'Demo' from auth.users where id=p_demo on conflict(id) do nothing;
  update public.profiles set is_demo=true, display_name='Demo trader', kyc_status='verified' where id=p_demo;
  delete from public.balances where user_id=p_demo;
  insert into public.balances(user_id,coin,total) values(p_demo,'USDT',s);
  perform public._act(p_demo,'adjustment','USDT',s,'completed',null,'Demo starting balance (virtual money)');
end $$;

create or replace function public.demo_reset() returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); s numeric := coalesce(public._setting('demo_start_balance'),100000);
begin
  if not public._is_demo(u) then raise exception 'Only demo accounts can be reset' using hint='forbidden'; end if;
  perform public._alog(a.id,u,'stop','','Demo reset: agent stopped and positions cleared.','{}') from public.agents a where a.user_id=u and a.status in ('running','paused','halted');
  delete from public.agent_positions where agent_id in (select id from public.agents where user_id=u);
  update public.agents set status='stopped', cash=0, updated_at=now() where user_id=u;
  update public.rentals set status='cancelled' where user_id=u and status in ('active','paused');
  update public.orders set status='cancelled', locked_amount=0 where user_id=u and status='open';
  delete from public.balances where user_id=u;
  insert into public.balances(user_id,coin,total) values(u,'USDT',s);
  perform public._act(u,'adjustment','USDT',s,'completed',null,'Demo balance reset (virtual money)');
  return jsonb_build_object('balance',s);
end $$;

create or replace function public.demo_topup(p_amount numeric default 100000) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid();
begin
  if not public._is_demo(u) then raise exception 'Only demo accounts can add virtual money' using hint='forbidden'; end if;
  if p_amount is null or p_amount<=0 or p_amount>10000000 then raise exception 'Enter an amount between 1 and 10,000,000' using hint='invalid'; end if;
  perform public._bal_add(u,'USDT',p_amount,0);
  perform public._act(u,'adjustment','USDT',p_amount,'completed',null,'Demo top-up (virtual money)');
  return jsonb_build_object('added',p_amount);
end $$;

-- demo accounts hold virtual money only
create or replace function public.request_withdrawal(p_coin text,p_network text,p_address text,p_memo text,p_amount numeric,p_idem text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); n public.networks%rowtype; w public.withdrawals%rowtype; kyc text; lim numeric; used numeric; mfa boolean;
begin
  if public._is_demo(u) then raise exception 'Demo accounts use virtual money and cannot withdraw' using hint='demo_account'; end if;
  if p_idem is not null then select * into w from public.withdrawals where user_id=u and idem_key=p_idem; if found then return to_jsonb(w); end if; end if;
  select * into n from public.networks where coin=p_coin and code=p_network;
  if not found or not n.withdraw_enabled then raise exception 'Withdrawals are not available for this coin/network' using hint='unsupported'; end if;
  if p_address is null or p_address !~ n.address_regex then raise exception 'Invalid address for this network' using hint='invalid_address'; end if;
  if n.memo_required and coalesce(p_memo,'')='' then raise exception 'A memo/tag is required for this network' using hint='memo_required'; end if;
  if p_amount is null or p_amount<n.min_withdraw then raise exception 'Minimum withdrawal is % %',n.min_withdraw,p_coin using hint='below_min'; end if;
  if p_amount>n.max_withdraw then raise exception 'Maximum withdrawal is % %',n.max_withdraw,p_coin using hint='above_max'; end if;
  if p_amount<=n.withdraw_fee then raise exception 'Amount must exceed the network fee' using hint='below_fee'; end if;
  select exists(select 1 from auth.mfa_factors where user_id=u and status='verified') into mfa;
  if mfa and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'Two-factor verification required' using hint='mfa_required'; end if;
  select kyc_status into kyc from public.profiles where id=u;
  lim := case when kyc='verified' then 50000 else 500 end;
  select coalesce(sum(public._price(x.coin)*x.amount),0) into used from public.withdrawals x where x.user_id=u and x.created_at>now()-interval '24 hours' and x.status not in ('rejected','failed');
  if used + p_amount*public._price(p_coin) > lim then raise exception 'Daily withdrawal limit of % USD exceeded. Verify your identity to raise it.',lim using hint='limit_exceeded'; end if;
  if public._bal_avail(u,p_coin) < p_amount then raise exception 'Insufficient available balance' using hint='insufficient'; end if;
  perform public._bal_add(u,p_coin,0,p_amount);
  insert into public.withdrawals(user_id,coin,network,address,memo,amount,fee,status,idem_key) values(u,p_coin,p_network,p_address,nullif(p_memo,''),p_amount,n.withdraw_fee,'pending',p_idem) returning * into w;
  perform public._act(u,'withdrawal',p_coin,p_amount,'pending',w.id::text,'To '||p_address||' ('||p_network||')');
  perform public._notify(u,'withdrawals','Withdrawal submitted',p_amount||' '||p_coin||' is pending review.','wd-'||w.id||'-pending');
  return to_jsonb(w);
end $$;

-- ---------- C. bot journal ----------
create table if not exists public.agent_log(id bigint generated always as identity primary key, agent_id uuid not null references public.agents(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, ts timestamptz not null default now(), event text not null, symbol text, message text not null, detail jsonb not null default '{}');
create index if not exists agent_log_agent_ts on public.agent_log(agent_id, ts desc);
create index if not exists agent_log_user_ts on public.agent_log(user_id, ts desc);
alter table public.agent_log enable row level security;
drop policy if exists own_agent_log on public.agent_log; drop policy if exists adm_agent_log on public.agent_log;
create policy own_agent_log on public.agent_log for select to authenticated using (user_id=auth.uid());
create policy adm_agent_log on public.agent_log for select to authenticated using (public.is_admin());
grant select on public.agent_log to authenticated;

create or replace function public._alog(a uuid,u uuid,ev text,sym text,msg text,d jsonb default '{}') returns void language sql security definer set search_path=public as
$$ insert into public.agent_log(agent_id,user_id,event,symbol,message,detail) values(a,u,ev,nullif(sym,''),msg,coalesce(d,'{}'::jsonb)) $$;
-- same, but at most once per (agent, symbol, event) every p_secs seconds: keeps routine "analysis" notes readable
create or replace function public._alogt(a uuid,u uuid,ev text,sym text,msg text,d jsonb,p_secs int) returns void language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.agent_log where agent_id=a and event=ev and symbol is not distinct from nullif(sym,'') and ts>now()-make_interval(secs=>p_secs)) then return; end if;
  perform public._alog(a,u,ev,sym,msg,d);
end $$;

create or replace function public._sig_info(p_symbol text,p_strategy text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare a numeric[]; n int; s5 numeric; s20 numeric; sd numeric; px numeric; ret numeric; z numeric; sig int := 0; why text;
begin
  select array_agg(price order by ts desc) into a from (select price,ts from public.price_ticks where symbol=p_symbol and ts>now()-interval '3 hours' order by ts desc limit 20) t;
  n := coalesce(array_length(a,1),0);
  if n<20 then return jsonb_build_object('signal',0,'n',n,'why','Collecting price history ('||n||'/20 samples) before trading '||p_symbol); end if;
  px := a[1]; select avg(x) into s20 from unnest(a) x; select avg(x) into s5 from unnest(a[1:5]) x; select stddev_pop(x) into sd from unnest(a) x;
  if p_strategy='trend' then
    sig := case when s5>s20*1.0005 then 1 when s5<s20*0.9995 then -1 else 0 end;
    why := format('Trend: short average %s is %s%% vs long average %s -> %s',round(s5,6),round((s5/s20-1)*100,4),round(s20,6),case sig when 1 then 'BUY signal' when -1 then 'SELL signal' else 'no signal' end);
  elsif p_strategy='meanrev' then
    if sd is null or sd=0 then sig:=0; why:='Mean reversion: no volatility in the window, no signal';
    else z:=(px-s20)/sd; sig := case when z<-1.5 then 1 when z>0.5 then -1 else 0 end;
      why := format('Mean reversion: price %s is %s std-devs from the 20-sample mean %s -> %s',round(px,6),round(z,2),round(s20,6),case sig when 1 then 'BUY signal (oversold)' when -1 then 'SELL signal' else 'no signal' end); end if;
  elsif p_strategy='momentum' then
    ret := px/a[10]-1; sig := case when ret>0.003 then 1 when ret<-0.003 then -1 else 0 end;
    why := format('Momentum: %s%% over the last 10 samples -> %s',round(ret*100,4),case sig when 1 then 'BUY signal' when -1 then 'SELL signal' else 'no signal' end);
  elsif p_strategy='dca' then sig:=1; why:='DCA: periodic buy';
  end if;
  return jsonb_build_object('signal',sig,'n',n,'px',px,'ma5',s5,'ma20',s20,'why',why);
end $$;

create or replace function public._sig(p_symbol text,p_strategy text) returns int language sql stable security definer set search_path=public as
$$ select coalesce((public._sig_info(p_symbol,p_strategy)->>'signal')::int,0) $$;

create or replace function public.agent_liquidate(p_agent uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare a public.agents%rowtype; pos record; px numeric; rate numeric := public._setting('spot_fee_rate'); fee numeric; pnl numeric; proceeds numeric; cash numeric;
begin
  select * into a from public.agents where id=p_agent for update; if not found then return; end if;
  cash := a.cash;
  for pos in select * from public.agent_positions where agent_id=p_agent loop
    begin px := public._price(split_part(pos.symbol,'/',1)); exception when others then px := pos.avg_price; end;
    proceeds := px*pos.qty; fee := proceeds*rate; pnl := (px-pos.avg_price)*pos.qty - fee;
    insert into public.agent_trades(agent_id,user_id,bot_id,symbol,side,price,qty,fee,pnl,reason) values(p_agent,a.user_id,a.bot_id,pos.symbol,'sell',px,pos.qty,fee,pnl,p_reason);
    perform public._alog(p_agent,a.user_id,'sell',pos.symbol,format('SELL %s %s at %s to close the position (%s). Result %s USDT after %s fee.',round(pos.qty,8),pos.symbol,round(px,6),p_reason,round(pnl,4),round(fee,4)),jsonb_build_object('qty',pos.qty,'price',px,'pnl',pnl,'fee',fee,'reason',p_reason));
    cash := cash + proceeds - fee;
    perform public._bal_add(a.user_id,'USDT',pnl,pnl);
    delete from public.agent_positions where agent_id=p_agent and symbol=pos.symbol;
  end loop;
  if cash>0 then perform public._bal_add(a.user_id,'USDT',0,-cash); end if;
  update public.agents set cash=0, updated_at=now() where id=p_agent;
end $$;

create or replace function public.agent_tick() returns int language plpgsql security definer set search_path=public as $$
declare a record; sym text; pos public.agent_positions%rowtype; px numeric; s int; info jsonb; notional numeric; qty numeric; fee numeric; pnl numeric; proceeds numeric; n int := 0; day_pnl numeric;
        rate numeric := public._setting('spot_fee_rate'); has boolean; reason text; chg numeric; cashnow numeric;
begin
  for a in select * from public.agents where status='running' loop
    begin
      select coalesce(sum(t.pnl),0) into day_pnl from public.agent_trades t where t.agent_id=a.id and t.created_at>now()-interval '24 hours';
      if day_pnl <= -a.max_daily_loss then
        perform public._alog(a.id,a.user_id,'halt',null,format('HALT: 24h result %s USDT reached the daily loss limit of -%s USDT. Closing every position and stopping.',round(day_pnl,2),a.max_daily_loss),jsonb_build_object('day_pnl',day_pnl,'limit',a.max_daily_loss));
        perform public.agent_liquidate(a.id,'Daily loss limit reached');
        update public.agents set status='halted', halted_reason='Maximum daily loss reached', updated_at=now() where id=a.id;
        perform public._notify(a.user_id,'ai','Agent halted',a.name||' hit its daily loss limit of '||a.max_daily_loss||' USDT.','halt-'||a.id||'-'||current_date);
        continue;
      end if;
      foreach sym in array a.pairs loop
        begin
          px := public._price(split_part(sym,'/',1));
          select * into pos from public.agent_positions where agent_id=a.id and symbol=sym; has := found;
          info := public._sig_info(sym,a.strategy); s := coalesce((info->>'signal')::int,0);
          if has then
            chg := (px/pos.avg_price-1)*100;
            reason := case when px<=pos.avg_price*(1-a.stop_loss/100) then 'Stop-loss' when px>=pos.avg_price*(1+a.take_profit/100) then 'Take-profit' when s=-1 and a.strategy<>'dca' then 'Signal exit' end;
            if reason is not null then
              proceeds := px*pos.qty; fee := proceeds*rate; pnl := (px-pos.avg_price)*pos.qty - fee;
              insert into public.agent_trades(agent_id,user_id,bot_id,symbol,side,price,qty,fee,pnl,reason) values(a.id,a.user_id,a.bot_id,sym,'sell',px,pos.qty,fee,pnl,reason);
              perform public._alog(a.id,a.user_id,'sell',sym,format('SELL %s %s at %s (%s). Entry %s, move %s%%, result %s USDT after %s fee.',round(pos.qty,8),sym,round(px,6),reason,round(pos.avg_price,6),round(chg,3),round(pnl,4),round(fee,4)),jsonb_build_object('qty',pos.qty,'price',px,'entry',pos.avg_price,'pnl',pnl,'fee',fee,'reason',reason,'signal',s));
              update public.agents set cash=cash+proceeds-fee where id=a.id;
              perform public._bal_add(a.user_id,'USDT',pnl,pnl);
              delete from public.agent_positions where agent_id=a.id and symbol=sym; n := n+1;
            else
              perform public._alogt(a.id,a.user_id,'hold',sym,format('HOLD %s: price %s, entry %s (%s%%). Stop-loss at %s, take-profit at %s. %s',sym,round(px,6),round(pos.avg_price,6),round(chg,3),round(pos.avg_price*(1-a.stop_loss/100),6),round(pos.avg_price*(1+a.take_profit/100),6),coalesce(info->>'why','')),jsonb_build_object('price',px,'entry',pos.avg_price,'signal',s),300);
            end if;
          elsif s=1 and not (a.strategy='dca' and exists(select 1 from public.agent_trades x where x.agent_id=a.id and x.symbol=sym and x.side='buy' and x.created_at>now()-interval '6 hours')) then
            select g.cash into cashnow from public.agents g where g.id=a.id;
            notional := least(cashnow, a.capital*a.max_alloc/100);
            if notional >= 5 then
              qty := notional/px; fee := notional*rate;
              insert into public.agent_positions(agent_id,symbol,qty,avg_price) values(a.id,sym,qty,px);
              insert into public.agent_trades(agent_id,user_id,bot_id,symbol,side,price,qty,fee,pnl,reason) values(a.id,a.user_id,a.bot_id,sym,'buy',px,qty,fee,-fee,a.strategy||' signal');
              perform public._alog(a.id,a.user_id,'buy',sym,format('BUY %s %s at %s (%s USDT, %s%% of capital cap). %s Fee %s USDT.',round(qty,8),sym,round(px,6),round(notional,2),a.max_alloc,coalesce(info->>'why',''),round(fee,4)),jsonb_build_object('qty',qty,'price',px,'notional',notional,'fee',fee,'signal',s));
              update public.agents set cash=cash-notional-fee where id=a.id;
              perform public._bal_add(a.user_id,'USDT',-fee,-fee); n := n+1;
            else
              perform public._alogt(a.id,a.user_id,'skip',sym,format('SKIP %s: buy signal but only %s USDT is available (minimum order 5 USDT).',sym,round(coalesce(notional,0),2)),jsonb_build_object('cash',cashnow),300);
            end if;
          else
            perform public._alogt(a.id,a.user_id,'analysis',sym,format('WAIT %s: %s',sym,case when a.strategy='dca' and s=1 then 'DCA waits for the next 6-hour interval.' else coalesce(info->>'why','no data') end),jsonb_build_object('price',px,'signal',s,'samples',info->'n'),300);
          end if;
        exception when others then
          perform public._alogt(a.id,a.user_id,'error',sym,'Skipped '||sym||': '||sqlerrm,'{}',300);
        end;
      end loop;
      update public.agents set last_run=now() where id=a.id;
    exception when others then
      insert into public.job_runs(job,status,error) values('agent_tick','failed',sqlerrm);
    end;
  end loop;
  return n;
end $$;

create or replace function public.agent_action(p_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); a public.agents%rowtype;
begin
  select * into a from public.agents where user_id=u and kind='own' for update;
  if not found then raise exception 'Save your agent settings first' using hint='not_found'; end if;
  if p_action='start' then
    if a.status in ('running','paused') then raise exception 'Agent is already active' using hint='invalid_state'; end if;
    if public._bal_avail(u,'USDT') < a.capital then raise exception 'Allocated capital exceeds your available USDT balance' using hint='insufficient'; end if;
    perform public._bal_add(u,'USDT',0,a.capital);
    update public.agents set status='running', cash=capital, halted_reason=null, started_at=coalesce(started_at,now()), updated_at=now() where id=a.id;
    perform public._alog(a.id,u,'start',null,format('START: %s strategy on %s with %s USDT (stop-loss %s%%, take-profit %s%%, max %s%% per trade, daily loss cap %s USDT).',a.strategy,array_to_string(a.pairs,', '),a.capital,a.stop_loss,a.take_profit,a.max_alloc,a.max_daily_loss),to_jsonb(a));
    perform public._notify(u,'ai','AI agent started',a.name||' is trading '||a.capital||' USDT in ledger mode.');
  elsif p_action='pause' and a.status='running' then update public.agents set status='paused',updated_at=now() where id=a.id; perform public._alog(a.id,u,'pause',null,'PAUSE: no new trades; open positions are kept.','{}');
  elsif p_action='resume' and a.status='paused' then update public.agents set status='running',updated_at=now() where id=a.id; perform public._alog(a.id,u,'resume',null,'RESUME: trading continues.','{}');
  elsif p_action='stop' and a.status in ('running','paused') then
    perform public._alog(a.id,u,'stop',null,'STOP requested by user: closing all positions at the market price.','{}');
    perform public.agent_liquidate(a.id,'Stopped by user');
    update public.agents set status='stopped',updated_at=now() where id=a.id;
    perform public._notify(u,'ai','AI agent stopped','Positions were closed and funds released.');
  else raise exception 'Action not allowed in status %',a.status using hint='invalid_state'; end if;
  select * into a from public.agents where id=a.id; return to_jsonb(a);
end $$;

create or replace function public.rent_bot(p_bot text,p_plan text,p_allocation numeric,p_idem text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); b public.bots%rowtype; r public.rentals%rowtype; fee numeric; ag uuid; dur interval;
begin
  if p_idem is not null then select * into r from public.rentals where user_id=u and idem_key=p_idem; if found then return to_jsonb(r); end if; end if;
  select * into b from public.bots where id=p_bot;
  if not found then raise exception 'Bot not found' using hint='not_found'; end if;
  if not b.available then raise exception 'This bot is currently unavailable' using hint='unavailable'; end if;
  if p_plan not in ('daily','weekly','monthly') then raise exception 'Invalid plan' using hint='invalid'; end if;
  fee := case p_plan when 'daily' then b.price_daily when 'weekly' then b.price_weekly else b.price_monthly end;
  dur := case p_plan when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '30 days' end;
  if p_allocation is null or p_allocation<b.min_allocation then raise exception 'Minimum allocation is % USDT',b.min_allocation using hint='below_min'; end if;
  if public._bal_avail(u,'USDT') < fee+p_allocation then raise exception 'You need % USDT available (rental fee % + allocation %)',fee+p_allocation,fee,p_allocation using hint='insufficient'; end if;
  perform public._bal_add(u,'USDT',-fee,0);
  perform public._bal_add(u,'USDT',0,p_allocation);
  insert into public.agents(user_id,kind,bot_id,name,strategy,pairs,capital,cash,risk,stop_loss,take_profit,max_alloc,max_daily_loss,mode,status,started_at)
    values(u,'rental',b.id,b.name,b.strategy,(select array_agg(c||'/USDT') from unnest(b.coins) c),p_allocation,p_allocation,lower(b.risk),b.stop_loss,b.take_profit,b.max_alloc,p_allocation*0.05,'ledger','running',now()) returning id into ag;
  insert into public.rentals(user_id,bot_id,agent_id,plan,fee,allocation,status,idem_key,ends_at) values(u,b.id,ag,p_plan,fee,p_allocation,'active',p_idem,now()+dur) returning * into r;
  perform public._alog(ag,u,'start',null,format('START: rented bot "%s" (%s strategy) for a %s plan with %s USDT allocation; rental fee %s USDT paid.',b.name,b.strategy,p_plan,p_allocation,fee),jsonb_build_object('bot',b.id,'plan',p_plan));
  perform public._act(u,'rental','USDT',fee,'completed',r.id::text,'Rental fee — '||b.name||' ('||p_plan||')');
  perform public._notify(u,'rentals','Bot rental confirmed',b.name||' · '||p_plan,'rent-'||r.id);
  return to_jsonb(r);
end $$;

create or replace function public.rental_action(p_id uuid,p_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); r public.rentals%rowtype;
begin
  select * into r from public.rentals where id=p_id and user_id=u for update;
  if not found then raise exception 'Rental not found' using hint='not_found'; end if;
  if p_action='pause' and r.status='active' then update public.rentals set status='paused' where id=p_id; update public.agents set status='paused' where id=r.agent_id; perform public._alog(r.agent_id,u,'pause',null,'PAUSE: rental paused by user.','{}');
  elsif p_action='resume' and r.status='paused' then update public.rentals set status='active' where id=p_id; update public.agents set status='running' where id=r.agent_id; perform public._alog(r.agent_id,u,'resume',null,'RESUME: rental resumed by user.','{}');
  elsif p_action='cancel' and r.status in ('active','paused') then
    perform public._alog(r.agent_id,u,'stop',null,'STOP: rental cancelled by user; closing all positions.','{}');
    perform public.agent_liquidate(r.agent_id,'Rental cancelled');
    update public.agents set status='stopped' where id=r.agent_id;
    update public.rentals set status='cancelled' where id=p_id;
    perform public._act(u,'rental','USDT',0,'completed',p_id::text,'Rental cancelled');
    perform public._notify(u,'rentals','Rental cancelled','Positions closed and allocation released.','rentc-'||p_id);
  else raise exception 'Action not allowed in status %',r.status using hint='invalid_state'; end if;
  select * into r from public.rentals where id=p_id; return to_jsonb(r);
end $$;

create or replace function public.expire_rentals() returns int language plpgsql security definer set search_path=public as $$
declare r record; n int := 0;
begin
  for r in select * from public.rentals where status in ('active','paused') and ends_at<now() loop
    perform public._alog(r.agent_id,r.user_id,'stop',null,'STOP: rental period ended; closing all positions.','{}');
    perform public.agent_liquidate(r.agent_id,'Rental expired');
    update public.agents set status='stopped' where id=r.agent_id;
    update public.rentals set status='expired' where id=r.id;
    perform public._notify(r.user_id,'rentals','Bot rental expired','Positions closed and allocation released.','rente-'||r.id);
    n := n+1;
  end loop; return n;
end $$;

create or replace function public.run_engine() returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  r := jsonb_build_object('matched',public.match_open_orders(),'alerts',public.check_price_alerts(),'agent_trades',public.agent_tick(),'expired',public.expire_rentals(),'snapshots',public.snapshot_portfolios());
  delete from public.price_ticks where ts<now()-interval '3 days';
  delete from public.agent_log where ts<now()-interval '14 days';
  insert into public.system_status(provider,status,detail,checked_at) values('engine','ok',r::text,now()) on conflict(provider) do update set status='ok',detail=excluded.detail,checked_at=now();
  return r;
end $$;

-- ---------- D. admin statistics ----------
create or replace function public.admin_overview() returns jsonb language plpgsql security definer set search_path=public as $$
begin perform public._need_admin();
  return jsonb_build_object('users',(select count(*) from public.profiles where not is_demo),'demo_users',(select count(*) from public.profiles where is_demo),
   'pending_withdrawals',(select count(*) from public.withdrawals where status in ('pending','processing')),
   'active_agents',(select count(*) from public.agents where status='running'),'active_rentals',(select count(*) from public.rentals where status='active'),
   'orders_24h',(select count(*) from public.orders o join public.profiles p on p.id=o.user_id where not p.is_demo and o.created_at>now()-interval '24 hours'),
   'volume_24h',(select coalesce(sum(o.filled_price*o.amount),0) from public.orders o join public.profiles p on p.id=o.user_id where not p.is_demo and o.status='filled' and o.filled_at>now()-interval '24 hours'),
   'failed_jobs_24h',(select count(*) from public.job_runs where status='failed' and created_at>now()-interval '24 hours'));
end $$;

create or replace function public._usd(c text) returns numeric language sql stable security definer set search_path=public as
$$ select case when c='USDT' then 1 else coalesce((select price from public.market_prices where symbol=c||'/USDT'),0) end $$;

create or replace function public.admin_stats(p_days int default 30, p_demo boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$
declare d0 date; res jsonb;
begin
  perform public._need_admin();
  p_days := least(greatest(coalesce(p_days,30),1),365); d0 := current_date-(p_days-1);
  with days as (select generate_series(d0,current_date,interval '1 day')::date d),
  u as (select id from public.profiles where p_demo or not is_demo),
  su as (select created_at::date d, count(*) c from public.profiles where created_at::date>=d0 and (p_demo or not is_demo) group by 1),
  od as (select o.created_at::date d, count(*) c, coalesce(sum(case when o.status='filled' then o.filled_price*o.amount end),0) vol, coalesce(sum(o.fee),0) fee from public.orders o where o.created_at::date>=d0 and o.user_id in (select id from u) group by 1),
  sw as (select s.created_at::date d, count(*) c, coalesce(sum(s.amount*public._usd(s.from_coin)),0) vol from public.swaps s where s.created_at::date>=d0 and s.user_id in (select id from u) group by 1),
  dp as (select x.created_at::date d, coalesce(sum(x.amount*public._usd(x.coin)),0) v, count(*) c from public.deposits x where x.status='completed' and x.created_at::date>=d0 and x.user_id in (select id from u) group by 1),
  wd as (select x.created_at::date d, coalesce(sum(x.amount*public._usd(x.coin)),0) v, count(*) c from public.withdrawals x where x.status='completed' and x.created_at::date>=d0 and x.user_id in (select id from u) group by 1),
  rn as (select x.starts_at::date d, coalesce(sum(x.fee),0) v, count(*) c from public.rentals x where x.starts_at::date>=d0 and x.user_id in (select id from u) group by 1),
  at as (select x.created_at::date d, count(*) c, coalesce(sum(x.pnl),0) pnl, coalesce(sum(x.fee),0) fee from public.agent_trades x where x.created_at::date>=d0 and x.user_id in (select id from u) group by 1),
  lg as (select x.created_at::date d, count(*) c from public.login_events x where x.created_at::date>=d0 and x.user_id in (select id from u) group by 1)
  select jsonb_build_object(
    'days',(select jsonb_agg(jsonb_build_object('d',days.d,'signups',coalesce(su.c,0),'logins',coalesce(lg.c,0),'orders',coalesce(od.c,0),'order_volume',od.vol,'order_fees',od.fee,'swaps',coalesce(sw.c,0),'swap_volume',sw.vol,
        'deposits',dp.v,'deposit_count',coalesce(dp.c,0),'withdrawals',wd.v,'withdrawal_count',coalesce(wd.c,0),'rental_revenue',rn.v,'rentals',coalesce(rn.c,0),'bot_trades',coalesce(at.c,0),'bot_pnl',at.pnl,'bot_fees',at.fee) order by days.d)
      from days left join su using(d) left join od using(d) left join sw using(d) left join dp using(d) left join wd using(d) left join rn using(d) left join at using(d) left join lg using(d)),
    'top_pairs',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select symbol, count(*) orders, round(coalesce(sum(case when status='filled' then filled_price*amount end),0),2) volume from public.orders where created_at::date>=d0 and user_id in (select id from u) group by symbol order by 3 desc limit 10) x),
    'orders_by_status',(select coalesce(jsonb_object_agg(status,c),'{}'::jsonb) from (select status,count(*) c from public.orders where created_at::date>=d0 and user_id in (select id from u) group by status) x),
    'withdrawals_by_status',(select coalesce(jsonb_object_agg(status,c),'{}'::jsonb) from (select status,count(*) c from public.withdrawals where created_at::date>=d0 and user_id in (select id from u) group by status) x),
    'kyc',(select coalesce(jsonb_object_agg(kyc_status,c),'{}'::jsonb) from (select kyc_status,count(*) c from public.profiles where (p_demo or not is_demo) group by kyc_status) x),
    'activity_by_type',(select coalesce(jsonb_object_agg(type,c),'{}'::jsonb) from (select type,count(*) c from public.activity where created_at::date>=d0 and user_id in (select id from u) group by type) x),
    'agents_by_status',(select coalesce(jsonb_object_agg(status,c),'{}'::jsonb) from (select status,count(*) c from public.agents where user_id in (select id from u) group by status) x),
    'bots',(select coalesce(jsonb_agg(x),'[]'::jsonb) from (select coalesce(bot_id,'own') bot, count(*) trades, round(coalesce(sum(pnl),0),2) pnl from public.agent_trades where created_at::date>=d0 and user_id in (select id from u) group by 1 order by 2 desc) x),
    'totals',jsonb_build_object('users',(select count(*) from u),'demo_users',(select count(*) from public.profiles where is_demo),
      'volume',(select coalesce(sum(filled_price*amount),0) from public.orders where status='filled' and user_id in (select id from u)),
      'fees',(select coalesce(sum(fee),0) from public.orders where status='filled' and user_id in (select id from u)),
      'deposits_usd',(select coalesce(sum(amount*public._usd(coin)),0) from public.deposits where status='completed' and user_id in (select id from u)),
      'withdrawals_usd',(select coalesce(sum(amount*public._usd(coin)),0) from public.withdrawals where status='completed' and user_id in (select id from u)),
      'bot_trades',(select count(*) from public.agent_trades where user_id in (select id from u)),'bot_pnl',(select coalesce(sum(pnl),0) from public.agent_trades where user_id in (select id from u)))
  ) into res;
  return res;
end $$;

-- every action on the platform in one feed (activity, bot trades, admin actions, sign-ins)
create or replace function public.admin_events(p_limit int default 100, p_demo boolean default false) returns jsonb language plpgsql security definer set search_path=public as $$
declare res jsonb;
begin
  perform public._need_admin();
  select coalesce(jsonb_agg(e order by (e->>'ts') desc),'[]'::jsonb) into res from (
    select * from (
      select jsonb_build_object('ts',a.created_at,'kind',a.type,'user',p.email,'text',a.coin||' '||round(a.amount,8)||' · '||a.status||coalesce(' · '||a.detail,''),'demo',p.is_demo) e, a.created_at t from public.activity a join public.profiles p on p.id=a.user_id where p_demo or not p.is_demo
      union all
      select jsonb_build_object('ts',t.created_at,'kind','bot_'||t.side,'user',p.email,'text',t.symbol||' '||round(t.qty,8)||' @ '||round(t.price,6)||coalesce(' · P&L '||round(t.pnl,4),'')||coalesce(' · '||t.reason,''),'demo',p.is_demo), t.created_at from public.agent_trades t join public.profiles p on p.id=t.user_id where p_demo or not p.is_demo
      union all
      select jsonb_build_object('ts',l.created_at,'kind','admin','user',p.email,'text',l.action||coalesce(' · '||l.target,''),'demo',false), l.created_at from public.audit_log l left join public.profiles p on p.id=l.actor
      union all
      select jsonb_build_object('ts',g.created_at,'kind','login','user',p.email,'text',left(coalesce(g.device,''),80),'demo',p.is_demo), g.created_at from public.login_events g join public.profiles p on p.id=g.user_id where p_demo or not p.is_demo
    ) q order by t desc limit least(greatest(coalesce(p_limit,100),1),500)
  ) z;
  return res;
end $$;

-- ---------- privileges (same allow-list as 002 plus the new functions) + realtime ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname<>'is_admin' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname in ('place_order','cancel_order','swap_quote','swap_execute','request_withdrawal','agent_save','agent_action','rent_bot','rental_action','mark_notifications_read','save_notification_prefs','update_profile','start_kyc','bot_stats',
                     'demo_reset','demo_topup',
                     'admin_review_withdrawal','admin_credit_deposit','admin_set_deposit_address','admin_set_kyc','admin_set_bot_available','admin_set_network','admin_set_setting','admin_adjust_balance','admin_overview','admin_stats','admin_events') then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
grant execute on function public.is_admin() to authenticated;

do $$ declare t text; begin
  foreach t in array array['agent_log'] loop
    begin execute format('alter publication supabase_realtime add table public.%I',t); exception when duplicate_object then null; when undefined_object then null; end;
  end loop; end $$;

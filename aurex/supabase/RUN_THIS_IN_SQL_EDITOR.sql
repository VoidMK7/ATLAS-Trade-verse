-- NovaTrade FULL backend setup (002 + 003 + 004) for a fresh project. Paste ALL into Supabase > SQL Editor > New query > Run. Safe to re-run.

-- 002_trading_logic: server-side logic for the existing 001_schema (additive: new functions, indexes, one table, one auth trigger).
-- All money-moving writes happen in SECURITY DEFINER functions: atomic, row-locked, idempotent. Clients keep SELECT-only RLS.
-- Prices come from public.market_prices, kept fresh by the market-feed edge function (see supabase/functions/market-feed).

create table if not exists public.price_ticks(symbol text not null, ts timestamptz not null default now(), price numeric not null);
create index if not exists price_ticks_sym_ts on public.price_ticks(symbol, ts desc);
alter table public.price_ticks enable row level security;

create unique index if not exists agents_one_own on public.agents(user_id) where kind='own';
create unique index if not exists orders_idem on public.orders(user_id,idem_key) where idem_key is not null;
create unique index if not exists swaps_idem on public.swaps(user_id,idem_key) where idem_key is not null;
create unique index if not exists withdrawals_idem on public.withdrawals(user_id,idem_key) where idem_key is not null;
create unique index if not exists rentals_idem on public.rentals(user_id,idem_key) where idem_key is not null;
create unique index if not exists deposits_txid on public.deposits(coin,network,txid) where txid is not null;
create unique index if not exists notifications_dedupe on public.notifications(user_id,dedupe_key) where dedupe_key is not null;

-- ---------- helpers ----------
create or replace function public._setting(k text) returns numeric language sql stable security definer set search_path=public as
$$ select value::numeric from public.settings where key=k $$;

create or replace function public._price(c text) returns numeric language plpgsql stable security definer set search_path=public as $$
declare p numeric; age numeric := coalesce(public._setting('price_max_age_seconds'),120);
begin
  if c='USDT' then return 1; end if;
  select price into p from public.market_prices where symbol=c||'/USDT' and updated_at > now()-make_interval(secs=>age);
  if p is null or p<=0 then raise exception 'Market price for % is unavailable right now. Try again shortly.',c using hint='price_unavailable'; end if;
  return p;
end $$;

create or replace function public._notify(u uuid,t text,ti text,m text,d text default null) returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,type,title,message,dedupe_key) values(u,t,ti,m,d) on conflict do nothing;
end $$;

create or replace function public._act(u uuid,t text,c text,a numeric,s text,r text,d text) returns uuid language plpgsql security definer set search_path=public as $$
declare i uuid; begin insert into public.activity(user_id,type,coin,amount,status,ref,detail) values(u,t,c,a,s,r,d) returning id into i; return i; end $$;

create or replace function public._bal_avail(u uuid,c text) returns numeric language plpgsql security definer set search_path=public as $$
declare a numeric;
begin
  insert into public.balances(user_id,coin) values(u,c) on conflict do nothing;
  select total-locked into a from public.balances where user_id=u and coin=c for update;
  return a;
end $$;

create or replace function public._bal_add(u uuid,c text,dt numeric,dl numeric) returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.balances(user_id,coin) values(u,c) on conflict do nothing;
  update public.balances set total=total+dt, locked=locked+dl, updated_at=now() where user_id=u and coin=c;
end $$;

create or replace function public._uid() returns uuid language plpgsql stable as $$
declare u uuid := auth.uid();
begin if u is null then raise exception 'Not authenticated' using hint='unauthorized'; end if; return u; end $$;

create or replace function public._need_admin() returns uuid language plpgsql stable security definer set search_path=public as $$
begin if not public.is_admin() then raise exception 'Administrator access required' using hint='forbidden'; end if; return auth.uid(); end $$;

-- ---------- new user bootstrap ----------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,display_name) values(new.id,new.email,split_part(new.email,'@',1)) on conflict do nothing;
  insert into public.notification_prefs(user_id) values(new.id) on conflict do nothing;
  perform public._notify(new.id,'security','Welcome','Your account is ready. Deposit funds to start trading.','welcome');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- backfill profiles for users that signed up before the trigger existed
insert into public.profiles(id,email,display_name) select u.id,u.email,split_part(u.email,'@',1) from auth.users u on conflict do nothing;
insert into public.notification_prefs(user_id) select id from public.profiles on conflict do nothing;

-- ---------- spot orders ----------
create or replace function public.fill_order(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; mp numeric; fp numeric; rate numeric := public._setting('spot_fee_rate'); base text; cost numeric; v_fee numeric;
begin
  select * into o from public.orders where id=p_id for update;
  if not found or o.status<>'open' then return; end if;
  base := split_part(o.symbol,'/',1);
  mp := public._price(base);
  if o.type='limit' and ((o.side='buy' and mp>o.price) or (o.side='sell' and mp<o.price)) then return; end if;
  fp := case when o.type='limit' then (case o.side when 'buy' then least(o.price,mp) else greatest(o.price,mp) end) else mp end;
  if o.locked_amount>0 then perform public._bal_add(o.user_id,o.locked_coin,0,-o.locked_amount); end if;
  cost := fp*o.amount; v_fee := cost*rate;
  if o.side='buy' then
    if public._bal_avail(o.user_id,'USDT') < cost+v_fee then
      update public.orders set status='rejected', locked_amount=0 where id=o.id;
      perform public._notify(o.user_id,'orders','Order rejected','Insufficient USDT balance at execution.');
      return;
    end if;
    perform public._bal_add(o.user_id,'USDT',-(cost+v_fee),0);
    perform public._bal_add(o.user_id,base,o.amount,0);
  else
    if public._bal_avail(o.user_id,base) < o.amount then
      update public.orders set status='rejected', locked_amount=0 where id=o.id;
      perform public._notify(o.user_id,'orders','Order rejected','Insufficient '||base||' balance at execution.');
      return;
    end if;
    perform public._bal_add(o.user_id,base,-o.amount,0);
    perform public._bal_add(o.user_id,'USDT',cost-v_fee,0);
  end if;
  update public.orders set status='filled', filled_price=fp, fee=v_fee, filled_at=now(), locked_amount=0 where id=o.id;
  update public.activity set status='completed' where user_id=o.user_id and ref=o.id::text and type='order';
  perform public._act(o.user_id,'trade',base,o.amount,'completed',o.id::text, upper(o.side)||' '||o.symbol||' @ '||fp);
  perform public._notify(o.user_id,'orders','Order filled',upper(o.side)||' '||o.amount||' '||base||' at '||round(fp,6)||' USDT', 'fill-'||o.id);
end $$;

create or replace function public.place_order(p_symbol text,p_side text,p_type text,p_amount numeric,p_price numeric default null,p_idem text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); o public.orders%rowtype; base text; mp numeric; px numeric; rate numeric := public._setting('spot_fee_rate');
        minn numeric := public._setting('min_order_usdt'); lockc text; locka numeric := 0;
begin
  if p_idem is not null then select * into o from public.orders where user_id=u and idem_key=p_idem; if found then return to_jsonb(o); end if; end if;
  if p_side not in ('buy','sell') or p_type not in ('market','limit') then raise exception 'Invalid order' using hint='invalid'; end if;
  if p_symbol !~ '^[A-Z]+/USDT$' then raise exception 'Unsupported pair' using hint='unsupported_pair'; end if;
  base := split_part(p_symbol,'/',1);
  if not exists(select 1 from public.coins where symbol=base and enabled) or base='USDT' then raise exception 'This trading pair is not supported' using hint='unsupported_pair'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Enter an amount greater than zero' using hint='invalid'; end if;
  mp := public._price(base);
  if p_type='limit' then if p_price is null or p_price<=0 then raise exception 'Enter a valid limit price' using hint='invalid'; end if; px:=p_price; else px:=mp; end if;
  if px*p_amount < minn then raise exception 'Minimum order value is % USDT',minn using hint='below_min'; end if;
  if p_side='buy' then
    lockc:='USDT'; locka := px*p_amount*(1+rate);
    if public._bal_avail(u,'USDT') < locka then raise exception 'Insufficient USDT balance' using hint='insufficient'; end if;
  else
    lockc:=base; locka := p_amount;
    if public._bal_avail(u,base) < locka then raise exception 'Insufficient % balance',base using hint='insufficient'; end if;
  end if;
  if p_type='limit' then
    perform public._bal_add(u,lockc,0,locka);
    insert into public.orders(user_id,symbol,side,type,price,amount,status,locked_coin,locked_amount,idem_key) values(u,p_symbol,p_side,p_type,p_price,p_amount,'open',lockc,locka,p_idem) returning * into o;
    perform public._act(u,'order',base,p_amount,'pending',o.id::text,'Limit '||p_side||' '||p_symbol||' @ '||p_price);
  else
    insert into public.orders(user_id,symbol,side,type,amount,status,idem_key) values(u,p_symbol,p_side,p_type,p_amount,'open',p_idem) returning * into o;
  end if;
  perform public.fill_order(o.id);
  select * into o from public.orders where id=o.id;
  return to_jsonb(o);
end $$;

create or replace function public.cancel_order(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); o public.orders%rowtype;
begin
  select * into o from public.orders where id=p_id and user_id=u for update;
  if not found then raise exception 'Order not found' using hint='not_found'; end if;
  if o.status<>'open' then raise exception 'Only open orders can be cancelled' using hint='not_cancellable'; end if;
  if o.locked_amount>0 then perform public._bal_add(u,o.locked_coin,0,-o.locked_amount); end if;
  update public.orders set status='cancelled', locked_amount=0 where id=o.id;
  update public.activity set status='cancelled' where user_id=u and ref=o.id::text and type='order';
  select * into o from public.orders where id=p_id; return to_jsonb(o);
end $$;

create or replace function public.match_open_orders() returns int language plpgsql security definer set search_path=public as $$
declare r record; n int := 0;
begin
  for r in select id from public.orders where status='open' and type='limit' order by created_at loop
    begin perform public.fill_order(r.id); n := n+1; exception when others then null; end;
  end loop;
  return n;
end $$;

-- ---------- swap ----------
create or replace function public.swap_quote(p_from text,p_to text,p_amount numeric) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); pf numeric; pt numeric; rate numeric; fee numeric; rcv numeric; id uuid; minu numeric := public._setting('min_swap_usd'); fr numeric := public._setting('swap_fee_rate'); av numeric;
begin
  if p_from=p_to then raise exception 'Choose two different coins' using hint='invalid'; end if;
  if not exists(select 1 from public.coins where symbol=p_from and enabled) or not exists(select 1 from public.coins where symbol=p_to and enabled) then raise exception 'Unsupported coin' using hint='unsupported'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Enter an amount' using hint='invalid'; end if;
  pf := public._price(p_from); pt := public._price(p_to);
  if p_amount*pf < minu then raise exception 'Minimum conversion is about % USD',minu using hint='below_min'; end if;
  select b.total-b.locked into av from public.balances b where b.user_id=u and b.coin=p_from;
  if av is null or av < p_amount then raise exception 'Insufficient % balance',p_from using hint='insufficient'; end if;
  rate := pf/pt; fee := p_amount*rate*fr; rcv := p_amount*rate - fee;
  insert into public.swap_quotes(user_id,from_coin,to_coin,amount,rate,fee,receive,expires_at) values(u,p_from,p_to,p_amount,rate,fee,rcv,now()+interval '15 seconds') returning swap_quotes.id into id;
  return jsonb_build_object('id',id,'from',p_from,'to',p_to,'amount',p_amount,'rate',rate,'fee',fee,'feeCoin',p_to,'receive',rcv,'expiresAt',extract(epoch from now()+interval '15 seconds')*1000,'minUsd',minu);
end $$;

create or replace function public.swap_execute(p_quote uuid,p_idem text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); q public.swap_quotes%rowtype; s public.swaps%rowtype; rate numeric;
begin
  if p_idem is not null then select * into s from public.swaps where user_id=u and idem_key=p_idem; if found then return to_jsonb(s); end if; end if;
  select * into q from public.swap_quotes where id=p_quote and user_id=u for update;
  if not found or q.used then raise exception 'Quote not found or already used' using hint='quote_invalid'; end if;
  if q.expires_at < now() then raise exception 'This quote has expired. Please refresh.' using hint='quote_expired'; end if;
  rate := public._price(q.from_coin)/public._price(q.to_coin);
  if abs(rate/q.rate-1) > 0.003 then raise exception 'The price moved. Please request a new quote.' using hint='price_moved'; end if;
  if public._bal_avail(u,q.from_coin) < q.amount then raise exception 'Insufficient % balance',q.from_coin using hint='insufficient'; end if;
  perform public._bal_add(u,q.from_coin,-q.amount,0);
  perform public._bal_add(u,q.to_coin,q.receive,0);
  update public.swap_quotes set used=true where id=q.id;
  insert into public.swaps(user_id,from_coin,to_coin,amount,receive,rate,fee,status,idem_key) values(u,q.from_coin,q.to_coin,q.amount,q.receive,q.rate,q.fee,'completed',p_idem) returning * into s;
  perform public._act(u,'conversion',q.from_coin,q.amount,'completed',s.id::text,'to '||round(q.receive,8)||' '||q.to_coin);
  perform public._notify(u,'orders','Conversion completed',q.amount||' '||q.from_coin||' → '||round(q.receive,8)||' '||q.to_coin,'swap-'||s.id);
  return to_jsonb(s);
end $$;

-- ---------- withdrawals ----------
create or replace function public.request_withdrawal(p_coin text,p_network text,p_address text,p_memo text,p_amount numeric,p_idem text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); n public.networks%rowtype; w public.withdrawals%rowtype; kyc text; lim numeric; used numeric; mfa boolean;
begin
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

create or replace function public.admin_review_withdrawal(p_id uuid,p_action text,p_txid text default null,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a uuid := public._need_admin(); w public.withdrawals%rowtype;
begin
  select * into w from public.withdrawals where id=p_id for update;
  if not found then raise exception 'Withdrawal not found' using hint='not_found'; end if;
  if p_action='approve' and w.status='pending' then
    update public.withdrawals set status='processing', reviewed_by=a, reviewed_at=now(), note=p_note where id=p_id;
  elsif p_action='complete' and w.status in ('pending','processing') then
    if coalesce(p_txid,'')='' then raise exception 'Transaction hash required' using hint='invalid'; end if;
    perform public._bal_add(w.user_id,w.coin,-w.amount,-w.amount);
    update public.withdrawals set status='completed', txid=p_txid, reviewed_by=a, reviewed_at=now(), note=p_note where id=p_id;
  elsif p_action='reject' and w.status in ('pending','processing') then
    perform public._bal_add(w.user_id,w.coin,0,-w.amount);
    update public.withdrawals set status='rejected', reviewed_by=a, reviewed_at=now(), note=p_note where id=p_id;
  else raise exception 'Action not allowed in status %',w.status using hint='invalid_state'; end if;
  update public.activity set status=(select status from public.withdrawals where id=p_id) where ref=p_id::text and type='withdrawal';
  perform public._notify(w.user_id,'withdrawals','Withdrawal '||(select status from public.withdrawals where id=p_id),w.amount||' '||w.coin,'wd-'||p_id||'-'||p_action);
  insert into public.audit_log(actor,action,target,detail) values(a,'withdrawal_'||p_action,p_id::text,jsonb_build_object('txid',p_txid,'note',p_note));
  return (select to_jsonb(x) from public.withdrawals x where id=p_id);
end $$;

-- ---------- deposits (admin UI, or your custody webhook using the service role) ----------
create or replace function public.admin_credit_deposit(p_user uuid,p_coin text,p_network text,p_amount numeric,p_txid text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a uuid; d public.deposits%rowtype; n public.networks%rowtype;
begin
  if auth.role()<>'service_role' then a := public._need_admin(); end if;
  if coalesce(p_txid,'')='' then raise exception 'Transaction id required' using hint='invalid'; end if;
  select * into n from public.networks where coin=p_coin and code=p_network;
  if not found then raise exception 'Unknown coin/network' using hint='unsupported'; end if;
  if p_amount<=0 then raise exception 'Invalid amount' using hint='invalid'; end if;
  if exists(select 1 from public.deposits where coin=p_coin and network=p_network and txid=p_txid) then raise exception 'Deposit already credited' using hint='duplicate'; end if;
  insert into public.deposits(user_id,coin,network,amount,status,txid,confirmations,required) values(p_user,p_coin,p_network,p_amount,'completed',p_txid,n.confirmations,n.confirmations) returning * into d;
  perform public._bal_add(p_user,p_coin,p_amount,0);
  perform public._act(p_user,'deposit',p_coin,p_amount,'completed',d.id::text,p_network||' '||p_txid);
  perform public._notify(p_user,'deposits','Deposit confirmed',p_amount||' '||p_coin||' credited to your wallet.','dep-'||d.id);
  insert into public.audit_log(actor,action,target,detail) values(a,'credit_deposit',d.id::text,jsonb_build_object('user',p_user,'coin',p_coin,'amount',p_amount,'txid',p_txid));
  return to_jsonb(d);
end $$;

create or replace function public.admin_set_deposit_address(p_user uuid,p_coin text,p_network text,p_address text,p_memo text default null)
returns void language plpgsql security definer set search_path=public as $$
declare a uuid;
begin
  if auth.role()<>'service_role' then a := public._need_admin(); end if;
  insert into public.deposit_addresses(user_id,coin,network,address,memo) values(p_user,p_coin,p_network,p_address,p_memo)
  on conflict(user_id,coin,network) do update set address=excluded.address, memo=excluded.memo;
  insert into public.audit_log(actor,action,target,detail) values(a,'set_deposit_address',p_user::text,jsonb_build_object('coin',p_coin,'network',p_network));
end $$;

-- ---------- AI agent engine (ledger mode: fills at the platform market price; no exchange connection) ----------
create or replace function public._sig(p_symbol text,p_strategy text) returns int language plpgsql stable security definer set search_path=public as $$
declare a numeric[]; n int; s5 numeric; s20 numeric; sd numeric; px numeric; ret numeric;
begin
  select array_agg(price order by ts desc) into a from (select price,ts from public.price_ticks where symbol=p_symbol and ts>now()-interval '3 hours' order by ts desc limit 20) t;
  n := coalesce(array_length(a,1),0); if n<20 then return 0; end if;
  px := a[1]; select avg(x) into s20 from unnest(a) x; select avg(x) into s5 from unnest(a[1:5]) x; select stddev_pop(x) into sd from unnest(a) x;
  if p_strategy='trend' then return case when s5>s20*1.0005 then 1 when s5<s20*0.9995 then -1 else 0 end;
  elsif p_strategy='meanrev' then if sd is null or sd=0 then return 0; end if; return case when (px-s20)/sd < -1.5 then 1 when (px-s20)/sd > 0.5 then -1 else 0 end;
  elsif p_strategy='momentum' then ret := px/a[10]-1; return case when ret>0.003 then 1 when ret<-0.003 then -1 else 0 end;
  elsif p_strategy='dca' then return 1;
  end if; return 0;
end $$;

create or replace function public.agent_liquidate(p_agent uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare a public.agents%rowtype; pos record; px numeric; rate numeric := public._setting('spot_fee_rate'); fee numeric; pnl numeric; proceeds numeric; cash numeric;
begin
  select * into a from public.agents where id=p_agent for update; if not found then return; end if;
  cash := a.cash;
  for pos in select * from public.agent_positions where agent_id=p_agent loop
    begin px := public._price(split_part(pos.symbol,'/',1)); exception when others then px := pos.avg_price; end;
    proceeds := px*pos.qty; fee := proceeds*rate; pnl := (px-pos.avg_price)*pos.qty - fee;
    insert into public.agent_trades(agent_id,user_id,bot_id,symbol,side,price,qty,fee,pnl,reason) values(p_agent,a.user_id,a.bot_id,pos.symbol,'sell',px,pos.qty,fee,pnl,p_reason);
    cash := cash + proceeds - fee;
    perform public._bal_add(a.user_id,'USDT',pnl,pnl);
    delete from public.agent_positions where agent_id=p_agent and symbol=pos.symbol;
  end loop;
  if cash>0 then perform public._bal_add(a.user_id,'USDT',0,-cash); end if;
  update public.agents set cash=0, updated_at=now() where id=p_agent;
end $$;

create or replace function public.agent_tick() returns int language plpgsql security definer set search_path=public as $$
declare a record; sym text; pos public.agent_positions%rowtype; px numeric; s int; notional numeric; qty numeric; fee numeric; pnl numeric; proceeds numeric; n int := 0; day_pnl numeric;
        rate numeric := public._setting('spot_fee_rate'); has boolean; reason text;
begin
  for a in select * from public.agents where status='running' loop
    begin
      select coalesce(sum(t.pnl),0) into day_pnl from public.agent_trades t where t.agent_id=a.id and t.created_at>now()-interval '24 hours';
      if day_pnl <= -a.max_daily_loss then
        perform public.agent_liquidate(a.id,'Daily loss limit reached');
        update public.agents set status='halted', halted_reason='Maximum daily loss reached', updated_at=now() where id=a.id;
        perform public._notify(a.user_id,'ai','Agent halted',a.name||' hit its daily loss limit of '||a.max_daily_loss||' USDT.','halt-'||a.id||'-'||current_date);
        continue;
      end if;
      foreach sym in array a.pairs loop
        px := public._price(split_part(sym,'/',1));
        select * into pos from public.agent_positions where agent_id=a.id and symbol=sym; has := found;
        s := public._sig(sym,a.strategy);
        if has then
          reason := case when px<=pos.avg_price*(1-a.stop_loss/100) then 'Stop-loss' when px>=pos.avg_price*(1+a.take_profit/100) then 'Take-profit' when s=-1 and a.strategy<>'dca' then 'Signal exit' end;
          if reason is not null then
            proceeds := px*pos.qty; fee := proceeds*rate; pnl := (px-pos.avg_price)*pos.qty - fee;
            insert into public.agent_trades(agent_id,user_id,bot_id,symbol,side,price,qty,fee,pnl,reason) values(a.id,a.user_id,a.bot_id,sym,'sell',px,pos.qty,fee,pnl,reason);
            update public.agents set cash=cash+proceeds-fee where id=a.id;
            perform public._bal_add(a.user_id,'USDT',pnl,pnl);
            delete from public.agent_positions where agent_id=a.id and symbol=sym; n := n+1;
          end if;
        elsif s=1 and not (a.strategy='dca' and exists(select 1 from public.agent_trades x where x.agent_id=a.id and x.symbol=sym and x.side='buy' and x.created_at>now()-interval '6 hours')) then
          notional := least((select g.cash from public.agents g where g.id=a.id), a.capital*a.max_alloc/100);
          if notional >= 5 then
            qty := notional/px; fee := notional*rate;
            insert into public.agent_positions(agent_id,symbol,qty,avg_price) values(a.id,sym,qty,px);
            insert into public.agent_trades(agent_id,user_id,bot_id,symbol,side,price,qty,fee,pnl,reason) values(a.id,a.user_id,a.bot_id,sym,'buy',px,qty,fee,-fee,a.strategy||' signal');
            update public.agents set cash=cash-notional-fee where id=a.id;
            perform public._bal_add(a.user_id,'USDT',-fee,-fee); n := n+1;
          end if;
        end if;
      end loop;
      update public.agents set last_run=now() where id=a.id;
    exception when others then
      insert into public.job_runs(job,status,error) values('agent_tick','failed',sqlerrm);
    end;
  end loop;
  return n;
end $$;

create or replace function public.agent_save(p_name text,p_strategy text,p_pairs text[],p_capital numeric,p_risk text,p_stop_loss numeric,p_take_profit numeric,p_max_alloc numeric,p_max_daily_loss numeric,p_mode text default 'ledger')
returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); a public.agents%rowtype; sym text;
begin
  if p_mode<>'ledger' then raise exception 'Live exchange trading is not connected on this platform. Use ledger mode.' using hint='live_not_available'; end if;
  if coalesce(trim(p_name),'')='' or length(p_name)>40 then raise exception 'Enter a name (max 40 characters)' using hint='invalid'; end if;
  if p_strategy not in ('trend','meanrev','momentum','dca') then raise exception 'Unknown strategy' using hint='invalid'; end if;
  if p_pairs is null or array_length(p_pairs,1) is null then raise exception 'Select at least one pair' using hint='invalid'; end if;
  foreach sym in array p_pairs loop if not exists(select 1 from public.market_prices where symbol=sym) then raise exception 'Unsupported pair %',sym using hint='unsupported_pair'; end if; end loop;
  if p_capital is null or p_capital<=0 then raise exception 'Capital must be greater than zero' using hint='invalid'; end if;
  if p_risk not in ('low','medium','high') or p_stop_loss<=0 or p_stop_loss>=100 or p_take_profit<=0 or p_max_alloc<=0 or p_max_alloc>100 or p_max_daily_loss<=0 then raise exception 'Check your risk settings' using hint='invalid'; end if;
  select * into a from public.agents where user_id=u and kind='own' for update;
  if found and a.status in ('running','paused') then raise exception 'Stop the agent before changing its settings' using hint='invalid_state'; end if;
  if found then
    update public.agents set name=p_name,strategy=p_strategy,pairs=p_pairs,capital=p_capital,risk=p_risk,stop_loss=p_stop_loss,take_profit=p_take_profit,max_alloc=p_max_alloc,max_daily_loss=p_max_daily_loss,mode='ledger',updated_at=now() where id=a.id returning * into a;
  else
    insert into public.agents(user_id,kind,name,strategy,pairs,capital,risk,stop_loss,take_profit,max_alloc,max_daily_loss,mode) values(u,'own',p_name,p_strategy,p_pairs,p_capital,p_risk,p_stop_loss,p_take_profit,p_max_alloc,p_max_daily_loss,'ledger') returning * into a;
  end if;
  return to_jsonb(a);
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
    perform public._notify(u,'ai','AI agent started',a.name||' is trading '||a.capital||' USDT in ledger mode.');
  elsif p_action='pause' and a.status='running' then update public.agents set status='paused',updated_at=now() where id=a.id;
  elsif p_action='resume' and a.status='paused' then update public.agents set status='running',updated_at=now() where id=a.id;
  elsif p_action='stop' and a.status in ('running','paused') then
    perform public.agent_liquidate(a.id,'Stopped by user');
    update public.agents set status='stopped',updated_at=now() where id=a.id;
    perform public._notify(u,'ai','AI agent stopped','Positions were closed and funds released.');
  else raise exception 'Action not allowed in status %',a.status using hint='invalid_state'; end if;
  select * into a from public.agents where id=a.id; return to_jsonb(a);
end $$;

-- ---------- bot rentals ----------
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
  perform public._act(u,'rental','USDT',fee,'completed',r.id::text,'Rental fee — '||b.name||' ('||p_plan||')');
  perform public._notify(u,'rentals','Bot rental confirmed',b.name||' · '||p_plan,'rent-'||r.id);
  return to_jsonb(r);
end $$;

create or replace function public.rental_action(p_id uuid,p_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); r public.rentals%rowtype;
begin
  select * into r from public.rentals where id=p_id and user_id=u for update;
  if not found then raise exception 'Rental not found' using hint='not_found'; end if;
  if p_action='pause' and r.status='active' then update public.rentals set status='paused' where id=p_id; update public.agents set status='paused' where id=r.agent_id;
  elsif p_action='resume' and r.status='paused' then update public.rentals set status='active' where id=p_id; update public.agents set status='running' where id=r.agent_id;
  elsif p_action='cancel' and r.status in ('active','paused') then
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
    perform public.agent_liquidate(r.agent_id,'Rental expired');
    update public.agents set status='stopped' where id=r.agent_id;
    update public.rentals set status='expired' where id=r.id;
    perform public._notify(r.user_id,'rentals','Bot rental expired','Positions closed and allocation released.','rente-'||r.id);
    n := n+1;
  end loop; return n;
end $$;

-- honest, aggregate-only bot track record computed from real platform executions (no user data exposed)
create or replace function public.bot_stats() returns table(bot_id text, trades bigint, sells bigint, wins bigint, total_pnl numeric, first_trade timestamptz)
language sql stable security definer set search_path=public as $$
  select t.bot_id, count(*), count(*) filter (where t.side='sell'), count(*) filter (where t.side='sell' and t.pnl>0), coalesce(sum(t.pnl),0), min(t.created_at)
  from public.agent_trades t where t.bot_id is not null group by t.bot_id
$$;

-- ---------- alerts, snapshots, engine ----------
create or replace function public.check_price_alerts() returns int language plpgsql security definer set search_path=public as $$
declare r record; n int := 0;
begin
  for r in select al.id, al.user_id, al.symbol, al.dir, al.price, mp.price as cur from public.price_alerts al join public.market_prices mp on mp.symbol=al.symbol where al.active and mp.updated_at>now()-interval '5 minutes' and ((al.dir='above' and mp.price>=al.price) or (al.dir='below' and mp.price<=al.price)) loop
    update public.price_alerts set active=false, triggered_at=now() where id=r.id;
    perform public._notify(r.user_id,'alerts','Price alert',r.symbol||' is '||r.dir||' '||r.price||' (now '||round(r.cur,6)||')','alert-'||r.id); n := n+1;
  end loop; return n;
end $$;

create or replace function public.snapshot_portfolios() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  insert into public.portfolio_snapshots(user_id,value)
  select b.user_id, sum(b.total*coalesce(case when b.coin='USDT' then 1 else mp.price end,0)) from public.balances b left join public.market_prices mp on mp.symbol=b.coin||'/USDT'
  group by b.user_id having not exists(select 1 from public.portfolio_snapshots s where s.user_id=b.user_id and s.ts>now()-interval '55 minutes') and sum(b.total)>0;
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.run_engine() returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  r := jsonb_build_object('matched',public.match_open_orders(),'alerts',public.check_price_alerts(),'agent_trades',public.agent_tick(),'expired',public.expire_rentals(),'snapshots',public.snapshot_portfolios());
  delete from public.price_ticks where ts<now()-interval '3 days';
  insert into public.system_status(provider,status,detail,checked_at) values('engine','ok',r::text,now()) on conflict(provider) do update set status='ok',detail=excluded.detail,checked_at=now();
  return r;
end $$;

-- ---------- misc user RPCs ----------
create or replace function public.mark_notifications_read(p_ids uuid[] default null) returns void language sql security definer set search_path=public as
$$ update public.notifications set read=true where user_id=auth.uid() and (p_ids is null or id=any(p_ids)) $$;

create or replace function public.save_notification_prefs(p_push boolean,p_email boolean,p_telegram boolean,p_types jsonb) returns void language sql security definer set search_path=public as
$$ insert into public.notification_prefs(user_id,push,email,telegram,types) values(auth.uid(),p_push,p_email,p_telegram,p_types)
   on conflict(user_id) do update set push=excluded.push,email=excluded.email,telegram=excluded.telegram,types=excluded.types $$;

create or replace function public.update_profile(p_display_name text) returns void language sql security definer set search_path=public as
$$ update public.profiles set display_name=left(trim(p_display_name),40) where id=auth.uid() $$;

create or replace function public.start_kyc() returns text language plpgsql security definer set search_path=public as $$
declare u uuid := public._uid(); s text;
begin
  update public.profiles set kyc_status='review' where id=u and kyc_status in ('unverified','rejected') returning kyc_status into s;
  if s is null then select kyc_status into s from public.profiles where id=u; end if;
  return s;
end $$;

-- ---------- admin ----------
create or replace function public.admin_set_kyc(p_user uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$
declare a uuid := public._need_admin();
begin
  if p_status not in ('unverified','review','verified','rejected') then raise exception 'Invalid status' using hint='invalid'; end if;
  update public.profiles set kyc_status=p_status where id=p_user;
  insert into public.audit_log(actor,action,target,detail) values(a,'set_kyc',p_user::text,jsonb_build_object('status',p_status));
end $$;

create or replace function public.admin_set_bot_available(p_bot text,p_available boolean) returns void language plpgsql security definer set search_path=public as $$
declare a uuid := public._need_admin();
begin update public.bots set available=p_available where id=p_bot; insert into public.audit_log(actor,action,target,detail) values(a,'set_bot_available',p_bot,jsonb_build_object('available',p_available)); end $$;

create or replace function public.admin_set_network(p_id bigint,p_deposit boolean,p_withdraw boolean) returns void language plpgsql security definer set search_path=public as $$
declare a uuid := public._need_admin();
begin update public.networks set deposit_enabled=p_deposit, withdraw_enabled=p_withdraw where id=p_id; insert into public.audit_log(actor,action,target,detail) values(a,'set_network',p_id::text,jsonb_build_object('deposit',p_deposit,'withdraw',p_withdraw)); end $$;

create or replace function public.admin_set_setting(p_key text,p_value text) returns void language plpgsql security definer set search_path=public as $$
declare a uuid := public._need_admin();
begin
  if p_value !~ '^[0-9]+(\.[0-9]+)?$' then raise exception 'Numeric value required' using hint='invalid'; end if;
  update public.settings set value=p_value where key=p_key;
  insert into public.audit_log(actor,action,target,detail) values(a,'set_setting',p_key,jsonb_build_object('value',p_value));
end $$;

create or replace function public.admin_adjust_balance(p_user uuid,p_coin text,p_amount numeric,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare a uuid := public._need_admin();
begin
  if coalesce(trim(p_reason),'')='' then raise exception 'A reason is required' using hint='invalid'; end if;
  if p_amount<0 and public._bal_avail(p_user,p_coin) < -p_amount then raise exception 'Adjustment exceeds available balance' using hint='insufficient'; end if;
  perform public._bal_add(p_user,p_coin,p_amount,0);
  perform public._act(p_user,'adjustment',p_coin,p_amount,'completed',null,p_reason);
  insert into public.audit_log(actor,action,target,detail) values(a,'adjust_balance',p_user::text,jsonb_build_object('coin',p_coin,'amount',p_amount,'reason',p_reason));
end $$;

create or replace function public.admin_overview() returns jsonb language plpgsql security definer set search_path=public as $$
begin perform public._need_admin();
  return jsonb_build_object('users',(select count(*) from public.profiles),'pending_withdrawals',(select count(*) from public.withdrawals where status in ('pending','processing')),
   'active_agents',(select count(*) from public.agents where status='running'),'active_rentals',(select count(*) from public.rentals where status='active'),
   'orders_24h',(select count(*) from public.orders where created_at>now()-interval '24 hours'),'volume_24h',(select coalesce(sum(filled_price*amount),0) from public.orders where status='filled' and filled_at>now()-interval '24 hours'),
   'failed_jobs_24h',(select count(*) from public.job_runs where status='failed' and created_at>now()-interval '24 hours'));
end $$;

-- ---------- privileges: lock everything down, then grant deliberately ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname<>'is_admin' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname in ('place_order','cancel_order','swap_quote','swap_execute','request_withdrawal','agent_save','agent_action','rent_bot','rental_action','mark_notifications_read','save_notification_prefs','update_profile','start_kyc','bot_stats',
                     'admin_review_withdrawal','admin_credit_deposit','admin_set_deposit_address','admin_set_kyc','admin_set_bot_available','admin_set_network','admin_set_setting','admin_adjust_balance','admin_overview') then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
grant execute on function public.is_admin() to authenticated;

-- realtime for live UI updates
do $$ declare t text; begin
  foreach t in array array['balances','orders','notifications','activity','deposits','withdrawals','agents','agent_trades','rentals','market_prices','swaps'] loop
    begin execute format('alter publication supabase_realtime add table public.%I',t); exception when duplicate_object then null; when undefined_object then null; end;
  end loop; end $$;

-- Runs the market-feed edge function every 15 seconds (falls back to every minute if your pg_cron is too old for seconds).
-- Run AFTER 002 and 004, and after deploying the market-feed function.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.feed_secret(secret text primary key);
alter table public.feed_secret enable row level security;          -- no policies: invisible to anon/authenticated
revoke all on public.feed_secret from anon, authenticated;
insert into public.feed_secret(secret) select encode(gen_random_bytes(24),'hex') where not exists (select 1 from public.feed_secret);

do $$
declare cmd text := $c$
  select net.http_post(
    url := 'https://gijigzbknjgleunttlib.supabase.co/functions/v1/market-feed',
    headers := jsonb_build_object('content-type','application/json','x-feed-secret',(select secret from public.feed_secret limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 20000);
$c$;
begin
  perform cron.unschedule('market-feed') where exists (select 1 from cron.job where jobname='market-feed');
  begin perform cron.schedule('market-feed','15 seconds',cmd);
  exception when others then perform cron.schedule('market-feed','* * * * *',cmd); end;
end $$;

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

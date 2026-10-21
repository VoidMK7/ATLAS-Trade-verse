\set ON_ERROR_STOP on
\set QUIET on
-- Exercises the real functions as 'authenticated' users. Run after stub_001.sql + 002_trading_logic.sql (local only).
drop schema if exists tt cascade; create schema tt;
create or replace function tt.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated','aal','aal1')::text,true);
  execute 'set local role authenticated'; end $$;
create or replace function tt.as_anon() returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claim.role','anon',true); perform set_config('request.jwt.claims','{}',true);
  execute 'set local role anon'; end $$;
create or replace function tt.su() returns void language plpgsql as $$ begin execute 'reset role'; end $$;
create or replace function tt.ok(c boolean,m text) returns void language plpgsql as $$ begin if not coalesce(c,false) then raise exception 'ASSERT FAILED: %',m; end if; raise notice 'ok  - %',m; end $$;
create or replace function tt.fails(q text,h text,m text) returns void language plpgsql as $$
declare got text; begin
  begin execute q; exception when others then get stacked diagnostics got = pg_exception_hint; if got is distinct from h then raise exception 'ASSERT FAILED: % (expected hint %, got % / %)',m,h,got,sqlerrm; end if; raise notice 'ok  - % [%]',m,sqlerrm; return; end;
  raise exception 'ASSERT FAILED: % (did not fail)',m; end $$;
create or replace function tt.bal(u uuid,c text,out tot numeric,out lck numeric) language sql as $$ select coalesce((select total from public.balances where user_id=u and coin=c),0), coalesce((select locked from public.balances where user_id=u and coin=c),0) $$;

grant usage on schema tt to public;
grant execute on all functions in schema tt to public;
truncate public.balances, public.orders, public.activity, public.notifications, public.swaps, public.swap_quotes, public.withdrawals, public.deposits, public.agent_trades, public.agent_positions, public.rentals, public.agents, public.market_prices, public.price_ticks, public.audit_log, public.profiles, public.notification_prefs, public.user_roles, public.price_alerts cascade;
delete from auth.users;

do $$
declare A uuid := gen_random_uuid(); B uuid := gen_random_uuid(); o jsonb; o2 jsonb; q jsonb; w jsonb; s jsonb; r jsonb; ag jsonb; usdt0 numeric; t numeric; l numeric; n int;
begin
  insert into auth.users(id,email) values(A,'alice@test.dev'),(B,'admin@test.dev');
  insert into public.user_roles values(B,'admin');
  perform tt.ok((select count(*) from public.profiles)=2 and (select count(*) from public.notification_prefs)=2 and (select count(*) from public.notifications where dedupe_key='welcome')=2,'signup trigger creates profile, prefs, welcome notice');

  insert into public.market_prices(symbol,base,price,open24h,high,low,volume,change24h) values('BTC/USDT','BTC',60000,60000,61000,59000,1,0),('ETH/USDT','ETH',3000,3000,3100,2900,1,0),('SOL/USDT','SOL',150,150,155,145,1,0);

  -- deposits (admin only, idempotent on txid)
  perform tt.as_user(A);
  perform tt.fails($q$select public.admin_credit_deposit(gen_random_uuid(),'USDT','TRC20',100,'tx0')$q$,'forbidden','non-admin cannot credit deposits');
  perform tt.fails($q$select public.place_order('BTC/USDT','buy','market',0.001)$q$,'insufficient','cannot buy with zero balance');
  perform tt.su(); perform tt.as_user(B);
  perform public.admin_credit_deposit(A,'USDT','TRC20',10000,'tx-001');
  perform tt.fails(format($q$select public.admin_credit_deposit(%L,'USDT','TRC20',10000,'tx-001')$q$,A),'duplicate','duplicate txid is rejected');
  perform tt.su();
  perform tt.ok((select tot from tt.bal(A,'USDT'))=10000,'deposit credited exactly once');

  -- market buy
  perform tt.as_user(A);
  o := public.place_order('BTC/USDT','buy','market',0.01,null,'idem-1');
  perform tt.ok(o->>'status'='filled' and (o->>'filled_price')::numeric=60000,'market buy fills at server price');
  o2 := public.place_order('BTC/USDT','buy','market',0.01,null,'idem-1');
  perform tt.ok(o2->>'id'=o->>'id','same idempotency key returns the same order');
  perform tt.su();
  perform tt.ok((select tot from tt.bal(A,'USDT'))=10000-600-0.6 and (select tot from tt.bal(A,'BTC'))=0.01,'balances after buy: -600 USDT -0.6 fee, +0.01 BTC, charged once');
  perform tt.as_user(A);
  perform tt.fails($q$select public.place_order('BTC/USDT','buy','market',0.00001)$q$,'below_min','below minimum order value');
  perform tt.fails($q$select public.place_order('DOGE/USDT','buy','market',100)$q$,'price_unavailable','pair without a fresh server price is refused');
  perform tt.fails($q$select public.place_order('FOO/USDT','buy','market',1)$q$,'unsupported_pair','unknown pair is refused');
  perform tt.fails($q$select public.place_order('BTC/USDT','sell','market',5)$q$,'insufficient','cannot sell more than owned');

  -- limit order locks funds, cancel releases
  o := public.place_order('BTC/USDT','buy','limit',0.05,55000,'idem-2');
  perform tt.ok(o->>'status'='open','limit buy below market rests open');
  perform tt.su(); select tot,lck into t,l from tt.bal(A,'USDT'); perform tt.ok(l=55000*0.05*1.001,'limit order locks cost+fee');
  perform tt.as_user(A);
  perform public.cancel_order((o->>'id')::uuid);
  perform tt.su(); select tot,lck into t,l from tt.bal(A,'USDT'); perform tt.ok(l=0,'cancel releases the lock');
  perform tt.as_user(A);
  perform tt.fails(format($q$select public.cancel_order(%L)$q$,o->>'id'),'not_cancellable','cannot cancel twice');
  -- limit fills when price crosses
  o := public.place_order('BTC/USDT','buy','limit',0.02,58000);
  perform tt.su(); update public.market_prices set price=57000,updated_at=now() where symbol='BTC/USDT';
  perform public.match_open_orders();
  perform tt.ok((select status from public.orders where id=(o->>'id')::uuid)='filled' and (select filled_price from public.orders where id=(o->>'id')::uuid)=57000,'limit order fills at the better price when market crosses');
  update public.market_prices set price=60000,updated_at=now() where symbol='BTC/USDT';
  perform tt.ok((select lck from tt.bal(A,'USDT'))=0,'no stray locked funds');

  -- another user cannot touch this user's order
  perform tt.as_user(B); perform tt.fails(format($q$select public.cancel_order(%L)$q$,o->>'id'),'not_found','other users cannot cancel my order'); perform tt.su();

  -- swap: quote, execute, replay, expiry
  perform tt.as_user(A);
  q := public.swap_quote('BTC','ETH',0.01);
  perform tt.ok((q->>'receive')::numeric = 0.01*(60000.0/3000)*(1-0.002),'swap quote uses server prices and fee');
  s := public.swap_execute((q->>'id')::uuid,'sw-1');
  perform tt.ok(s->>'status'='completed','swap executes');
  perform tt.fails(format($q$select public.swap_execute(%L)$q$,q->>'id'),'quote_invalid','quote cannot be replayed');
  q := public.swap_quote('BTC','ETH',0.001);
  perform tt.su(); update public.swap_quotes set expires_at=now()-interval '1 second' where id=(q->>'id')::uuid; perform tt.as_user(A);
  perform tt.fails(format($q$select public.swap_execute(%L)$q$,q->>'id'),'quote_expired','expired quote is refused');
  q := public.swap_quote('BTC','ETH',0.001);
  perform tt.su(); update public.market_prices set price=61000,updated_at=now() where symbol='BTC/USDT'; perform tt.as_user(A);
  perform tt.fails(format($q$select public.swap_execute(%L)$q$,q->>'id'),'price_moved','quote refused when price moved >0.3%');
  perform tt.su(); update public.market_prices set price=60000,updated_at=now() where symbol='BTC/USDT'; perform tt.as_user(A);
  perform tt.fails($q$select public.swap_quote('BTC','BTC',1)$q$,'invalid','same-coin swap refused');
  perform tt.fails($q$select public.swap_quote('BTC','USDT',0.00001)$q$,'below_min','swap below minimum refused');

  -- withdrawals
  perform tt.fails($q$select public.request_withdrawal('USDT','TRC20','0xnotatronaddress',null,100)$q$,'invalid_address','bad address refused');
  perform tt.fails($q$select public.request_withdrawal('USDT','TRC20','TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',null,600)$q$,'limit_exceeded','unverified daily limit of 500 USD enforced');
  perform tt.fails($q$select public.request_withdrawal('USDT','TRC20','TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',null,5)$q$,'below_min','below network minimum refused');
  perform tt.fails($q$select public.request_withdrawal('XRP','XRP','rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',null,10)$q$,'memo_required','memo required for XRP');
  w := public.request_withdrawal('USDT','TRC20','TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',null,200,'wd-1');
  perform tt.ok(public.request_withdrawal('USDT','TRC20','TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',null,200,'wd-1')->>'id'=w->>'id','withdrawal idempotent');
  perform tt.su(); select tot,lck into t,l from tt.bal(A,'USDT'); perform tt.ok(l=200,'withdrawal locks funds while pending'); usdt0:=t;
  perform tt.as_user(B);
  perform public.admin_review_withdrawal((w->>'id')::uuid,'reject',null,'test');
  perform tt.su(); select tot,lck into t,l from tt.bal(A,'USDT'); perform tt.ok(l=0 and t=usdt0,'reject releases the lock and keeps the balance');
  perform tt.as_user(A); w := public.request_withdrawal('USDT','TRC20','TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',null,100,'wd-2'); perform tt.su();
  perform tt.as_user(A); perform tt.fails(format($q$select public.admin_review_withdrawal(%L,'complete','0xabc')$q$,w->>'id'),'forbidden','user cannot review withdrawals'); perform tt.su();
  perform tt.as_user(B); perform public.admin_review_withdrawal((w->>'id')::uuid,'approve'); perform public.admin_review_withdrawal((w->>'id')::uuid,'complete','0xdeadbeef');
  perform tt.fails(format($q$select public.admin_review_withdrawal(%L,'reject')$q$,w->>'id'),'invalid_state','completed withdrawal cannot be reversed'); perform tt.su();
  select tot,lck into t,l from tt.bal(A,'USDT'); perform tt.ok(l=0 and t=usdt0-100,'complete deducts the amount exactly once');
  perform tt.ok((select count(*) from public.audit_log where action like 'withdrawal_%')=3,'every admin action is audited');

  -- 2FA gate: verified factor + aal1 token must be refused
  insert into auth.mfa_factors(user_id,status) values(A,'verified');
  perform tt.as_user(A); perform tt.fails($q$select public.request_withdrawal('USDT','TRC20','TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',null,50)$q$,'mfa_required','withdrawal needs aal2 when 2FA is enrolled'); perform tt.su();
  delete from auth.mfa_factors;

  -- rentals + agents (ledger mode)
  perform tt.as_user(A);
  perform tt.fails($q$select public.rent_bot('atlas-trend','weekly',100)$q$,'below_min','rental below minimum allocation refused');
  perform tt.fails($q$select public.agent_save('x','trend',array['BTC/USDT'],1000,'medium',3,6,15,50,'live')$q$,'live_not_available','live mode refused');
  perform tt.su(); select tot,lck into t,l from tt.bal(A,'USDT'); usdt0:=t; perform tt.as_user(A);
  r := public.rent_bot('atlas-trend','weekly',500,'rent-1');
  perform tt.ok(public.rent_bot('atlas-trend','weekly',500,'rent-1')->>'id'=r->>'id','rental idempotent');
  perform tt.su(); select tot,lck into t,l from tt.bal(A,'USDT');
  perform tt.ok(t=usdt0-9 and l=500,'rental fee (9) is charged, allocation (500) is only locked');
  -- seed an uptrend so the trend agent buys, then a crash for stop-loss
  insert into public.price_ticks(symbol,ts,price) select 'BTC/USDT', now()-(i||' minutes')::interval, 60000-i*40 from generate_series(0,25) i;
  insert into public.price_ticks(symbol,ts,price) select 'ETH/USDT', now()-(i||' minutes')::interval, 3000-i*2 from generate_series(0,25) i;
  n := public.agent_tick();
  perform tt.ok(n>=1 and exists(select 1 from public.agent_positions),'rented trend bot opens a position on an uptrend signal');
  perform tt.ok((select max(g.cash) from public.agents g where g.kind='rental') < 500,'agent cash decreased by the position size');
  update public.market_prices set price=50000,updated_at=now() where symbol='BTC/USDT';
  update public.market_prices set price=2500,updated_at=now() where symbol='ETH/USDT';
  perform public.agent_tick();
  perform tt.ok(exists(select 1 from public.agent_trades where reason='Stop-loss'),'stop-loss closes the position');
  update public.market_prices set price=60000,updated_at=now() where symbol='BTC/USDT'; update public.market_prices set price=3000,updated_at=now() where symbol='ETH/USDT';
  perform tt.as_user(A); perform public.rental_action((r->>'id')::uuid,'cancel'); perform tt.su();
  select tot,lck into t,l from tt.bal(A,'USDT'); perform tt.ok(l=0,'cancelling a rental releases the full allocation');
  perform tt.ok((select count(*) from public.agent_positions)=0,'cancel liquidates open positions');
  perform tt.as_user(A); perform tt.fails(format($q$select public.rental_action(%L,'cancel')$q$,r->>'id'),'invalid_state','cancelled rental cannot be cancelled again'); perform tt.su();

  perform tt.as_user(A);
  perform public.agent_save('Mine','meanrev',array['ETH/USDT'],1000,'medium',3,6,15,50,'ledger');
  perform public.agent_action('start');
  perform tt.fails($q$select public.agent_save('Mine','meanrev',array['ETH/USDT'],1000,'medium',3,6,15,50)$q$,'invalid_state','cannot edit while running');
  perform tt.su(); select lck into l from tt.bal(A,'USDT'); perform tt.ok(l=1000,'starting the agent reserves capital'); perform tt.as_user(A);
  perform public.agent_action('stop'); perform tt.su();
  select lck into l from tt.bal(A,'USDT'); perform tt.ok(l=0,'stopping releases capital');

  -- daily loss halt
  perform tt.as_user(A); perform public.agent_save('Risky','trend',array['BTC/USDT'],1000,'high',3,6,15,10,'ledger'); perform public.agent_action('start'); perform tt.su();
  insert into public.agent_trades(agent_id,user_id,symbol,side,price,qty,fee,pnl,reason) select id,user_id,'BTC/USDT','sell',1,1,0,-25,'t' from public.agents where kind='own' and status='running';
  perform public.agent_tick();
  perform tt.ok((select status from public.agents where kind='own' and name='Risky')='halted','agent halts at the daily loss limit');

  -- privilege boundary
  perform tt.as_user(A);
  begin insert into public.balances(user_id,coin,total) values(A,'USDT',1e9); raise exception 'ASSERT FAILED: client could write balances'; exception when insufficient_privilege then raise notice 'ok  - clients cannot write balances directly'; end;
  declare cnt int; begin update public.orders set status='filled' where user_id=A; get diagnostics cnt=row_count; if cnt<>0 then raise exception 'ASSERT FAILED: client updated % orders',cnt; end if; raise notice 'ok  - clients cannot update orders directly (RLS: 0 rows)'; end;
  declare cnt2 int; begin update public.balances set total=1e9 where user_id=A; get diagnostics cnt2=row_count; if cnt2<>0 then raise exception 'ASSERT FAILED: client edited balances'; end if; raise notice 'ok  - clients cannot edit balances directly (RLS: 0 rows)'; end;
  begin perform 1 from public.balances where user_id=B; if found then raise exception 'ASSERT FAILED: read another user balances'; end if; raise notice 'ok  - users cannot read other users balances'; end;
  begin perform 1 from public.audit_log; if found then raise exception 'ASSERT FAILED: non-admin read audit log'; end if; raise notice 'ok  - non-admin cannot read audit log'; end;
  begin perform public.fill_order(gen_random_uuid()); raise exception 'ASSERT FAILED: internal fn callable'; exception when insufficient_privilege then raise notice 'ok  - internal functions are not callable by clients'; end;
  begin perform public.agent_tick(); raise exception 'ASSERT FAILED: engine callable'; exception when insufficient_privilege then raise notice 'ok  - engine functions are not callable by clients'; end;
  perform tt.su(); perform tt.as_anon();
  begin perform public.place_order('BTC/USDT','buy','market',1); raise exception 'ASSERT FAILED: anon placed order'; exception when insufficient_privilege then raise notice 'ok  - anonymous callers cannot place orders'; end;
  perform tt.su();
  -- conservation: sum of USDT movements explained
  perform tt.ok((select coalesce(sum(locked),0) from public.balances where locked<0)=0,'no negative locks');
  perform tt.ok(not exists(select 1 from public.balances where locked>total),'locked never exceeds total');
  raise notice 'ALL DB TESTS PASSED';
end $$;

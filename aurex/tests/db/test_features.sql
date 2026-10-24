\set ON_ERROR_STOP on
\set QUIET on
-- 004 features: categories, stale-quote handling, demo accounts, bot journal, admin statistics, privileges.
truncate public.balances, public.orders, public.activity, public.notifications, public.swaps, public.swap_quotes, public.withdrawals, public.deposits, public.agent_trades, public.agent_positions, public.agent_log, public.rentals, public.agents, public.market_prices, public.price_ticks, public.audit_log, public.profiles, public.notification_prefs, public.user_roles, public.price_alerts, public.login_events, public.demo_accounts cascade;
delete from auth.users;
do $$
declare A uuid := gen_random_uuid(); D uuid := gen_random_uuid(); B uuid := gen_random_uuid(); o jsonb; ag jsonb; st jsonb; ev jsonb; n int; t numeric; l numeric; cnt int;
begin
  insert into auth.users(id,email) values(A,'alice@test.dev'),(D,'demo-alice@demo.invalid'),(B,'admin@test.dev');
  insert into public.user_roles values(B,'admin');
  perform public.demo_provision(D);
  insert into public.market_prices(symbol,base,price,updated_at,quote_ts) values('BTC/USDT','BTC',60000,now(),null),('ETH/USDT','ETH',3000,now(),null),('AAPL/USDT','AAPL',200,now()-interval '2 hours','x'),('XAU/USDT','XAU',2400,now(),'y');
  perform tt.ok((select count(*) from public.coins where kind='stock')>=8 and (select count(*) from public.coins where kind='meme')>=5 and exists(select 1 from public.coins where symbol='XAU' and kind='commodity'),'stocks, memecoins and commodities are in the catalogue');
  perform tt.ok(public._price('XAU')=2400,'fresh stooq quote is tradable');
  perform tt.fails($q$select public._price('AAPL')$q$,'price_unavailable','closed-market stock quote is refused (stale)');
  update public.settings set value='100000' where key='price_max_age_stock';
  -- demo account
  perform tt.ok(public._is_demo(D) and not public._is_demo(A),'demo flag set only on the demo account');
  perform tt.ok((select tot from tt.bal(D,'USDT'))=100000,'demo account starts with 100000 USDT');
  perform tt.as_user(D);
  o := public.place_order('BTC/USDT','buy','market',0.5);
  perform tt.ok(o->>'status'='filled','demo account can trade');
  perform tt.fails($q$select public.request_withdrawal('USDT','TRC20','TXyz','',10)$q$,'demo_account','demo account cannot withdraw');
  perform public.demo_topup(5000);
  perform tt.su(); perform tt.ok((select tot from tt.bal(D,'USDT'))=100000-0.5*60000*1.001+5000,'demo top-up adds virtual money');
  perform tt.as_user(D); perform public.demo_reset(); perform tt.su();
  perform tt.ok((select tot from tt.bal(D,'USDT'))=100000 and (select tot from tt.bal(D,'BTC'))=0,'demo reset restores 100000 USDT and clears holdings');
  perform tt.as_user(A);
  perform tt.fails($q$select public.demo_reset()$q$,'forbidden','real accounts cannot use demo reset');
  perform tt.fails($q$select public.demo_topup(10)$q$,'forbidden','real accounts cannot mint virtual money');
  perform tt.su();
  -- bot journal: demo user runs an agent
  insert into public.price_ticks(symbol,ts,price) select 'BTC/USDT', now()-(i||' minutes')::interval, 60000-i*40 from generate_series(0,25) i;
  perform tt.as_user(D);
  perform public.agent_save('Demo bot','trend',array['BTC/USDT'],10000,'medium',3,6,15,500,'ledger'); perform public.agent_action('start');
  perform tt.su();
  perform tt.ok(exists(select 1 from public.agent_log where user_id=D and event='start'),'journal records the start with its settings');
  n := public.agent_tick();
  perform tt.ok(exists(select 1 from public.agent_log where user_id=D and event='buy' and message like 'BUY %' and detail ? 'price'),'journal records the buy with price and reasoning');
  update public.market_prices set price=50000,updated_at=now() where symbol='BTC/USDT';
  perform public.agent_tick();
  perform tt.ok(exists(select 1 from public.agent_log where user_id=D and event='sell' and message like '%Stop-loss%'),'journal records the stop-loss exit');
  perform tt.as_user(D); perform public.agent_action('stop'); perform tt.su();
  perform tt.ok(exists(select 1 from public.agent_log where user_id=D and event='stop'),'journal records the stop');
  -- throttled analysis notes do not flood
  perform public.agent_tick(); perform public.agent_tick();
  select count(*) into cnt from public.agent_log where user_id=D and event in ('analysis','hold','skip');
  perform tt.ok(cnt<=3,'routine analysis notes are throttled ('||cnt||' rows)');
  -- journal visibility
  perform tt.as_user(D); perform tt.ok((select count(*) from public.agent_log)>0,'user reads own journal');
  perform tt.su(); perform tt.as_user(A); perform tt.ok((select count(*) from public.agent_log)=0,'users cannot read other users journals'); perform tt.su();
  perform tt.as_user(B); perform tt.ok((select count(*) from public.agent_log)>0,'admin can read every journal'); perform tt.su();
  -- admin statistics
  perform tt.as_user(A); perform tt.fails($q$select public.admin_stats(7)$q$,'forbidden','non-admin cannot read statistics'); perform tt.fails($q$select public.admin_events(10)$q$,'forbidden','non-admin cannot read the event feed'); perform tt.su();
  perform tt.as_user(B);
  st := public.admin_stats(7);
  perform tt.ok(jsonb_array_length(st->'days')=7,'admin_stats returns one row per day');
  perform tt.ok((st->'totals'->>'bot_trades')::int=0 and (st->'totals'->>'users')::int=2,'demo activity is excluded by default');
  st := public.admin_stats(7,true);
  perform tt.ok((st->'totals'->>'bot_trades')::int>=2 and (st->'totals'->>'volume')::numeric>0,'demo activity can be included');
  ev := public.admin_events(50,true);
  perform tt.ok(jsonb_array_length(ev)>0 and exists(select 1 from jsonb_array_elements(ev) e where e->>'kind' like 'bot_%'),'event feed lists bot trades');
  perform tt.ok(jsonb_array_length(public.admin_events(50,false))<jsonb_array_length(ev),'event feed hides demo by default');
  perform tt.ok((public.admin_overview()->>'users')::int=2 and (public.admin_overview()->>'demo_users')::int=1,'overview separates demo users');
  perform tt.su();
  perform tt.as_user(A); begin perform public.demo_provision(D); raise exception 'ASSERT FAILED: demo_provision callable'; exception when insufficient_privilege then raise notice 'ok  - demo_provision is service-role only'; end; perform tt.su();
  perform tt.as_user(A); begin perform 1 from public.demo_accounts; raise exception 'ASSERT FAILED: demo secrets readable'; exception when insufficient_privilege then raise notice 'ok  - demo_accounts secrets are not readable by clients'; end; perform tt.su();
  perform tt.as_user(A); perform tt.ok((select count(*) from public.price_ticks)>0,'tick history is readable (public market data)'); perform tt.su();
  raise notice 'ALL FEATURE TESTS PASSED';
end $$;

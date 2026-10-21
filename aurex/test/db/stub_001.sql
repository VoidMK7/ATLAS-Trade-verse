-- LOCAL TEST STUB ONLY. Mirrors the live 001_schema (read from the project) plus minimal Supabase auth stubs.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table auth.users(id uuid primary key default gen_random_uuid(), email text);
create table auth.mfa_factors(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id), status text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'anon') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
grant usage on schema public, auth to anon, authenticated, service_role;
create publication supabase_realtime;

create table public.settings(key text primary key, value text not null);
create table public.profiles(id uuid primary key references auth.users(id), email text, display_name text, kyc_status text not null default 'unverified' check (kyc_status in ('unverified','review','verified','rejected')), created_at timestamptz not null default now());
create table public.user_roles(user_id uuid references auth.users(id), role text check (role='admin'), primary key(user_id,role));
create table public.coins(symbol text primary key, name text not null, market_cap numeric not null default 0, enabled boolean not null default true);
create table public.networks(id bigint generated always as identity primary key, coin text not null references public.coins(symbol), code text not null, name text not null, address_regex text not null, confirmations int not null, min_deposit numeric not null, withdraw_fee numeric not null, min_withdraw numeric not null, max_withdraw numeric not null, memo_required boolean not null default false, deposit_enabled boolean not null default true, withdraw_enabled boolean not null default true);
create table public.market_prices(symbol text primary key, base text not null, price numeric not null, open24h numeric, high numeric, low numeric, volume numeric, change24h numeric, updated_at timestamptz not null default now());
create table public.balances(user_id uuid references auth.users(id), coin text references public.coins(symbol), total numeric not null default 0 check (total>=0), locked numeric not null default 0 check (locked>=0), updated_at timestamptz not null default now(), primary key(user_id,coin));
create table public.activity(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), type text not null check (type in ('deposit','withdrawal','conversion','order','trade','bot','rental','fee','adjustment')), coin text not null, amount numeric not null, status text not null default 'completed', ref text, detail text, created_at timestamptz not null default now());
create table public.orders(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), symbol text not null, side text not null check (side in ('buy','sell')), type text not null check (type in ('market','limit')), price numeric, amount numeric not null check (amount>0), status text not null check (status in ('open','filled','cancelled','rejected')), filled_price numeric, fee numeric not null default 0, locked_coin text, locked_amount numeric not null default 0, idem_key text, created_at timestamptz not null default now(), filled_at timestamptz);
create table public.swap_quotes(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), from_coin text not null, to_coin text not null, amount numeric not null, rate numeric not null, fee numeric not null, receive numeric not null, expires_at timestamptz not null, used boolean not null default false, created_at timestamptz not null default now());
create table public.swaps(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), from_coin text not null, to_coin text not null, amount numeric not null, receive numeric not null, rate numeric not null, fee numeric not null, status text not null default 'completed', idem_key text, created_at timestamptz not null default now());
create table public.deposit_addresses(user_id uuid references auth.users(id), coin text, network text, address text not null, memo text, created_at timestamptz not null default now(), primary key(user_id,coin,network));
create table public.deposits(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), coin text not null, network text not null, amount numeric not null, status text not null default 'pending', txid text, confirmations int not null default 0, required int not null default 1, note text, created_at timestamptz not null default now());
create table public.withdrawals(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), coin text not null, network text not null, address text not null, memo text, amount numeric not null, fee numeric not null, status text not null default 'pending' check (status in ('pending','processing','completed','rejected','failed')), txid text, note text, idem_key text, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), type text not null, title text not null, message text not null, read boolean not null default false, dedupe_key text, created_at timestamptz not null default now());
create table public.notification_prefs(user_id uuid primary key references auth.users(id), push boolean not null default false, email boolean not null default true, telegram boolean not null default false, types jsonb not null default '{"ai": true, "alerts": true, "orders": true, "rentals": true, "deposits": true, "security": true, "withdrawals": true}');
create table public.price_alerts(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id), symbol text not null, dir text not null check (dir in ('above','below')), price numeric not null check (price>0), active boolean not null default true, triggered_at timestamptz, created_at timestamptz not null default now());
create table public.bots(id text primary key, name text not null, strategy text not null check (strategy in ('trend','meanrev','momentum','dca')), risk text not null check (risk in ('Low','Medium','High')), description text not null, coins text[] not null, frequency text not null, price_daily numeric not null, price_weekly numeric not null, price_monthly numeric not null, min_allocation numeric not null, stop_loss numeric not null, take_profit numeric not null, max_alloc numeric not null, available boolean not null default true, sort int not null default 0);
create table public.agents(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), kind text not null check (kind in ('own','rental')), bot_id text references public.bots(id), name text not null, strategy text not null check (strategy in ('trend','meanrev','momentum','dca')), pairs text[] not null, capital numeric not null check (capital>=0), cash numeric not null default 0, risk text not null default 'medium', stop_loss numeric not null default 3, take_profit numeric not null default 6, max_alloc numeric not null default 15, max_daily_loss numeric not null default 50, mode text not null default 'ledger' check (mode in ('ledger','live')), status text not null default 'stopped' check (status in ('stopped','running','paused','halted')), halted_reason text, started_at timestamptz, last_run timestamptz, updated_at timestamptz not null default now());
create table public.agent_positions(agent_id uuid references public.agents(id), symbol text, qty numeric not null, avg_price numeric not null, opened_at timestamptz not null default now(), primary key(agent_id,symbol));
create table public.agent_trades(id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.agents(id), user_id uuid not null references auth.users(id), bot_id text, symbol text not null, side text not null, price numeric not null, qty numeric not null, fee numeric not null, pnl numeric, reason text, created_at timestamptz not null default now());
create table public.rentals(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), bot_id text not null references public.bots(id), agent_id uuid references public.agents(id), plan text not null check (plan in ('daily','weekly','monthly')), fee numeric not null, allocation numeric not null, status text not null default 'active' check (status in ('active','paused','cancelled','expired')), idem_key text, starts_at timestamptz not null default now(), ends_at timestamptz not null);
create table public.portfolio_snapshots(user_id uuid references auth.users(id), ts timestamptz not null default now(), value numeric not null, primary key(user_id,ts));
create table public.login_events(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id), device text, created_at timestamptz not null default now());
create table public.news(id uuid primary key default gen_random_uuid(), title text not null, source text, url text, published_at timestamptz not null default now());
create table public.audit_log(id uuid primary key default gen_random_uuid(), actor uuid, action text not null, target text, detail jsonb, created_at timestamptz not null default now());
create table public.system_status(provider text primary key, status text not null, latency_ms int, detail text, checked_at timestamptz not null default now());
create table public.job_runs(id uuid primary key default gen_random_uuid(), job text not null, status text not null, error text, created_at timestamptz not null default now());
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') $$;

insert into public.settings values('spot_fee_rate','0.001'),('swap_fee_rate','0.002'),('min_order_usdt','5'),('min_swap_usd','10'),('price_max_age_seconds','120');
insert into public.coins(symbol,name,market_cap) values('USDT','Tether',1),('BTC','Bitcoin',9),('ETH','Ethereum',8),('SOL','Solana',7),('BNB','BNB',6),('XRP','XRP',5),('ADA','Cardano',4),('DOGE','Dogecoin',3),('AVAX','Avalanche',2),('LINK','Chainlink',1),('TON','Toncoin',1);
insert into public.networks(coin,code,name,address_regex,confirmations,min_deposit,withdraw_fee,min_withdraw,max_withdraw,memo_required) values
('BTC','BTC','Bitcoin','^(bc1[a-z0-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$',3,0.0002,0.0002,0.001,100,false),
('ETH','ERC20','Ethereum','^0x[a-fA-F0-9]{40}$',12,0.001,0.002,0.01,1000,false),
('USDT','ERC20','Ethereum','^0x[a-fA-F0-9]{40}$',12,5,5,10,50000,false),
('USDT','TRC20','Tron','^T[1-9A-HJ-NP-Za-km-z]{33}$',20,5,1,10,50000,false),
('XRP','XRP','XRP Ledger','^r[1-9A-HJ-NP-Za-km-z]{24,34}$',1,1,0.25,1,100000,true);
insert into public.bots values
('atlas-trend','Atlas Trend','trend','Low','Trend follower',array['BTC','ETH'],'~12 trades/week',3,9,24,200,3,6,15,true,1),
('reversion-fox','Reversion Fox','meanrev','Medium','Mean reversion',array['ETH','SOL'],'~30 trades/week',4,12,35,300,3,5,15,true,2),
('momentum-hawk','Momentum Hawk','momentum','High','Momentum',array['SOL','AVAX'],'~20 trades/week',6,19,59,500,4,8,20,true,3),
('steady-dca','Steady DCA','dca','Low','DCA',array['BTC','ETH'],'~4 trades/week',2,5,15,100,5,10,10,true,4);

-- Supabase default privileges + the LIVE RLS policies (copied from pg_policies on the project)
grant all on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
do $$ declare t text; begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
create policy own_activity on public.activity for select to authenticated using (user_id=auth.uid() or is_admin());
create policy own_pos on public.agent_positions for select to authenticated using (exists(select 1 from public.agents a where a.id=agent_positions.agent_id and (a.user_id=auth.uid() or is_admin())));
create policy own_atrades on public.agent_trades for select to authenticated using (user_id=auth.uid() or is_admin());
create policy own_agents on public.agents for select to authenticated using (user_id=auth.uid() or is_admin());
create policy adm_audit on public.audit_log for select to authenticated using (is_admin());
create policy own_balances on public.balances for select to authenticated using (user_id=auth.uid() or is_admin());
create policy adm_bots_i on public.bots for insert to authenticated with check (is_admin());
create policy adm_bots_u on public.bots for update to authenticated using (is_admin()) with check (is_admin());
create policy ref_read_bots on public.bots for select to authenticated using (true);
create policy ref_read_coins on public.coins for select to anon, authenticated using (true);
create policy own_addr on public.deposit_addresses for select to authenticated using (user_id=auth.uid() or is_admin());
create policy own_deposits on public.deposits for select to authenticated using (user_id=auth.uid() or is_admin());
create policy adm_jobs on public.job_runs for select to authenticated using (is_admin());
create policy own_logins_i on public.login_events for insert to authenticated with check (user_id=auth.uid());
create policy own_logins_s on public.login_events for select to authenticated using (user_id=auth.uid());
create policy ref_read_prices on public.market_prices for select to anon, authenticated using (true);
create policy adm_networks_u on public.networks for update to authenticated using (is_admin()) with check (is_admin());
create policy ref_read_networks on public.networks for select to authenticated using (true);
create policy adm_news_all on public.news for all to authenticated using (is_admin()) with check (is_admin());
create policy ref_read_news on public.news for select to authenticated using (true);
create policy own_prefs_s on public.notification_prefs for select to authenticated using (user_id=auth.uid());
create policy own_prefs_u on public.notification_prefs for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy own_notifs on public.notifications for select to authenticated using (user_id=auth.uid());
create policy own_orders on public.orders for select to authenticated using (user_id=auth.uid() or is_admin());
create policy own_snaps on public.portfolio_snapshots for select to authenticated using (user_id=auth.uid());
create policy own_alerts_d on public.price_alerts for delete to authenticated using (user_id=auth.uid());
create policy own_alerts_i on public.price_alerts for insert to authenticated with check (user_id=auth.uid());
create policy own_alerts_s on public.price_alerts for select to authenticated using (user_id=auth.uid());
create policy own_profile on public.profiles for select to authenticated using (id=auth.uid() or is_admin());
create policy own_rentals on public.rentals for select to authenticated using (user_id=auth.uid() or is_admin());
create policy adm_settings_u on public.settings for update to authenticated using (is_admin()) with check (is_admin());
create policy ref_read_settings on public.settings for select to authenticated using (true);
create policy own_quotes on public.swap_quotes for select to authenticated using (user_id=auth.uid());
create policy own_swaps on public.swaps for select to authenticated using (user_id=auth.uid() or is_admin());
create policy adm_status on public.system_status for select to authenticated using (is_admin());
create policy own_roles on public.user_roles for select to authenticated using (user_id=auth.uid() or is_admin());
create policy own_withdrawals on public.withdrawals for select to authenticated using (user_id=auth.uid() or is_admin());

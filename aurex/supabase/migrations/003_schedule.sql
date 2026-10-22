-- Runs the market-feed edge function every minute. Run AFTER 002_trading_logic.sql and after deploying market-feed.
-- The shared secret is generated here and stored in a private table (no client access); the cron job and the function both read it from there.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.feed_secret(secret text primary key);
alter table public.feed_secret enable row level security;          -- no policies: invisible to anon/authenticated
revoke all on public.feed_secret from anon, authenticated;
insert into public.feed_secret(secret) select encode(gen_random_bytes(24),'hex') where not exists (select 1 from public.feed_secret);

select cron.unschedule('market-feed') where exists (select 1 from cron.job where jobname='market-feed');
select cron.schedule('market-feed', '* * * * *', $$
  select net.http_post(
    url := 'https://gijigzbknjgleunttlib.supabase.co/functions/v1/market-feed',
    headers := jsonb_build_object('content-type','application/json','x-feed-secret',(select secret from public.feed_secret limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 20000);
$$);

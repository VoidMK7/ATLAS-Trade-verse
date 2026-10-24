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

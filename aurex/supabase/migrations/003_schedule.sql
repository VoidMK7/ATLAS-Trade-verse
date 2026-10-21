-- Runs the market-feed edge function every minute.
-- BEFORE running: create the secret FEED_SECRET for the function, then replace the two placeholders below.
--   <PROJECT_REF>  e.g. gijigzbknjgleunttlib
--   <FEED_SECRET>  the same value you set as the FEED_SECRET function secret
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('market-feed') where exists (select 1 from cron.job where jobname='market-feed');
select cron.schedule('market-feed', '* * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/market-feed',
    headers := jsonb_build_object('content-type','application/json','x-feed-secret','<FEED_SECRET>'),
    body := '{}'::jsonb, timeout_milliseconds := 20000);
$$);

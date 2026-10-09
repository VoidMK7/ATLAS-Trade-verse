create extension if not exists pgcrypto;

create table if not exists public.network_connections (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  network_slug text not null, network_name text not null, label text not null, provider_reference text,
  connection_method text not null default 'manual_report' check (connection_method in ('oauth','manual_report')),
  status text not null default 'connected' check (status in ('connected','pending','disconnected','error')),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'), status_note text,
  last_sync_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists network_connections_owner_network_idx on public.network_connections(owner_id,network_slug);

create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, code text not null unique check (length(code) between 1 and 64),
  destination_url text not null, status text not null default 'active' check (status in ('active','paused','archived')),
  campaign_id uuid, campaign_name text, offer_id uuid, offer_name text, network_slug text,
  account_id uuid references public.network_connections(id) on delete set null, account_label text,
  postback_key text not null default encode(gen_random_bytes(24),'hex'), members uuid[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint destination_http_only check (destination_url ~* '^https?://')
);
create index if not exists tracking_links_owner_idx on public.tracking_links(owner_id,created_at desc);

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(), link_id uuid not null references public.tracking_links(id) on delete cascade,
  campaign_id uuid, campaign_name text, offer_id uuid, offer_name text, network_slug text,
  account_id uuid references public.network_connections(id) on delete set null, account_label text,
  event_type text not null check (event_type in ('click','landing_view','session_start','session_end','conversion','postback')),
  session_id text not null, owner_id uuid not null references auth.users(id) on delete cascade, members uuid[] not null default '{}',
  country text not null default '', country_source text not null default 'unavailable', device text not null default 'unknown', browser text not null default 'Other',
  referrer text, source text not null check (source in ('first_party','postback')), observed boolean not null default true,
  notes text, dedupe_key text not null unique, created_at timestamptz not null default now()
);
create index if not exists tracking_events_owner_time_idx on public.tracking_events(owner_id,created_at desc);
create index if not exists tracking_events_account_type_idx on public.tracking_events(account_id,event_type);

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(), link_id uuid not null references public.tracking_links(id) on delete cascade,
  event_id uuid references public.tracking_events(id) on delete set null,
  campaign_id uuid, campaign_name text, offer_id uuid, offer_name text, network_slug text,
  account_id uuid references public.network_connections(id) on delete set null, account_label text,
  session_id text not null, owner_id uuid not null references auth.users(id) on delete cascade, members uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  revenue numeric(14,4), payout numeric(14,4), cost numeric(14,4), currency text not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
  country text not null default '', provider text, source text not null default 'postback', dedupe_key text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists conversions_owner_time_idx on public.conversions(owner_id,created_at desc);
create index if not exists conversions_account_idx on public.conversions(account_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  action text not null, severity text not null default 'notice', details jsonb not null default '{}', created_at timestamptz not null default now()
);

alter table public.network_connections enable row level security;
alter table public.tracking_links enable row level security;
alter table public.tracking_events enable row level security;
alter table public.conversions enable row level security;
alter table public.audit_logs enable row level security;

create policy "connections owner access" on public.network_connections for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "links owner access" on public.tracking_links for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "events owner read" on public.tracking_events for select to authenticated using (owner_id = auth.uid() or auth.uid() = any(members));
create policy "conversions owner read" on public.conversions for select to authenticated using (owner_id = auth.uid() or auth.uid() = any(members));
create policy "audit owner access" on public.audit_logs for select to authenticated using (owner_id = auth.uid());
create policy "audit insert owner" on public.audit_logs for insert to authenticated with check (owner_id = auth.uid());

-- Only aggregate values cross to the client. No raw event or conversion rows are loaded for summation.
create or replace function public.account_metrics(p_network_slug text default null)
returns table(account_id uuid, account_label text, clicks bigint, sessions bigint, conversions bigint, revenue numeric, payout numeric, cost numeric)
language sql stable security invoker set search_path = public as $$
  with visible_events as (
    select e.account_id, max(e.account_label) as account_label,
      count(*) filter(where e.event_type='click') as clicks,
      count(*) filter(where e.event_type='session_start') as sessions
    from public.tracking_events e
    where (p_network_slug is null or e.network_slug=p_network_slug)
      and (e.owner_id=auth.uid() or auth.uid()=any(e.members))
    group by e.account_id
  ), visible_conversions as (
    select c.account_id, max(c.account_label) as account_label, count(*) as conversions, sum(c.revenue) as revenue, sum(c.payout) as payout, sum(c.cost) as cost
    from public.conversions c
    where (p_network_slug is null or c.network_slug=p_network_slug)
      and (c.owner_id=auth.uid() or auth.uid()=any(c.members))
    group by c.account_id
  )
  select coalesce(e.account_id,c.account_id), coalesce(e.account_label,c.account_label, case when coalesce(e.account_id,c.account_id) is null then 'Unassigned' else null end),
    coalesce(e.clicks,0), coalesce(e.sessions,0), coalesce(c.conversions,0), c.revenue, c.payout, c.cost
  from visible_events e full outer join visible_conversions c on e.account_id is not distinct from c.account_id;
$$;

create or replace function public.dashboard_metrics(p_network_slug text default null)
returns table(clicks bigint, sessions bigint, conversions bigint, revenue numeric)
language sql stable security invoker set search_path = public as $$
  select
    (select count(*) from public.tracking_events e where e.event_type='click' and (p_network_slug is null or e.network_slug=p_network_slug) and (e.owner_id=auth.uid() or auth.uid()=any(e.members))),
    (select count(*) from public.tracking_events e where e.event_type='session_start' and (p_network_slug is null or e.network_slug=p_network_slug) and (e.owner_id=auth.uid() or auth.uid()=any(e.members))),
    (select count(*) from public.conversions c where (p_network_slug is null or c.network_slug=p_network_slug) and (c.owner_id=auth.uid() or auth.uid()=any(c.members))),
    (select sum(c.revenue) from public.conversions c where (p_network_slug is null or c.network_slug=p_network_slug) and (c.owner_id=auth.uid() or auth.uid()=any(c.members)));
$$;
revoke all on function public.account_metrics(text) from public;
revoke all on function public.dashboard_metrics(text) from public;
grant execute on function public.account_metrics(text) to authenticated;
grant execute on function public.dashboard_metrics(text) to authenticated;

-- Explicit privileges for client roles; RLS remains the row-level boundary.
grant select, insert, update, delete on public.network_connections to authenticated;
grant select, insert, update, delete on public.tracking_links to authenticated;
grant select on public.tracking_events to authenticated;
grant select on public.conversions to authenticated;
grant select, insert on public.audit_logs to authenticated;
revoke all on public.network_connections, public.tracking_links, public.tracking_events, public.conversions, public.audit_logs from anon;

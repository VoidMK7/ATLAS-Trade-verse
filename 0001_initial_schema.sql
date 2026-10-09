-- ATLAS private intelligence starter schema.
-- Apply only to a NEW project or after reviewing against existing tables.
-- RLS is enabled below. Policies intentionally deny client access by default;
-- add narrowly scoped policies after reviewing the app's authorization model.

create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','analyst','campaign_manager','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','analyst','campaign_manager','viewer')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  label text not null,
  owner_user_id uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending','connected','error','disabled')),
  secret_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private','workspace')),
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  slug text not null unique,
  destination_url text not null,
  status text not null default 'active' check (status in ('active','paused','disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.click_events (
  id uuid primary key default gen_random_uuid(),
  tracking_link_id uuid not null references public.tracking_links(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  country_code char(2),
  referrer_host text,
  user_agent_family text,
  dedupe_key text,
  created_at timestamptz not null default now()
);

create index if not exists click_events_link_time_idx
  on public.click_events (tracking_link_id, occurred_at desc);

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  tracking_link_id uuid references public.tracking_links(id) on delete set null,
  click_event_id uuid references public.click_events(id) on delete set null,
  provider text not null,
  network_conversion_id text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','reversed')),
  payout numeric(14,4),
  currency char(3),
  converted_at timestamptz,
  received_at timestamptz not null default now(),
  unique (provider, network_conversion_id)
);

create table if not exists public.market_instruments (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_symbol text not null,
  symbol text not null,
  display_name text not null,
  asset_class text not null check (asset_class in ('equity','index','forex','crypto','commodity','fund','other')),
  exchange text,
  quote_currency text,
  created_at timestamptz not null default now(),
  unique (provider, provider_symbol)
);

create table if not exists public.market_observations (
  id bigint generated always as identity primary key,
  instrument_id uuid not null references public.market_instruments(id) on delete cascade,
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  price numeric(24,10),
  currency char(3),
  source_id text,
  is_delayed boolean not null default true
);

create index if not exists market_observations_instrument_time_idx
  on public.market_observations (instrument_id, observed_at desc);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_article_id text,
  title text not null,
  summary text,
  url text not null,
  published_at timestamptz,
  received_at timestamptz not null default now(),
  language text,
  content_hash text,
  unique (provider, provider_article_id)
);

create table if not exists public.news_entities (
  article_id uuid not null references public.news_articles(id) on delete cascade,
  instrument_id uuid not null references public.market_instruments(id) on delete cascade,
  relevance numeric(5,4),
  primary key (article_id, instrument_id)
);

create table if not exists public.economic_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text,
  country_code char(2),
  title text not null,
  scheduled_at timestamptz not null,
  importance text,
  actual_value text,
  forecast_value text,
  previous_value text,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.user_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rule jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid references public.workspaces(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Default-deny baseline. Do not expose private tables until the policies
-- have been reviewed and the authorization helper functions are in place.
do $$
declare t text;
begin
  foreach t in array array[
    'workspaces','workspace_members','invitations','integrations','campaigns',
    'tracking_links','click_events','conversions','market_instruments',
    'market_observations','news_articles','news_entities','economic_events',
    'user_alerts','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

comment on table public.integrations is
  'Store only integration metadata here. Keep OAuth tokens and provider secrets in a secure server-side secret store.';
comment on table public.click_events is
  'Do not store raw IP addresses here by default. Country is an estimate and must follow the privacy policy.';
comment on table public.market_observations is
  'Store provider timestamps and delayed/live status. Confirm provider licensing before redistributing data.';

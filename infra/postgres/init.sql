create extension if not exists "uuid-ossp";

create table if not exists proxies (
    id uuid primary key,
    scheme text not null check (scheme in ('http', 'https', 'socks5')),
    host text not null,
    port integer not null,
    username text null,
    password text null,
    tags text[] not null default '{}',
    status text not null check (status in ('unknown', 'healthy', 'degraded', 'unhealthy', 'disabled', 'cooling_down')),
    score integer not null default 0,
    avg_latency_ms integer null,
    success_rate double precision null,
    consecutive_failures integer not null default 0,
    consecutive_successes integer not null default 0,
    last_checked_at timestamptz null,
    cooldown_until timestamptz null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create unique index if not exists idx_proxies_unique_address
    on proxies (scheme, host, port, coalesce(username, ''));

create index if not exists idx_proxies_status
    on proxies (status);

create index if not exists idx_proxies_last_checked_at
    on proxies (last_checked_at desc);

create table if not exists proxy_requests (
    id uuid primary key,
    proxy_id uuid references proxies (id) on delete set null,
    outcome text not null check (outcome in ('selected', 'succeeded', 'failed')),
    strategy text null,
    latency_ms integer null,
    status_code integer null,
    error_kind text null,
    created_at timestamptz not null
);

create index if not exists idx_proxy_requests_proxy_id
    on proxy_requests (proxy_id, created_at desc);

create index if not exists idx_proxy_requests_created_at
    on proxy_requests (created_at desc);

create table if not exists proxy_events (
    id uuid primary key,
    proxy_id uuid references proxies (id) on delete set null,
    level text not null check (level in ('info', 'warning', 'error')),
    category text not null,
    actor text not null,
    message text not null,
    created_at timestamptz not null
);

create index if not exists idx_proxy_events_created_at
    on proxy_events (created_at desc);

create index if not exists idx_proxy_events_proxy_id
    on proxy_events (proxy_id, created_at desc);

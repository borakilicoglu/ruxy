# Database Schema v1

This is the minimum schema needed for the MVP.

## proxies

Columns:

- `id uuid primary key`
- `scheme text not null`
- `host text not null`
- `port integer not null`
- `username text null`
- `password text null`
- `tags text[] not null default '{}'`
- `status text not null`
- `score integer not null default 0`
- `avg_latency_ms integer null`
- `success_rate double precision null`
- `consecutive_failures integer not null default 0`
- `consecutive_successes integer not null default 0`
- `last_checked_at timestamptz null`
- `cooldown_until timestamptz null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Constraints and indexes:

- unique `(scheme, host, port, coalesce(username, ''))`
- index on `status`
- index on `last_checked_at desc`
- index on `cooldown_until`

## health_checks

Columns:

- `id uuid primary key`
- `proxy_id uuid not null references proxies(id)`
- `success boolean not null`
- `latency_ms integer null`
- `http_status integer null`
- `error_kind text null`
- `checked_at timestamptz not null`

Indexes:

- index on `(proxy_id, checked_at desc)`
- index on `checked_at desc`

Rule:

- append-only

## proxy_requests

Columns:

- `id uuid primary key`
- `proxy_id uuid not null references proxies(id)`
- `target_host text null`
- `success boolean not null`
- `latency_ms integer null`
- `status_code integer null`
- `error_kind text null`
- `created_at timestamptz not null`

Indexes:

- index on `(proxy_id, created_at desc)`
- index on `created_at desc`

Rule:

- append-only

## proxy_events

Columns:

- `id uuid primary key`
- `proxy_id uuid null references proxies(id)`
- `event_type text not null`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null`

Indexes:

- index on `(proxy_id, created_at desc)`
- index on `(event_type, created_at desc)`
- index on `created_at desc`

Rule:

- append-only

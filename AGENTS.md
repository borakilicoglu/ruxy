# AGENTS.md

## Project

**Ruxy Platform (Rust Core + Rust Proxy Server + Next.js Dashboard + TimescaleDB/PostgreSQL)**

A proxy rotation and proxy management platform with four main parts:

- **Dashboard**: Next.js admin panel on port `3000`
- **Core API**: Rust control plane on port `8001`
- **Proxy Server**: Rust data plane on port `8000`
- **Database**: TimescaleDB/PostgreSQL on port `5432`

The goal is to automate proxy pool management, health checks, rotation, routing, and observability.

---

## High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        Ruxy Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Dashboard  │───▶│  Core (API)  │───▶│ TimescaleDB  │   │
│  │   Next.js    │    │    Rust      │    │ PostgreSQL   │   │
│  │  Port 3000   │    │  Port 8001   │    │  Port 5432   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                    │                              │
│         │                    ▼                              │
│         └───────────▶┌──────────────┐                       │
│                      │ Proxy Server │                       │
│                      │    Rust      │                       │
│                      │  Port 8000   │                       │
│                      └──────────────┘                       │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               ▼
                     ┌──────────────────┐
                     │   Proxy Pool     │
                     │  (External IPs)  │
                     └──────────────────┘
```

---

## System Responsibilities

### 1. Dashboard (`apps/dashboard`)

Next.js control panel.

Responsibilities:

- Show proxy list, health status, latency, success rate
- Add/remove/update proxies
- Show historical charts and events
- Trigger manual health checks
- Display system metrics and logs
- Configure rotation strategy and health settings

Tech:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Recharts

### 2. Core API (`crates/core-api`)

Rust control plane.

Responsibilities:

- CRUD for proxies
- Proxy state transitions
- Health check orchestration
- Selection strategies
- Metrics aggregation
- Event emission
- Admin endpoints for dashboard

Tech:

- axum
- tokio
- sqlx
- serde
- tracing

### 3. Proxy Server (`crates/proxy-server`)

Rust data plane.

Responsibilities:

- Accept incoming requests
- Select a healthy proxy
- Forward traffic to upstream proxy
- Record success/failure and latency
- Emit routing metrics/events

Initial scope:

- HTTP proxy support first
- HTTPS CONNECT support second
- SOCKS optional later

### 4. Database (`infra/postgres`)

TimescaleDB/PostgreSQL.

Responsibilities:

- Store proxies
- Store health check history
- Store request stats
- Store events
- Store aggregated metrics

---

## Monorepo Structure

```text
ruxy/
├─ AGENTS.md
├─ README.md
├─ .env.example
├─ docker-compose.yml
├─ pnpm-workspace.yaml
├─ turbo.json
├─ Cargo.toml
├─ Cargo.lock
│
├─ apps/
│  └─ dashboard/
│     ├─ app/
│     ├─ components/
│     ├─ features/
│     │  ├─ proxies/
│     │  ├─ health/
│     │  ├─ metrics/
│     │  ├─ events/
│     │  └─ settings/
│     ├─ lib/
│     │  ├─ api/
│     │  ├─ hooks/
│     │  ├─ schemas/
│     │  └─ utils/
│     ├─ public/
│     ├─ package.json
│     └─ tsconfig.json
│
├─ crates/
│  ├─ domain/
│  │  ├─ src/
│  │  │  ├─ proxy.rs
│  │  │  ├─ health.rs
│  │  │  ├─ strategy.rs
│  │  │  ├─ scoring.rs
│  │  │  ├─ event.rs
│  │  │  ├─ metrics.rs
│  │  │  ├─ errors.rs
│  │  │  └─ lib.rs
│  │  └─ Cargo.toml
│  │
│  ├─ application/
│  │  ├─ src/
│  │  │  ├─ services/
│  │  │  │  ├─ proxy_pool_service.rs
│  │  │  │  ├─ health_service.rs
│  │  │  │  ├─ selection_service.rs
│  │  │  │  ├─ metrics_service.rs
│  │  │  │  └─ event_service.rs
│  │  │  ├─ ports/
│  │  │  │  ├─ proxy_repository.rs
│  │  │  │  ├─ health_checker.rs
│  │  │  │  ├─ metrics_repository.rs
│  │  │  │  └─ event_repository.rs
│  │  │  └─ lib.rs
│  │  └─ Cargo.toml
│  │
│  ├─ infrastructure/
│  │  ├─ src/
│  │  │  ├─ config/
│  │  │  ├─ db/
│  │  │  │  ├─ postgres/
│  │  │  │  ├─ migrations/
│  │  │  │  └─ models/
│  │  │  ├─ repositories/
│  │  │  ├─ health/
│  │  │  │  └─ reqwest_checker.rs
│  │  │  ├─ metrics/
│  │  │  ├─ events/
│  │  │  └─ lib.rs
│  │  └─ Cargo.toml
│  │
│  ├─ core-api/
│  │  ├─ src/
│  │  │  ├─ main.rs
│  │  │  ├─ app_state.rs
│  │  │  ├─ routes/
│  │  │  │  ├─ proxies.rs
│  │  │  │  ├─ health.rs
│  │  │  │  ├─ metrics.rs
│  │  │  │  ├─ events.rs
│  │  │  │  └─ settings.rs
│  │  │  ├─ middleware/
│  │  │  └─ dto/
│  │  └─ Cargo.toml
│  │
│  ├─ proxy-server/
│  │  ├─ src/
│  │  │  ├─ main.rs
│  │  │  ├─ server/
│  │  │  ├─ routing/
│  │  │  ├─ transport/
│  │  │  ├─ metrics/
│  │  │  └─ errors/
│  │  └─ Cargo.toml
│  │
│  ├─ worker/
│  │  ├─ src/
│  │  │  ├─ main.rs
│  │  │  ├─ scheduler.rs
│  │  │  ├─ health_worker.rs
│  │  │  ├─ cleanup_worker.rs
│  │  │  └─ aggregation_worker.rs
│  │  └─ Cargo.toml
│  │
│  └─ shared/
│     ├─ src/
│     │  ├─ types.rs
│     │  ├─ time.rs
│     │  ├─ ids.rs
│     │  └─ lib.rs
│     └─ Cargo.toml
│
├─ infra/
│  ├─ postgres/
│  │  ├─ init.sql
│  │  └─ timescaledb.sql
│  ├─ docker/
│  │  ├─ core-api.Dockerfile
│  │  ├─ proxy-server.Dockerfile
│  │  ├─ worker.Dockerfile
│  │  └─ dashboard.Dockerfile
│  └─ monitoring/
│     └─ prometheus.yml
│
├─ scripts/
│  ├─ dev.sh
│  ├─ reset.sh
│  ├─ seed-proxies.sh
│  └─ migrate.sh
│
└─ docs/
   ├─ architecture.md
   ├─ api.md
   ├─ data-model.md
   └─ roadmap.md
```

---

## Service Communication

### Dashboard → Core API

Protocol:

- HTTP/JSON

Dashboard talks only to Core API for admin operations.

Examples:

- `GET /api/proxies`
- `POST /api/proxies`
- `GET /api/health/summary`
- `GET /api/metrics/overview`
- `GET /api/events`
- `POST /api/proxies/:id/check`

### Core API → Database

Protocol:

- SQL via `sqlx`

### Core API → Proxy Server

Protocol:

- internal HTTP or shared DB/event-based coordination

Preferred starting model:

- Proxy Server reads active proxy pool from DB/cache
- Core API writes control-plane changes to DB
- Worker updates health data and scores

### Proxy Server → External Proxy Pool

Protocol:

- outbound proxy forwarding

---

## Domain Model

### Proxy

Fields:

- `id`
- `scheme`
- `host`
- `port`
- `username`
- `password`
- `tags`
- `status`
- `score`
- `avg_latency_ms`
- `success_rate`
- `consecutive_failures`
- `last_checked_at`
- `cooldown_until`
- `created_at`
- `updated_at`

### ProxyStatus

- `Unknown`
- `Healthy`
- `Degraded`
- `Unhealthy`
- `Disabled`
- `CoolingDown`

### HealthCheckResult

Fields:

- `proxy_id`
- `success`
- `latency_ms`
- `http_status`
- `error_kind`
- `checked_at`

### ProxyEvent

Examples:

- `ProxyAdded`
- `ProxyRemoved`
- `HealthCheckSucceeded`
- `HealthCheckFailed`
- `ProxyRecovered`
- `ProxyMarkedUnhealthy`
- `RequestRouted`
- `RequestFailed`

---

## Database Tables

### `proxies`

Stores proxy definitions and live state.

### `health_checks`

Stores historical health check records.

### `proxy_requests`

Stores request-level routing outcomes.

### `proxy_events`

Stores state changes and operational events.

### `proxy_metrics_hourly`

Timescale hypertable for aggregated time-series metrics.

---

## Ports

- Dashboard: `3000`
- Core API: `8001`
- Proxy Server: `8000`
- PostgreSQL/TimescaleDB: `5432`

Optional later:

- Prometheus: `9090`
- Grafana: `3001`

---

## Agents

### Agent 1: Dashboard Agent

Scope:

- Build and maintain the Next.js admin panel
- Consume Core API only
- Never call database directly
- Keep feature folders isolated by domain

Rules:

- Use server components where possible
- Use client components only for interactivity
- Use TanStack Query for dashboard-side data fetching/caching
- Keep API client code in `apps/dashboard/lib/api`
- Keep charts and tables inside feature folders

### Agent 2: Core API Agent

Scope:

- Build control-plane endpoints
- Own proxy CRUD, settings, summaries, and admin workflows

Rules:

- Keep business logic out of route handlers
- Route handlers must be thin
- Application layer owns use-cases
- Infrastructure layer owns DB/network adapters
- Use DTOs for API boundaries

### Agent 3: Proxy Server Agent

Scope:

- Build data-plane request forwarding
- Own proxy selection execution and per-request routing behavior

Rules:

- Keep selection strategy abstracted behind services/interfaces
- Record routing metrics asynchronously when possible
- Avoid mixing forwarding logic with admin/control logic

### Agent 4: Worker Agent

Scope:

- Periodic health checks
- Cleanup/cooldown recovery
- Metric rollups

Rules:

- Workers must be idempotent where possible
- Health checks should have bounded concurrency
- Avoid long-held locks

### Agent 5: Database Agent

Scope:

- Schema design
- Migrations
- Timescale optimizations
- Indexes and retention policies

Rules:

- Request history should be partition-friendly
- Keep hypertables only for true time-series datasets
- Add indexes for health/status filtering and recent event queries

---

## Build Order

### Phase 1 — Foundation

- Initialize Rust workspace
- Initialize Next.js dashboard app
- Add docker-compose with 4 services
- Add shared config and env files
- Stand up PostgreSQL/TimescaleDB

### Phase 2 — Core Domain

- Implement domain entities
- Implement repository interfaces
- Add in-memory repository for fast dev
- Add proxy CRUD

### Phase 3 — Health System

- Implement worker
- Add periodic health checks
- Add status transitions and cooldown rules
- Persist health check history

### Phase 4 — Dashboard MVP

- Proxy table
- Add/remove proxy form
- Health overview cards
- Basic charts for success rate and latency

### Phase 5 — Proxy Routing

- Implement proxy selection service
- Add round robin and random healthy
- Add actual request forwarding in proxy server
- Record request outcomes

### Phase 6 — Observability

- Add metrics endpoint
- Add event timeline
- Add tracing and structured logs
- Add aggregated timeseries queries

### Phase 7 — Advanced

- Weighted selection
- Sticky sessions
- Tag-based routing
- HTTPS CONNECT support
- Auth and RBAC

---

## Engineering Rules

### Rust rules

- Prefer clear modules over clever abstractions
- Keep domain layer framework-free
- Use `thiserror` for domain/app errors
- Use `anyhow` only at app boundaries where appropriate
- Keep async out of domain entities
- Prefer composition over inheritance-style patterns

### Next.js rules

- Use App Router
- Keep feature-oriented structure
- Co-locate UI, hooks, schemas, and tables by feature
- Avoid putting business rules in components
- Use typed API responses

### API rules

- Stable JSON contracts
- Pagination for event/history endpoints
- Filtering for proxy status, tags, health, and recency
- Do not leak internal DB models directly

### Data rules

- Health checks are append-only
- Current proxy state lives in `proxies`
- Historical metrics should be aggregatable by minute/hour/day

### Crate dependency policy

- `shared` contains only low-level shared primitives and utilities; it must not depend on higher-level crates
- `domain` contains pure business rules and entities; it must not depend on framework, HTTP, database, or runtime details
- `application` contains use-cases and port interfaces; it may depend on `domain` and `shared`, but not on transport or database adapters
- `infrastructure` implements ports and external integrations; it may depend on `application`, `domain`, and `shared`
- `core-api`, `worker`, and `proxy-server` are composition layers; they should wire dependencies and expose transport/runtime entrypoints, not own core business rules
- `core-api`, `worker`, and `proxy-server` must not depend directly on one another
- If logic is needed by more than one top-level service, move it down into `application`, `domain`, or a narrowly scoped supporting crate
- Route handlers, worker jobs, and proxy request flows must stay thin; persistent business rules belong in `application` or `domain`
- Internal DB models or infrastructure entities must not be exposed directly as API contracts
- `apps/dashboard` consumes only Core API contracts; it must not depend on database internals or Rust crate implementation details

---

## Suggested Commands

### Root

```bash
pnpm install
cargo build
```

### Dashboard

```bash
pnpm --filter dashboard dev
```

### Core API

```bash
cargo run -p core-api
```

### Proxy Server

```bash
cargo run -p proxy-server
```

### Worker

```bash
cargo run -p worker
```

### Full local stack

```bash
docker compose up --build
```

---

## Environment Variables

### Dashboard

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001`

### Core API / Worker / Proxy Server

- `DATABASE_URL=postgres://postgres:postgres@db:5432/ruxy`
- `RUST_LOG=info`
- `CORE_API_PORT=8001`
- `PROXY_SERVER_PORT=8000`
- `HEALTH_CHECK_URL=https://httpbin.org/ip`
- `HEALTH_CHECK_INTERVAL_SECS=30`
- `HEALTH_CHECK_TIMEOUT_MS=5000`

---

## Dashboard Pages

- `/` → overview
- `/proxies` → proxy list and filters
- `/proxies/new` → add proxy
- `/health` → health summaries and history
- `/events` → system event stream
- `/metrics` → charts and request metrics
- `/settings` → strategy, thresholds, intervals

---

## Initial API Endpoints

### Proxies

- `GET /api/proxies`
- `POST /api/proxies`
- `GET /api/proxies/:id`
- `PATCH /api/proxies/:id`
- `DELETE /api/proxies/:id`

### Health

- `GET /api/health/summary`
- `GET /api/health/checks`
- `POST /api/proxies/:id/check`

### Metrics

- `GET /api/metrics/overview`
- `GET /api/metrics/latency`
- `GET /api/metrics/success-rate`

### Events

- `GET /api/events`

### Settings

- `GET /api/settings`
- `PATCH /api/settings`

---

## MVP Definition

The MVP is complete when:

- proxies can be created/listed/deleted
- worker performs health checks
- dashboard shows proxy table and health summary
- proxy server can select a healthy proxy
- request metrics are recorded
- local development works through `docker compose up`

---

## Non-Goals for MVP

- multi-tenant support
- billing
- enterprise auth
- geo-routing
- distributed cluster mode
- full SOCKS implementation

---

## Notes for Agents

When adding code:

- do not collapse all logic into one crate
- do not mix dashboard concerns into Rust services
- do not put raw SQL in route handlers
- do not let the proxy server own admin workflows
- prefer shipping a clean MVP over designing the perfect abstraction

When unsure:

- favor thin transport layers
- favor a strong domain/app separation
- favor observability early
- favor boring, debuggable code

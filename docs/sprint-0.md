# Sprint 0

This document is the execution path for the initial build of Ruxy. The goal is to remove ambiguity before feature work starts and then move through the MVP in a fixed order.

## Phase 0

Objective:

- convert architecture intent into executable repo structure
- define the first domain rules that affect every service
- keep the first milestone narrow enough to ship

Deliverables:

1. workspace bootstrap
2. domain decision records
3. API contract v1
4. database schema v1
5. implementation backlog for MVP

## Step-by-step path

### Step 1: Workspace bootstrap

Goal:

- create the monorepo skeleton
- establish Rust workspace membership
- establish frontend workspace membership
- add shared root config files

Done when:

- root files exist
- service directories exist
- the project structure matches the intended monorepo direction

### Step 2: Domain decisions

Goal:

- define `Proxy`
- define `ProxyStatus`
- define health transition rules
- define MVP selection behavior

Decisions to lock:

- which statuses are selectable
- when a proxy enters `CoolingDown`
- when a proxy returns to `Healthy`
- whether `Degraded` participates in routing during MVP

Done when:

- status transition table is written
- recovery and failure thresholds are explicit

### Step 3: API contract v1

Goal:

- define external JSON contracts before adapters are built

Endpoints to define first:

- `GET /api/proxies`
- `POST /api/proxies`
- `GET /api/health/summary`
- `POST /api/proxies/:id/check`

Done when:

- request and response examples exist
- error response shape is shared

### Step 4: Database schema v1

Goal:

- define the minimum schema needed for MVP

Tables:

- `proxies`
- `health_checks`
- `proxy_requests`
- `proxy_events`

Done when:

- columns are defined
- unique constraints are defined
- first indexes are defined
- append-only tables are explicit

### Step 5: Core implementation order

Goal:

- build the MVP in the order that minimizes rework

Implementation sequence:

1. `domain` crate
2. `application` crate and ports
3. in-memory repositories for fast tests
4. database migrations and SQL repositories
5. `core-api`
6. `worker`
7. `apps/dashboard`
8. `proxy-server`

## Current working rule

Until Steps 2, 3, and 4 are written down, feature work should stay narrow. No advanced routing, no Timescale optimization work, and no over-general abstractions.

## Next action

The immediate next task is to write the Phase 0 decision records:

1. health state machine
2. API contract v1
3. database schema v1

# Ruxy

Ruxy is a proxy rotation and proxy management platform built as a monorepo.

## Status

- Phase 0 in progress
- Initial repo skeleton and execution plan are in place
- Rust toolchain is installed and the workspace passes `cargo check`

## Workspace

- `apps/dashboard`: Next.js admin dashboard
- `crates/core-api`: Rust control plane API
- `crates/proxy-server`: Rust data plane
- `crates/worker`: background health and aggregation jobs
- `crates/domain`, `crates/application`, `crates/infrastructure`, `crates/shared`: supporting workspace crates

## Current docs

- [docs/sprint-0.md](./docs/sprint-0.md): staged execution path
- [docs/health-state-machine.md](./docs/health-state-machine.md): MVP health transition rules
- [docs/api-contract-v1.md](./docs/api-contract-v1.md): first API contract draft
- [docs/schema-v1.md](./docs/schema-v1.md): first database schema draft

## Execution order

1. Phase 0: lock domain rules, contracts, schema, and bootstrap
2. Phase 1: implement domain and application core
3. Phase 2: add persistence and API
4. Phase 3: add worker and dashboard MVP
5. Phase 4: add proxy routing and observability

## Local setup

Rust:

```bash
source "$HOME/.cargo/env"
cargo check
```

Planned frontend setup:

```bash
pnpm install
```

## Next milestone

The next implementation target is the application layer:

1. expand repository ports
2. add proxy and health use-cases
3. add in-memory adapters for fast tests

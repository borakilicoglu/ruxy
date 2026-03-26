# Changelog

## Unreleased

### Added

- Next.js dashboard with overview, proxies, system metrics, logs, and settings screens
- Worker-driven health checks with seeded proxy cycle
- Core API routes for proxies, health summary, metrics, events, and settings
- Proxy server routes for health, proxy selection, and request forwarding attempts
- Postgres-backed repositories and telemetry tables for requests and events
- Dockerfiles, compose setup, helper scripts, and local full-stack workflow
- HeroUI-based toast system wired into dashboard create/delete flows

### Changed

- Dashboard UI moved to a darker operations-panel visual language
- Proxy create flow now rejects malformed hosts that include ports
- Success and error create/delete states now surface through dashboard toasts
- Metrics and logs pages now consume live backend data instead of only mock state

### Fixed

- Browser CORS/preflight issue on `POST /api/proxies`
- Toast visibility under the create drawer overlay
- Invalid proxy authority handling in proxy forwarding attempts

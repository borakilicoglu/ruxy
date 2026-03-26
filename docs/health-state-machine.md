# Health State Machine v1

This is the MVP health transition policy for proxies.

## Statuses

- `Unknown`
- `Healthy`
- `Degraded`
- `Unhealthy`
- `Disabled`
- `CoolingDown`

## Operational meaning

- `Unknown`: proxy exists but has not produced enough signal yet
- `Healthy`: eligible for routing
- `Degraded`: still eligible for routing in MVP, but lower quality
- `Unhealthy`: not eligible for routing
- `Disabled`: manually disabled and never selected
- `CoolingDown`: temporarily excluded after repeated failure

## MVP selection rule

- selectable: `Healthy`
- optional fallback selectable: `Degraded`
- never selectable: `Unknown`, `Unhealthy`, `Disabled`, `CoolingDown`

The default MVP behavior should use only `Healthy`. `Degraded` can be admitted later behind an explicit rule.

## Transition rules

### Initial

- new proxy starts as `Unknown`

### Success path

- `Unknown` -> `Healthy` after the first successful check
- `Degraded` -> `Healthy` after 2 consecutive successful checks
- `Unhealthy` -> `Healthy` after 2 consecutive successful checks
- `CoolingDown` -> `Healthy` after cooldown expires and 2 consecutive successful checks

### Failure path

- `Healthy` -> `Degraded` after 1 failed check
- `Degraded` -> `Unhealthy` after 2 consecutive failed checks
- `Unhealthy` -> `CoolingDown` after 3 consecutive failed checks

### Manual path

- any status -> `Disabled` through admin action only
- `Disabled` -> `Unknown` when re-enabled

## Cooldown rule

- default cooldown duration: 60 seconds
- while in cooldown, the proxy is excluded from routing and normal selection

## Notes

- `consecutive_failures` must reset on success
- a separate `consecutive_successes` counter is useful for recovery logic
- request-level routing failures should feed into health logic later, not in MVP v1

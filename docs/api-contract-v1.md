# API Contract v1

The first contracts should stay narrow and stable.

## Error shape

```json
{
  "error": {
    "code": "proxy_not_found",
    "message": "Proxy was not found"
  }
}
```

## GET /api/proxies

Response:

```json
{
  "items": [
    {
      "id": "e7d1d086-b00a-48e9-bc51-0dfa54ab8e6f",
      "scheme": "http",
      "host": "10.0.0.12",
      "port": 8080,
      "username": "user1",
      "tags": ["residential", "eu"],
      "status": "Healthy",
      "score": 100,
      "avg_latency_ms": 420,
      "success_rate": 0.99,
      "consecutive_failures": 0,
      "last_checked_at": "2026-03-26T10:00:00Z",
      "cooldown_until": null,
      "created_at": "2026-03-26T09:00:00Z",
      "updated_at": "2026-03-26T10:00:00Z"
    }
  ],
  "total": 1
}
```

## POST /api/proxies

Request:

```json
{
  "scheme": "http",
  "host": "10.0.0.12",
  "port": 8080,
  "username": "user1",
  "password": "secret",
  "tags": ["residential", "eu"]
}
```

Response:

```json
{
  "id": "e7d1d086-b00a-48e9-bc51-0dfa54ab8e6f"
}
```

## GET /api/health/summary

Response:

```json
{
  "total": 42,
  "healthy": 30,
  "degraded": 4,
  "unhealthy": 5,
  "cooling_down": 2,
  "disabled": 1,
  "unknown": 0
}
```

## POST /api/proxies/:id/check

Response:

```json
{
  "proxy_id": "e7d1d086-b00a-48e9-bc51-0dfa54ab8e6f",
  "success": true,
  "latency_ms": 380,
  "http_status": 200,
  "error_kind": null,
  "checked_at": "2026-03-26T10:05:00Z",
  "status_after_check": "Healthy"
}
```

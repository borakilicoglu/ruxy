use chrono::{DateTime, Utc};
use domain::proxy::Proxy;
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct TelemetryEvent {
    pub id: Uuid,
    pub proxy_id: Option<Uuid>,
    pub level: String,
    pub category: String,
    pub actor: String,
    pub message: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct TelemetryRequest {
    pub id: Uuid,
    pub proxy_id: Option<Uuid>,
    pub outcome: String,
    pub strategy: Option<String>,
    pub latency_ms: Option<i32>,
    pub status_code: Option<i32>,
    pub error_kind: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone)]
pub struct PostgresTelemetryRepository {
    pool: PgPool,
}

impl PostgresTelemetryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn record_selection(
        &self,
        proxy: &Proxy,
        strategy: &str,
        selected_at: DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            insert into proxy_requests (
              id, proxy_id, outcome, strategy, latency_ms, status_code, error_kind, created_at
            )
            values ($1, $2, 'selected', $3, null, null, null, $4)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(proxy.id)
        .bind(strategy)
        .bind(selected_at)
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            insert into proxy_events (
              id, proxy_id, level, category, actor, message, created_at
            )
            values ($1, $2, 'info', 'routing', 'proxy-server', $3, $4)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(proxy.id)
        .bind(format!(
            "Selected proxy {}:{} using {strategy}",
            proxy.host, proxy.port
        ))
        .bind(selected_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn record_request_outcome(
        &self,
        proxy: &Proxy,
        strategy: &str,
        target_url: &str,
        success: bool,
        latency_ms: i32,
        status_code: Option<u16>,
        error_kind: Option<&str>,
        recorded_at: DateTime<Utc>,
    ) -> Result<(), sqlx::Error> {
        let outcome = if success { "succeeded" } else { "failed" };

        sqlx::query(
            r#"
            insert into proxy_requests (
              id, proxy_id, outcome, strategy, latency_ms, status_code, error_kind, created_at
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(proxy.id)
        .bind(outcome)
        .bind(strategy)
        .bind(latency_ms)
        .bind(status_code.map(|value| value as i32))
        .bind(error_kind)
        .bind(recorded_at)
        .execute(&self.pool)
        .await?;

        sqlx::query(
            r#"
            insert into proxy_events (
              id, proxy_id, level, category, actor, message, created_at
            )
            values ($1, $2, $3, 'routing', 'proxy-server', $4, $5)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(proxy.id)
        .bind(if success { "info" } else { "error" })
        .bind(if success {
            format!(
                "Forwarded request to {target_url} via {}:{} in {latency_ms}ms{}",
                proxy.host,
                proxy.port,
                status_code
                    .map(|value| format!(" (status {value})"))
                    .unwrap_or_default()
            )
        } else {
            format!(
                "Request to {target_url} via {}:{} failed in {latency_ms}ms{}",
                proxy.host,
                proxy.port,
                error_kind
                    .map(|value| format!(" ({value})"))
                    .unwrap_or_default()
            )
        })
        .bind(recorded_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn list_events(&self, limit: i64) -> Result<Vec<TelemetryEvent>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            select id, proxy_id, level, category, actor, message, created_at
            from proxy_events
            order by created_at desc
            limit $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| TelemetryEvent {
                id: row.get("id"),
                proxy_id: row.get("proxy_id"),
                level: row.get("level"),
                category: row.get("category"),
                actor: row.get("actor"),
                message: row.get("message"),
                created_at: row.get("created_at"),
            })
            .collect())
    }

    pub async fn list_requests(&self, limit: i64) -> Result<Vec<TelemetryRequest>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            select id, proxy_id, outcome, strategy, latency_ms, status_code, error_kind, created_at
            from proxy_requests
            order by created_at desc
            limit $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| TelemetryRequest {
                id: row.get("id"),
                proxy_id: row.get("proxy_id"),
                outcome: row.get("outcome"),
                strategy: row.get("strategy"),
                latency_ms: row.get("latency_ms"),
                status_code: row.get("status_code"),
                error_kind: row.get("error_kind"),
                created_at: row.get("created_at"),
            })
            .collect())
    }
}

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use application::{errors::ApplicationError, ports::ProxyRepository};
use domain::proxy::{Proxy, ProxyScheme, ProxyStatus};

#[derive(Clone)]
pub struct PostgresProxyRepository {
    pool: PgPool,
}

impl PostgresProxyRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ProxyRepository for PostgresProxyRepository {
    async fn list(&self) -> Result<Vec<Proxy>, ApplicationError> {
        let rows = sqlx::query(
            r#"
            select
              id, scheme, host, port, username, password, tags, status, score,
              avg_latency_ms, success_rate, consecutive_failures, consecutive_successes,
              last_checked_at, cooldown_until, created_at, updated_at
            from proxies
            order by created_at desc
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(map_sqlx)?;

        rows.into_iter().map(map_proxy_row).collect()
    }

    async fn get(&self, id: Uuid) -> Result<Option<Proxy>, ApplicationError> {
        let row = sqlx::query(
            r#"
            select
              id, scheme, host, port, username, password, tags, status, score,
              avg_latency_ms, success_rate, consecutive_failures, consecutive_successes,
              last_checked_at, cooldown_until, created_at, updated_at
            from proxies
            where id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(map_sqlx)?;

        row.map(map_proxy_row).transpose()
    }

    async fn insert(&self, proxy: Proxy) -> Result<Proxy, ApplicationError> {
        sqlx::query(
            r#"
            insert into proxies (
              id, scheme, host, port, username, password, tags, status, score,
              avg_latency_ms, success_rate, consecutive_failures, consecutive_successes,
              last_checked_at, cooldown_until, created_at, updated_at
            )
            values (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, $14, $15, $16, $17
            )
            "#,
        )
        .bind(proxy.id)
        .bind(scheme_label(proxy.scheme))
        .bind(&proxy.host)
        .bind(i32::from(proxy.port))
        .bind(&proxy.username)
        .bind(&proxy.password)
        .bind(&proxy.tags)
        .bind(status_label(proxy.status))
        .bind(proxy.score)
        .bind(proxy.avg_latency_ms.map(|value| value as i32))
        .bind(proxy.success_rate)
        .bind(proxy.consecutive_failures as i32)
        .bind(proxy.consecutive_successes as i32)
        .bind(proxy.last_checked_at)
        .bind(proxy.cooldown_until)
        .bind(proxy.created_at)
        .bind(proxy.updated_at)
        .execute(&self.pool)
        .await
        .map_err(map_sqlx)?;

        Ok(proxy)
    }

    async fn update(&self, proxy: Proxy) -> Result<Proxy, ApplicationError> {
        sqlx::query(
            r#"
            update proxies
            set
              scheme = $2,
              host = $3,
              port = $4,
              username = $5,
              password = $6,
              tags = $7,
              status = $8,
              score = $9,
              avg_latency_ms = $10,
              success_rate = $11,
              consecutive_failures = $12,
              consecutive_successes = $13,
              last_checked_at = $14,
              cooldown_until = $15,
              updated_at = $16
            where id = $1
            "#,
        )
        .bind(proxy.id)
        .bind(scheme_label(proxy.scheme))
        .bind(&proxy.host)
        .bind(i32::from(proxy.port))
        .bind(&proxy.username)
        .bind(&proxy.password)
        .bind(&proxy.tags)
        .bind(status_label(proxy.status))
        .bind(proxy.score)
        .bind(proxy.avg_latency_ms.map(|value| value as i32))
        .bind(proxy.success_rate)
        .bind(proxy.consecutive_failures as i32)
        .bind(proxy.consecutive_successes as i32)
        .bind(proxy.last_checked_at)
        .bind(proxy.cooldown_until)
        .bind(proxy.updated_at)
        .execute(&self.pool)
        .await
        .map_err(map_sqlx)?;

        Ok(proxy)
    }

    async fn delete(&self, id: Uuid) -> Result<(), ApplicationError> {
        sqlx::query("delete from proxies where id = $1")
            .bind(id)
            .execute(&self.pool)
            .await
            .map_err(map_sqlx)?;

        Ok(())
    }

    async fn exists(&self, id: Uuid) -> Result<bool, ApplicationError> {
        let row = sqlx::query("select exists(select 1 from proxies where id = $1)")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(map_sqlx)?;

        Ok(row.get::<bool, _>(0))
    }

    async fn status(&self, id: Uuid) -> Result<Option<ProxyStatus>, ApplicationError> {
        let row = sqlx::query("select status from proxies where id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(map_sqlx)?;

        row.map(|row| parse_status(row.get::<String, _>("status"))).transpose()
    }

    async fn exists_with_address(
        &self,
        scheme: ProxyScheme,
        host: &str,
        port: u16,
        username: Option<&str>,
    ) -> Result<bool, ApplicationError> {
        let row = sqlx::query(
            r#"
            select exists(
              select 1
              from proxies
              where scheme = $1
                and host = $2
                and port = $3
                and username is not distinct from $4
            )
            "#,
        )
        .bind(scheme_label(scheme))
        .bind(host)
        .bind(i32::from(port))
        .bind(username)
        .fetch_one(&self.pool)
        .await
        .map_err(map_sqlx)?;

        Ok(row.get::<bool, _>(0))
    }
}

fn map_proxy_row(row: sqlx::postgres::PgRow) -> Result<Proxy, ApplicationError> {
    Ok(Proxy {
        id: row.get("id"),
        scheme: parse_scheme(row.get::<String, _>("scheme"))?,
        host: row.get("host"),
        port: row.get::<i32, _>("port") as u16,
        username: row.get("username"),
        password: row.get("password"),
        tags: row.get("tags"),
        status: parse_status(row.get::<String, _>("status"))?,
        score: row.get("score"),
        avg_latency_ms: row.get::<Option<i32>, _>("avg_latency_ms").map(|value| value as u32),
        success_rate: row.get("success_rate"),
        consecutive_failures: row.get::<i32, _>("consecutive_failures") as u32,
        consecutive_successes: row.get::<i32, _>("consecutive_successes") as u32,
        last_checked_at: row.get::<Option<DateTime<Utc>>, _>("last_checked_at"),
        cooldown_until: row.get::<Option<DateTime<Utc>>, _>("cooldown_until"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

fn parse_scheme(value: String) -> Result<ProxyScheme, ApplicationError> {
    match value.as_str() {
        "http" => Ok(ProxyScheme::Http),
        "https" => Ok(ProxyScheme::Https),
        "socks5" => Ok(ProxyScheme::Socks5),
        other => Err(ApplicationError::Repository(format!("invalid scheme in db: {other}"))),
    }
}

fn parse_status(value: String) -> Result<ProxyStatus, ApplicationError> {
    match value.as_str() {
        "unknown" => Ok(ProxyStatus::Unknown),
        "healthy" => Ok(ProxyStatus::Healthy),
        "degraded" => Ok(ProxyStatus::Degraded),
        "unhealthy" => Ok(ProxyStatus::Unhealthy),
        "disabled" => Ok(ProxyStatus::Disabled),
        "cooling_down" => Ok(ProxyStatus::CoolingDown),
        other => Err(ApplicationError::Repository(format!("invalid status in db: {other}"))),
    }
}

fn scheme_label(value: ProxyScheme) -> &'static str {
    match value {
        ProxyScheme::Http => "http",
        ProxyScheme::Https => "https",
        ProxyScheme::Socks5 => "socks5",
    }
}

fn status_label(value: ProxyStatus) -> &'static str {
    match value {
        ProxyStatus::Unknown => "unknown",
        ProxyStatus::Healthy => "healthy",
        ProxyStatus::Degraded => "degraded",
        ProxyStatus::Unhealthy => "unhealthy",
        ProxyStatus::Disabled => "disabled",
        ProxyStatus::CoolingDown => "cooling_down",
    }
}

fn map_sqlx(error: sqlx::Error) -> ApplicationError {
    ApplicationError::Repository(error.to_string())
}

use sqlx::{PgPool, Row};

use crate::db::postgres::default_settings;
use crate::db::postgres::StoredSettings;

#[derive(Clone)]
pub struct PostgresSettingsRepository {
    pool: PgPool,
}

impl PostgresSettingsRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn load(&self) -> Result<StoredSettings, sqlx::Error> {
        let row = sqlx::query(
            r#"
            select
              routing_strategy,
              pool_label,
              max_retries,
              selection_timeout_ms,
              health_interval_secs,
              cooldown_secs,
              timeout_ms,
              concurrency,
              failure_threshold,
              recovery_threshold
            from app_settings
            where singleton = true
            "#,
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(match row {
            Some(row) => StoredSettings {
                routing_strategy: row.get("routing_strategy"),
                pool_label: row.get("pool_label"),
                max_retries: row.get::<i32, _>("max_retries") as u32,
                selection_timeout_ms: row.get::<i64, _>("selection_timeout_ms") as u64,
                health_interval_secs: row.get::<i64, _>("health_interval_secs") as u64,
                cooldown_secs: row.get::<i64, _>("cooldown_secs") as u64,
                timeout_ms: row.get::<i64, _>("timeout_ms") as u64,
                concurrency: row.get::<i32, _>("concurrency") as u32,
                failure_threshold: row.get::<i32, _>("failure_threshold") as u32,
                recovery_threshold: row.get::<i32, _>("recovery_threshold") as u32,
            },
            None => default_settings(),
        })
    }

    pub async fn save(&self, settings: &StoredSettings) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            insert into app_settings (
              singleton,
              routing_strategy,
              pool_label,
              max_retries,
              selection_timeout_ms,
              health_interval_secs,
              cooldown_secs,
              timeout_ms,
              concurrency,
              failure_threshold,
              recovery_threshold,
              updated_at
            )
            values (
              true, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now()
            )
            on conflict (singleton) do update
            set
              routing_strategy = excluded.routing_strategy,
              pool_label = excluded.pool_label,
              max_retries = excluded.max_retries,
              selection_timeout_ms = excluded.selection_timeout_ms,
              health_interval_secs = excluded.health_interval_secs,
              cooldown_secs = excluded.cooldown_secs,
              timeout_ms = excluded.timeout_ms,
              concurrency = excluded.concurrency,
              failure_threshold = excluded.failure_threshold,
              recovery_threshold = excluded.recovery_threshold,
              updated_at = now()
            "#,
        )
        .bind(&settings.routing_strategy)
        .bind(&settings.pool_label)
        .bind(settings.max_retries as i32)
        .bind(settings.selection_timeout_ms as i64)
        .bind(settings.health_interval_secs as i64)
        .bind(settings.cooldown_secs as i64)
        .bind(settings.timeout_ms as i64)
        .bind(settings.concurrency as i32)
        .bind(settings.failure_threshold as i32)
        .bind(settings.recovery_threshold as i32)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

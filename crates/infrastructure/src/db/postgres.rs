use sqlx::{Executor, PgPool};

#[derive(Clone, Debug)]
pub struct StoredSettings {
    pub routing_strategy: String,
    pub pool_label: String,
    pub max_retries: u32,
    pub selection_timeout_ms: u64,
    pub health_interval_secs: u64,
    pub cooldown_secs: u64,
    pub timeout_ms: u64,
    pub concurrency: u32,
    pub failure_threshold: u32,
    pub recovery_threshold: u32,
}

pub async fn initialize_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    let sql = include_str!("../../../../infra/postgres/init.sql");

    for statement in sql.split(';').map(str::trim).filter(|part| !part.is_empty()) {
        if let Err(error) = pool.execute(format!("{statement};").as_str()).await {
            if should_ignore_init_error(&error) {
                continue;
            }

            return Err(error);
        }
    }

    Ok(())
}

pub fn default_settings() -> StoredSettings {
    StoredSettings {
        routing_strategy: "round_robin".to_string(),
        pool_label: "primary-rotation".to_string(),
        max_retries: 2,
        selection_timeout_ms: 2_000,
        health_interval_secs: 30,
        cooldown_secs: 120,
        timeout_ms: 5_000,
        concurrency: 32,
        failure_threshold: 3,
        recovery_threshold: 2,
    }
}

fn should_ignore_init_error(error: &sqlx::Error) -> bool {
    let Some(database_error) = error.as_database_error() else {
        return false;
    };

    match database_error.code().as_deref() {
        Some("23505") | Some("42710") | Some("42P07") => true,
        _ => false,
    }
}

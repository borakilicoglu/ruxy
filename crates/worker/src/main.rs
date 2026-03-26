use std::time::Duration;

use anyhow::Result;
use application::services::{HealthWorkerService, ProxyPoolService};
use chrono::Utc;
use domain::{
    health::HealthThresholds,
    proxy::{NewProxy, ProxyScheme},
};
use infrastructure::{
    db::postgres::initialize_database,
    health::simulated_checker::SimulatedHealthChecker,
    repositories::{
        in_memory_proxy_repository::InMemoryProxyRepository,
        postgres_proxy_repository::PostgresProxyRepository,
    },
};
use sqlx::PgPool;
use tokio::time::interval;
use tracing::info;
use tracing_subscriber::{EnvFilter, fmt};

#[tokio::main]
async fn main() -> Result<()> {
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("worker=info")),
        )
        .with_target(false)
        .compact()
        .init();

    let database_url = std::env::var("DATABASE_URL").ok();

    if let Some(database_url) = database_url {
        let pool = PgPool::connect(&database_url).await?;
        initialize_database(&pool).await?;

        run_worker(PostgresProxyRepository::new(pool)).await?;
    } else {
        run_worker(InMemoryProxyRepository::new()).await?;
    }

    Ok(())
}

async fn run_worker<R>(repository: R) -> Result<()>
where
    R: application::ports::ProxyRepository + Clone,
{
    let thresholds = HealthThresholds::default();
    let pool = ProxyPoolService::new(repository.clone());
    let worker = HealthWorkerService::new(
        repository.clone(),
        SimulatedHealthChecker::new(),
        thresholds,
    );

    seed_if_empty(&pool).await?;

    let mut ticker = interval(Duration::from_secs(5));

    info!("worker started");

    loop {
        tokio::select! {
            _ = ticker.tick() => {
                let checked_at = Utc::now();
                let updated = worker.run_cycle(checked_at).await?;
                let healthy = updated
                    .iter()
                    .filter(|proxy| proxy.status == domain::proxy::ProxyStatus::Healthy)
                    .count();
                let degraded = updated
                    .iter()
                    .filter(|proxy| proxy.status == domain::proxy::ProxyStatus::Degraded)
                    .count();
                let unhealthy = updated
                    .iter()
                    .filter(|proxy| {
                        matches!(
                            proxy.status,
                            domain::proxy::ProxyStatus::Unhealthy | domain::proxy::ProxyStatus::CoolingDown
                        )
                    })
                    .count();

                info!(
                    total = updated.len(),
                    healthy,
                    degraded,
                    unhealthy,
                    "completed health worker cycle"
                );
            }
            _ = tokio::signal::ctrl_c() => {
                info!("worker received shutdown signal");
                break;
            }
        }
    }

    Ok(())
}

async fn seed_if_empty<R>(pool: &ProxyPoolService<R>) -> Result<()>
where
    R: application::ports::ProxyRepository,
{
    if !pool.list_proxies().await?.is_empty() {
        return Ok(());
    }

    let now = Utc::now();

    for proxy in seed_proxies() {
        let created = pool.create_proxy(proxy, now).await?;
        info!(proxy_id = %created.id, host = %created.host, "seeded proxy");
    }

    Ok(())
}

fn seed_proxies() -> Vec<NewProxy> {
    vec![
        NewProxy {
            scheme: ProxyScheme::Http,
            host: "77.104.76.230".to_string(),
            port: 8080,
            username: None,
            password: None,
            tags: vec!["residential".to_string(), "eu".to_string()],
        },
        NewProxy {
            scheme: ProxyScheme::Http,
            host: "8.221.138.111".to_string(),
            port: 8081,
            username: None,
            password: None,
            tags: vec!["datacenter".to_string(), "us".to_string()],
        },
        NewProxy {
            scheme: ProxyScheme::Socks5,
            host: "47.238.128.246".to_string(),
            port: 9200,
            username: Some("proxy-user".to_string()),
            password: Some("secret".to_string()),
            tags: vec!["socks".to_string(), "rotating".to_string()],
        },
        NewProxy {
            scheme: ProxyScheme::Http,
            host: "fail-demo.ruxy.local".to_string(),
            port: 9000,
            username: None,
            password: None,
            tags: vec!["failure".to_string(), "demo".to_string()],
        },
    ]
}

use async_trait::async_trait;
use application::{errors::ApplicationError, ports::ProxyRepository};
use domain::proxy::{Proxy, ProxyScheme, ProxyStatus};
use infrastructure::repositories::{
    in_memory_proxy_repository::InMemoryProxyRepository,
    postgres_proxy_repository::PostgresProxyRepository,
};
use infrastructure::db::postgres::initialize_database;
use infrastructure::telemetry::postgres_telemetry_repository::PostgresTelemetryRepository;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub enum AppRepository {
    InMemory(InMemoryProxyRepository),
    Postgres(PostgresProxyRepository),
}

#[async_trait]
impl ProxyRepository for AppRepository {
    async fn list(&self) -> Result<Vec<Proxy>, ApplicationError> {
        match self {
            Self::InMemory(repo) => repo.list().await,
            Self::Postgres(repo) => repo.list().await,
        }
    }

    async fn get(&self, id: Uuid) -> Result<Option<Proxy>, ApplicationError> {
        match self {
            Self::InMemory(repo) => repo.get(id).await,
            Self::Postgres(repo) => repo.get(id).await,
        }
    }

    async fn insert(&self, proxy: Proxy) -> Result<Proxy, ApplicationError> {
        match self {
            Self::InMemory(repo) => repo.insert(proxy).await,
            Self::Postgres(repo) => repo.insert(proxy).await,
        }
    }

    async fn update(&self, proxy: Proxy) -> Result<Proxy, ApplicationError> {
        match self {
            Self::InMemory(repo) => repo.update(proxy).await,
            Self::Postgres(repo) => repo.update(proxy).await,
        }
    }

    async fn delete(&self, id: Uuid) -> Result<(), ApplicationError> {
        match self {
            Self::InMemory(repo) => repo.delete(id).await,
            Self::Postgres(repo) => repo.delete(id).await,
        }
    }

    async fn exists(&self, id: Uuid) -> Result<bool, ApplicationError> {
        match self {
            Self::InMemory(repo) => repo.exists(id).await,
            Self::Postgres(repo) => repo.exists(id).await,
        }
    }

    async fn status(&self, id: Uuid) -> Result<Option<ProxyStatus>, ApplicationError> {
        match self {
            Self::InMemory(repo) => repo.status(id).await,
            Self::Postgres(repo) => repo.status(id).await,
        }
    }

    async fn exists_with_address(
        &self,
        scheme: ProxyScheme,
        host: &str,
        port: u16,
        username: Option<&str>,
    ) -> Result<bool, ApplicationError> {
        match self {
            Self::InMemory(repo) => repo.exists_with_address(scheme, host, port, username).await,
            Self::Postgres(repo) => repo.exists_with_address(scheme, host, port, username).await,
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub proxy_repository: AppRepository,
    pub telemetry_repository: Option<PostgresTelemetryRepository>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            proxy_repository: AppRepository::InMemory(InMemoryProxyRepository::new()),
            telemetry_repository: None,
        }
    }

    pub async fn from_database_url(database_url: Option<&str>) -> anyhow::Result<Self> {
        if let Some(database_url) = database_url {
            let pool = PgPool::connect(database_url).await?;
            initialize_database(&pool).await?;

            return Ok(Self {
                proxy_repository: AppRepository::Postgres(PostgresProxyRepository::new(pool.clone())),
                telemetry_repository: Some(PostgresTelemetryRepository::new(pool.clone())),
            });
        }

        Ok(Self::new())
    }
}

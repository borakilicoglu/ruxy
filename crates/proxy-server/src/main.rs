use std::{env, net::SocketAddr};

use anyhow::Result;
use application::{
    errors::ApplicationError,
    ports::ProxyRepository,
    services::{SelectionCursor, SelectionService, SelectionStrategy},
};
use async_trait::async_trait;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use domain::proxy::{Proxy, ProxyScheme, ProxyStatus};
use infrastructure::{
    db::postgres::initialize_database,
    repositories::{
        in_memory_proxy_repository::InMemoryProxyRepository,
        postgres_proxy_repository::PostgresProxyRepository,
    },
    telemetry::postgres_telemetry_repository::PostgresTelemetryRepository,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tracing::{info, warn};
use tracing_subscriber::{fmt, EnvFilter};
use uuid::Uuid;

#[derive(Clone)]
enum AppRepository {
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
struct AppState {
    repository: AppRepository,
    selection_cursor: SelectionCursor,
    telemetry_repository: Option<PostgresTelemetryRepository>,
    forward_timeout_ms: u64,
}

impl AppState {
    async fn from_database_url(database_url: Option<&str>) -> Result<Self> {
        let repository = if let Some(database_url) = database_url {
            let pool = PgPool::connect(database_url).await?;
            initialize_database(&pool).await?;
            let repository = AppRepository::Postgres(PostgresProxyRepository::new(pool.clone()));

            return Ok(Self {
                repository,
                selection_cursor: SelectionCursor::new(),
                telemetry_repository: Some(PostgresTelemetryRepository::new(pool)),
                forward_timeout_ms: env::var("PROXY_FORWARD_TIMEOUT_MS")
                    .ok()
                    .and_then(|value| value.parse::<u64>().ok())
                    .unwrap_or(10_000),
            });
        } else {
            AppRepository::InMemory(InMemoryProxyRepository::new())
        };

        Ok(Self {
            repository,
            selection_cursor: SelectionCursor::new(),
            telemetry_repository: None,
            forward_timeout_ms: env::var("PROXY_FORWARD_TIMEOUT_MS")
                .ok()
                .and_then(|value| value.parse::<u64>().ok())
                .unwrap_or(10_000),
        })
    }
}

#[derive(Debug, Deserialize)]
struct NextProxyQuery {
    strategy: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ForwardQuery {
    url: String,
    strategy: Option<String>,
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
}

#[derive(Debug, Serialize)]
struct SelectedProxyResponse {
    strategy: &'static str,
    selected_at: String,
    proxy: ProxyDto,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: &'static str,
    message: String,
}

#[derive(Debug, Serialize)]
struct ProxyDto {
    id: Uuid,
    scheme: &'static str,
    host: String,
    port: u16,
    username: Option<String>,
    tags: Vec<String>,
    status: &'static str,
    avg_latency_ms: Option<u32>,
}

#[derive(Debug, Serialize)]
struct ForwardResponse {
    strategy: &'static str,
    target_url: String,
    selected_at: String,
    completed_at: String,
    latency_ms: u32,
    status_code: Option<u16>,
    success: bool,
    proxy: ProxyDto,
}

#[tokio::main]
async fn main() -> Result<()> {
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("proxy_server=info,tower_http=info")),
        )
        .with_target(false)
        .compact()
        .init();

    let port = env::var("PROXY_SERVER_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8000);
    let database_url = env::var("DATABASE_URL").ok();
    let state = AppState::from_database_url(database_url.as_deref()).await?;

    let app = Router::new()
        .route("/health", get(health))
        .route("/proxy/next", get(next_proxy))
        .route("/proxy/fetch", get(forward_via_proxy))
        .with_state(state);

    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address).await?;

    info!(port, "proxy-server listening");

    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "proxy-server",
    })
}

async fn next_proxy(
    State(state): State<AppState>,
    Query(query): Query<NextProxyQuery>,
) -> Result<Json<SelectedProxyResponse>, (StatusCode, Json<ErrorResponse>)> {
    let strategy = parse_strategy(query.strategy.as_deref())?;
    let service = SelectionService::with_cursor(state.repository.clone(), state.selection_cursor);
    let selected_at = Utc::now();
    let proxy = service
        .select_proxy(strategy, selected_at)
        .await
        .map_err(map_application_error)?;

    if let Some(repository) = state.telemetry_repository {
        if let Err(error) = repository
            .record_selection(&proxy, strategy_label(strategy), selected_at)
            .await
        {
            warn!(%error, proxy_id = %proxy.id, "failed to record selection telemetry");
        }
    }

    Ok(Json(SelectedProxyResponse {
        strategy: strategy_label(strategy),
        selected_at: selected_at.to_rfc3339(),
        proxy: ProxyDto::from(proxy),
    }))
}

async fn forward_via_proxy(
    State(state): State<AppState>,
    Query(query): Query<ForwardQuery>,
) -> Result<Json<ForwardResponse>, (StatusCode, Json<ErrorResponse>)> {
    let strategy = parse_strategy(query.strategy.as_deref())?;
    let selected_at = Utc::now();
    let service = SelectionService::with_cursor(state.repository.clone(), state.selection_cursor);
    let proxy = service
        .select_proxy(strategy, selected_at)
        .await
        .map_err(map_application_error)?;

    if let Some(repository) = state.telemetry_repository.clone() {
        if let Err(error) = repository
            .record_selection(&proxy, strategy_label(strategy), selected_at)
            .await
        {
            warn!(%error, proxy_id = %proxy.id, "failed to record selection telemetry");
        }
    }

    let client = match build_proxy_client(&proxy, state.forward_timeout_ms) {
        Ok(client) => client,
        Err(error) => {
            let completed_at = Utc::now();

            if let Some(repository) = state.telemetry_repository {
                if let Err(record_error) = repository
                    .record_request_outcome(
                        &proxy,
                        strategy_label(strategy),
                        &query.url,
                        false,
                        0,
                        None,
                        Some("invalid_proxy"),
                        completed_at,
                    )
                    .await
                {
                    warn!(%record_error, proxy_id = %proxy.id, "failed to record invalid proxy telemetry");
                }
            }

            return Err(invalid_proxy_error(error));
        }
    };
    let started_at = std::time::Instant::now();
    let response = client.get(&query.url).send().await;
    let latency_ms = started_at.elapsed().as_millis().min(u32::MAX as u128) as u32;
    let completed_at = Utc::now();

    match response {
        Ok(response) => {
            let status_code = response.status().as_u16();
            let success = response.status().is_success();

            if let Some(repository) = state.telemetry_repository {
                if let Err(error) = repository
                    .record_request_outcome(
                        &proxy,
                        strategy_label(strategy),
                        &query.url,
                        success,
                        latency_ms as i32,
                        Some(status_code),
                        None,
                        completed_at,
                    )
                    .await
                {
                    warn!(%error, proxy_id = %proxy.id, "failed to record request telemetry");
                }
            }

            Ok(Json(ForwardResponse {
                strategy: strategy_label(strategy),
                target_url: query.url,
                selected_at: selected_at.to_rfc3339(),
                completed_at: completed_at.to_rfc3339(),
                latency_ms,
                status_code: Some(status_code),
                success,
                proxy: ProxyDto::from(proxy),
            }))
        }
        Err(error) => {
            if let Some(repository) = state.telemetry_repository {
                if let Err(record_error) = repository
                    .record_request_outcome(
                        &proxy,
                        strategy_label(strategy),
                        &query.url,
                        false,
                        latency_ms as i32,
                        None,
                        Some(classify_reqwest_error(&error)),
                        completed_at,
                    )
                    .await
                {
                    warn!(%record_error, proxy_id = %proxy.id, "failed to record request failure telemetry");
                }
            }

            Err((
                StatusCode::BAD_GATEWAY,
                Json(ErrorResponse {
                    error: "forward_failed",
                    message: error.to_string(),
                }),
            ))
        }
    }
}

fn parse_strategy(value: Option<&str>) -> Result<SelectionStrategy, (StatusCode, Json<ErrorResponse>)> {
    match value.unwrap_or("round_robin") {
        "round_robin" => Ok(SelectionStrategy::RoundRobin),
        "random" => Ok(SelectionStrategy::Random),
        other => Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "invalid_strategy",
                message: format!("unsupported strategy: {other}"),
            }),
        )),
    }
}

fn map_application_error(error: ApplicationError) -> (StatusCode, Json<ErrorResponse>) {
    match error {
        ApplicationError::NoHealthyProxy => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ErrorResponse {
                error: "no_healthy_proxy",
                message: error.to_string(),
            }),
        ),
        ApplicationError::Repository(_) | ApplicationError::HealthCheck(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "internal_error",
                message: error.to_string(),
            }),
        ),
        _ => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "bad_request",
                message: error.to_string(),
            }),
        ),
    }
}

fn build_proxy_client(proxy: &Proxy, timeout_ms: u64) -> Result<Client, reqwest::Error> {
    let reqwest_proxy = reqwest::Proxy::all(proxy_url(proxy))?;

    reqwest::Client::builder()
        .proxy(reqwest_proxy)
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()
}

fn proxy_url(proxy: &Proxy) -> String {
    let credentials = match (&proxy.username, &proxy.password) {
        (Some(username), Some(password)) => format!("{username}:{password}@"),
        (Some(username), None) => format!("{username}@"),
        _ => String::new(),
    };
    let authority = normalized_proxy_authority(proxy);

    format!("{}://{}{}", scheme_label(proxy.scheme), credentials, authority)
}

fn normalized_proxy_authority(proxy: &Proxy) -> String {
    let trimmed_host = proxy.host.trim();

    if trimmed_host.starts_with('[') || trimmed_host.matches(':').count() != 1 {
        return format!("{trimmed_host}:{}", proxy.port);
    }

    let mut parts = trimmed_host.rsplitn(2, ':');
    let embedded_port = parts.next();
    let host_part = parts.next();

    match (host_part, embedded_port.and_then(|value| value.parse::<u16>().ok())) {
        (Some(_host_part), Some(_)) => trimmed_host.to_string(),
        _ => format!("{trimmed_host}:{}", proxy.port),
    }
}

fn invalid_proxy_error(error: reqwest::Error) -> (StatusCode, Json<ErrorResponse>) {
    (
        StatusCode::BAD_REQUEST,
        Json(ErrorResponse {
            error: "invalid_proxy",
            message: error.to_string(),
        }),
    )
}

fn classify_reqwest_error(error: &reqwest::Error) -> &'static str {
    if error.is_timeout() {
        "timeout"
    } else if error.is_connect() {
        "connect"
    } else if error.is_status() {
        "status"
    } else if error.is_request() {
        "request"
    } else {
        "unknown"
    }
}

fn strategy_label(strategy: SelectionStrategy) -> &'static str {
    match strategy {
        SelectionStrategy::RoundRobin => "round_robin",
        SelectionStrategy::Random => "random",
    }
}

fn scheme_label(scheme: ProxyScheme) -> &'static str {
    match scheme {
        ProxyScheme::Http => "http",
        ProxyScheme::Https => "https",
        ProxyScheme::Socks5 => "socks5",
    }
}

impl From<Proxy> for ProxyDto {
    fn from(value: Proxy) -> Self {
        Self {
            id: value.id,
            scheme: scheme_label(value.scheme),
            host: value.host,
            port: value.port,
            username: value.username,
            tags: value.tags,
            status: match value.status {
                ProxyStatus::Unknown => "unknown",
                ProxyStatus::Healthy => "healthy",
                ProxyStatus::Degraded => "degraded",
                ProxyStatus::Unhealthy => "unhealthy",
                ProxyStatus::Disabled => "disabled",
                ProxyStatus::CoolingDown => "cooling_down",
            },
            avg_latency_ms: value.avg_latency_ms,
        }
    }
}

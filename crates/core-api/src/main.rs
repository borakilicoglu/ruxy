mod app_state;
mod dto;
mod routes;

use std::{env, net::SocketAddr};

use app_state::AppState;
use axum::{
    http::{header, HeaderValue, Method},
    Router,
};
use tower_http::cors::{Any, CorsLayer};

fn build_app(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin([
            HeaderValue::from_static("http://localhost:3000"),
            HeaderValue::from_static("http://127.0.0.1:3000"),
        ])
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::DELETE,
            Method::PATCH,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::ACCEPT])
        .expose_headers(Any);

    Router::new()
        .nest("/api/events", routes::events::router())
        .nest("/api/health", routes::health::router())
        .nest("/api/metrics", routes::metrics::router())
        .nest("/api/proxies", routes::proxies::router())
        .nest("/api/settings", routes::settings::router())
        .layer(cors)
        .with_state(state)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let port = env::var("CORE_API_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8001);
    let database_url = env::var("DATABASE_URL").ok();

    let state = AppState::from_database_url(database_url.as_deref()).await?;
    let app = build_app(state);

    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address).await?;

    axum::serve(listener, app).await?;
    Ok(())
}

use axum::{routing::get, Json, Router};

use crate::{app_state::AppState, dto::SettingsResponse};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(get_settings))
}

async fn get_settings() -> Json<SettingsResponse> {
    Json(SettingsResponse {
        routing_strategy: "round_robin",
        pool_label: "primary-rotation",
        max_retries: 2,
        selection_timeout_ms: 2_000,
        health_interval_secs: 30,
        cooldown_secs: 120,
        timeout_ms: 5_000,
        concurrency: 32,
        failure_threshold: 3,
        recovery_threshold: 2,
    })
}

use application::services::ProxyPoolService;
use axum::{extract::State, routing::get, Json, Router};
use domain::proxy::ProxyStatus;

use crate::{
    app_state::AppState,
    dto::{EventListResponse, EventResponse},
    routes::proxies::ApiError,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list_events))
}

async fn list_events(State(state): State<AppState>) -> Result<Json<EventListResponse>, ApiError> {
    if let Some(repository) = state.telemetry_repository.clone() {
        let items = repository
            .list_events(50)
            .await
            .map_err(|error| application::errors::ApplicationError::Repository(error.to_string()))
            .map_err(ApiError::from)?
            .into_iter()
            .map(|event| EventResponse {
                id: event.id.to_string(),
                level: event.level,
                category: event.category,
                actor: event.actor,
                message: event.message,
                proxy_id: event.proxy_id,
                timestamp: event.created_at.to_rfc3339(),
            })
            .collect::<Vec<_>>();

        return Ok(Json(EventListResponse {
            total: items.len(),
            items,
        }));
    }

    let service = ProxyPoolService::new(state.proxy_repository);
    let proxies = service.list_proxies().await?;

    let mut items = proxies
        .into_iter()
        .map(|proxy| {
            let (level, category, message) = match proxy.status {
                ProxyStatus::Healthy => (
                    "info",
                    "health",
                    format!("Proxy {} is healthy and selectable", proxy.host),
                ),
                ProxyStatus::CoolingDown => (
                    "warning",
                    "health",
                    format!("Proxy {} entered cooldown after repeated failures", proxy.host),
                ),
                ProxyStatus::Degraded => (
                    "warning",
                    "health",
                    format!("Proxy {} is degraded and should be monitored", proxy.host),
                ),
                ProxyStatus::Unhealthy => (
                    "error",
                    "health",
                    format!("Proxy {} is unhealthy and unavailable", proxy.host),
                ),
                ProxyStatus::Disabled => (
                    "info",
                    "admin",
                    format!("Proxy {} is disabled by control-plane state", proxy.host),
                ),
                ProxyStatus::Unknown => (
                    "info",
                    "inventory",
                    format!("Proxy {} is waiting for first health check", proxy.host),
                ),
            };

            EventResponse {
                id: proxy.id.to_string(),
                level: level.to_string(),
                category: category.to_string(),
                actor: "worker".to_string(),
                message,
                proxy_id: Some(proxy.id),
                timestamp: proxy.updated_at.to_rfc3339(),
            }
        })
        .collect::<Vec<_>>();

    items.sort_by(|left, right| right.timestamp.cmp(&left.timestamp));

    Ok(Json(EventListResponse {
        total: items.len(),
        items,
    }))
}

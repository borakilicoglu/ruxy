use application::services::ProxyPoolService;
use axum::{extract::State, routing::get, Json, Router};
use domain::proxy::ProxyStatus;

use crate::{
    app_state::AppState,
    dto::{HealthCheckListResponse, HealthCheckResponse, HealthSummaryResponse},
    routes::proxies::ApiError,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/summary", get(get_health_summary))
        .route("/checks", get(list_health_checks))
}

async fn get_health_summary(
    State(state): State<AppState>,
) -> Result<Json<HealthSummaryResponse>, ApiError> {
    let service = ProxyPoolService::new(state.proxy_repository);
    let proxies = service.list_proxies().await?;

    let mut summary = HealthSummaryResponse {
        total: proxies.len(),
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        cooling_down: 0,
        disabled: 0,
        unknown: 0,
    };

    for proxy in proxies {
        match proxy.status {
            ProxyStatus::Healthy => summary.healthy += 1,
            ProxyStatus::Degraded => summary.degraded += 1,
            ProxyStatus::Unhealthy => summary.unhealthy += 1,
            ProxyStatus::CoolingDown => summary.cooling_down += 1,
            ProxyStatus::Disabled => summary.disabled += 1,
            ProxyStatus::Unknown => summary.unknown += 1,
        }
    }

    Ok(Json(summary))
}

async fn list_health_checks(
    State(state): State<AppState>,
) -> Result<Json<HealthCheckListResponse>, ApiError> {
    let service = ProxyPoolService::new(state.proxy_repository);
    let proxies = service.list_proxies().await?;

    let items = proxies
        .into_iter()
        .filter_map(|proxy| {
            proxy.last_checked_at.map(|checked_at| {
                let success = matches!(proxy.status, ProxyStatus::Healthy | ProxyStatus::Degraded);
                let error_kind = if success {
                    None
                } else {
                    Some("health_check_failed".to_string())
                };

                HealthCheckResponse {
                    proxy_id: proxy.id,
                    success,
                    latency_ms: proxy.avg_latency_ms,
                    http_status: success.then_some(200),
                    error_kind,
                    checked_at: checked_at.to_rfc3339(),
                }
            })
        })
        .collect::<Vec<_>>();

    let total = items.len();

    Ok(Json(HealthCheckListResponse { items, total }))
}

#[cfg(test)]
mod tests {
    use axum::{
        body::{to_bytes, Body},
        http::{Request, StatusCode},
    };
    use tower::util::ServiceExt;

    use crate::{app_state::AppState, build_app};

    #[tokio::test]
    async fn health_summary_counts_proxy_statuses() {
        let app = build_app(AppState::new());

        let create_request = Request::builder()
            .method("POST")
            .uri("/api/proxies")
            .header("content-type", "application/json")
            .body(Body::from(
                r#"{"scheme":"http","host":"127.0.0.1","port":8080,"username":"user","password":"secret","tags":["test"]}"#,
            ))
            .unwrap();

        let create_response = app.clone().oneshot(create_request).await.unwrap();
        let create_body = to_bytes(create_response.into_body(), usize::MAX).await.unwrap();
        let create_body_text = String::from_utf8(create_body.to_vec()).unwrap();
        let value: serde_json::Value = serde_json::from_str(&create_body_text).unwrap();
        let id = value["id"].as_str().unwrap();

        let check_request = Request::builder()
            .method("POST")
            .uri(format!("/api/proxies/{id}/check"))
            .header("content-type", "application/json")
            .body(Body::from(r#"{"success":true,"latency_ms":88}"#))
            .unwrap();

        let _ = app.clone().oneshot(check_request).await.unwrap();

        let summary_request = Request::builder()
            .method("GET")
            .uri("/api/health/summary")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(summary_request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body_text = String::from_utf8(body.to_vec()).unwrap();
        assert!(body_text.contains("\"total\":1"));
        assert!(body_text.contains("\"healthy\":1"));
    }
}

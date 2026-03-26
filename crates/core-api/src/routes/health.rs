use application::services::ProxyPoolService;
use axum::{extract::State, routing::get, Json, Router};
use domain::proxy::ProxyStatus;

use crate::{
    app_state::AppState,
    dto::HealthSummaryResponse,
    routes::proxies::ApiError,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/summary", get(get_health_summary))
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

use application::{
    errors::ApplicationError,
    services::{HealthService, ProxyPoolService},
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use domain::health::HealthThresholds;
use uuid::Uuid;

use crate::{
    app_state::AppState,
    dto::{
        CreateProxyRequest, CreateProxyResponse, ErrorResponse, ManualHealthCheckRequest,
        ManualHealthCheckResponse, ProxyListResponse, ProxyResponse,
    },
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_proxies).post(create_proxy))
        .route("/{id}", get(get_proxy).delete(delete_proxy))
        .route("/{id}/check", axum::routing::post(run_manual_health_check))
}

async fn list_proxies(State(state): State<AppState>) -> Result<Json<ProxyListResponse>, ApiError> {
    let service = ProxyPoolService::new(state.proxy_repository);
    let items = service
        .list_proxies()
        .await?
        .into_iter()
        .map(ProxyResponse::from)
        .collect::<Vec<_>>();

    Ok(Json(ProxyListResponse {
        total: items.len(),
        items,
    }))
}

async fn create_proxy(
    State(state): State<AppState>,
    Json(payload): Json<CreateProxyRequest>,
) -> Result<(StatusCode, Json<CreateProxyResponse>), ApiError> {
    let service = ProxyPoolService::new(state.proxy_repository);
    let new_proxy = payload.try_into().map_err(ApiError::bad_request)?;
    let proxy = service.create_proxy(new_proxy, Utc::now()).await?;

    Ok((
        StatusCode::CREATED,
        Json(CreateProxyResponse { id: proxy.id }),
    ))
}

async fn get_proxy(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ProxyResponse>, ApiError> {
    let service = ProxyPoolService::new(state.proxy_repository);
    let proxy = service.get_proxy(id).await?;

    Ok(Json(ProxyResponse::from(proxy)))
}

async fn delete_proxy(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let service = ProxyPoolService::new(state.proxy_repository);
    service.delete_proxy(id).await?;

    Ok(StatusCode::NO_CONTENT)
}

async fn run_manual_health_check(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ManualHealthCheckRequest>,
) -> Result<Json<ManualHealthCheckResponse>, ApiError> {
    let success = payload.success;
    let latency_ms = payload.latency_ms;
    let service = HealthService::new(state.proxy_repository, HealthThresholds::default());
    let proxy = service
        .run_health_check(id, payload.into_domain(), Utc::now())
        .await?;

    Ok(Json(ManualHealthCheckResponse::from_proxy(
        &proxy,
        success,
        latency_ms,
    )))
}

pub(crate) struct ApiError {
    status: StatusCode,
    body: ErrorResponse,
}

impl ApiError {
    fn bad_request(body: ErrorResponse) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            body,
        }
    }
}

impl From<ApplicationError> for ApiError {
    fn from(value: ApplicationError) -> Self {
        let status = match value {
            ApplicationError::ProxyNotFound(_) => StatusCode::NOT_FOUND,
            ApplicationError::NoHealthyProxy => StatusCode::SERVICE_UNAVAILABLE,
            ApplicationError::DuplicateProxy => StatusCode::CONFLICT,
            ApplicationError::HealthCheck(_) | ApplicationError::Repository(_) => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        };

        Self {
            status,
            body: value.into(),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.status, Json(self.body)).into_response()
    }
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
    async fn create_proxy_returns_created() {
        let app = build_app(AppState::new());
        let request = Request::builder()
            .method("POST")
            .uri("/api/proxies")
            .header("content-type", "application/json")
            .body(Body::from(
                r#"{"scheme":"http","host":"127.0.0.1","port":8080,"username":"user","password":"secret","tags":["test"]}"#,
            ))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);
    }

    #[tokio::test]
    async fn create_proxy_rejects_host_with_port() {
        let app = build_app(AppState::new());
        let request = Request::builder()
            .method("POST")
            .uri("/api/proxies")
            .header("content-type", "application/json")
            .body(Body::from(
                r#"{"scheme":"http","host":"77.106.77.230:5000","port":9201,"tags":["test"]}"#,
            ))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body_text = String::from_utf8(body.to_vec()).unwrap();
        assert!(body_text.contains("\"code\":\"invalid_host\""));
    }

    #[tokio::test]
    async fn list_proxies_returns_created_proxy() {
        let app = build_app(AppState::new());
        let create_request = Request::builder()
            .method("POST")
            .uri("/api/proxies")
            .header("content-type", "application/json")
            .body(Body::from(
                r#"{"scheme":"http","host":"127.0.0.1","port":8080,"username":"user","password":"secret","tags":["test"]}"#,
            ))
            .unwrap();

        let _ = app.clone().oneshot(create_request).await.unwrap();

        let list_request = Request::builder()
            .method("GET")
            .uri("/api/proxies")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(list_request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let body_text = String::from_utf8(body.to_vec()).unwrap();

        assert!(body_text.contains("\"total\":1"));
        assert!(body_text.contains("\"host\":\"127.0.0.1\""));
    }

    #[tokio::test]
    async fn get_proxy_returns_created_proxy() {
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
        let id = extract_id(&create_body_text);

        let get_request = Request::builder()
            .method("GET")
            .uri(format!("/api/proxies/{id}"))
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(get_request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn delete_proxy_removes_proxy() {
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
        let id = extract_id(&create_body_text);

        let delete_request = Request::builder()
            .method("DELETE")
            .uri(format!("/api/proxies/{id}"))
            .body(Body::empty())
            .unwrap();

        let delete_response = app.clone().oneshot(delete_request).await.unwrap();
        assert_eq!(delete_response.status(), StatusCode::NO_CONTENT);

        let get_request = Request::builder()
            .method("GET")
            .uri(format!("/api/proxies/{id}"))
            .body(Body::empty())
            .unwrap();

        let get_response = app.oneshot(get_request).await.unwrap();
        assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn manual_health_check_updates_status() {
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
        let id = extract_id(&create_body_text);

        let check_request = Request::builder()
            .method("POST")
            .uri(format!("/api/proxies/{id}/check"))
            .header("content-type", "application/json")
            .body(Body::from(r#"{"success":true,"latency_ms":88}"#))
            .unwrap();

        let check_response = app.oneshot(check_request).await.unwrap();
        assert_eq!(check_response.status(), StatusCode::OK);

        let check_body = to_bytes(check_response.into_body(), usize::MAX).await.unwrap();
        let check_text = String::from_utf8(check_body.to_vec()).unwrap();
        assert!(check_text.contains("\"status_after_check\":\"healthy\""));
    }

    fn extract_id(body: &str) -> String {
        let value: serde_json::Value = serde_json::from_str(body).unwrap();
        value["id"].as_str().unwrap().to_string()
    }
}

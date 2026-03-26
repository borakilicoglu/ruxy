use application::services::ProxyPoolService;
use axum::{extract::State, routing::get, Json, Router};
use domain::proxy::ProxyStatus;
use infrastructure::telemetry::postgres_telemetry_repository::TelemetryRequest;

use crate::{
    app_state::AppState,
    dto::{
        LatencyBandResponse, LatencyMetricsResponse, MetricsOverviewResponse,
        SuccessRateBucketResponse, SuccessRateMetricsResponse,
    },
    routes::proxies::ApiError,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/overview", get(get_metrics_overview))
        .route("/latency", get(get_latency_metrics))
        .route("/success-rate", get(get_success_rate_metrics))
}

async fn get_metrics_overview(
    State(state): State<AppState>,
) -> Result<Json<MetricsOverviewResponse>, ApiError> {
    let service = ProxyPoolService::new(state.proxy_repository);
    let proxies = service.list_proxies().await?;

    let total_proxies = proxies.len();
    let healthy_proxies = proxies
        .iter()
        .filter(|proxy| proxy.status == ProxyStatus::Healthy)
        .count();
    let selection_ready = proxies
        .iter()
        .filter(|proxy| proxy.status == ProxyStatus::Healthy)
        .count();
    let needs_attention = proxies
        .iter()
        .filter(|proxy| {
            matches!(
                proxy.status,
                ProxyStatus::Degraded | ProxyStatus::Unhealthy | ProxyStatus::CoolingDown
            )
        })
        .count();

    let latency_values = proxies
        .iter()
        .filter_map(|proxy| proxy.avg_latency_ms)
        .collect::<Vec<_>>();
    let average_latency_ms = (!latency_values.is_empty()).then(|| {
        (latency_values.iter().map(|value| *value as u64).sum::<u64>() / latency_values.len() as u64)
            as u32
    });

    let healthy_ratio = if total_proxies == 0 {
        0.0
    } else {
        healthy_proxies as f64 / total_proxies as f64
    };

    Ok(Json(MetricsOverviewResponse {
        total_proxies,
        healthy_proxies,
        healthy_ratio,
        average_latency_ms,
        selection_ready,
        needs_attention,
    }))
}

async fn get_latency_metrics(
    State(state): State<AppState>,
) -> Result<Json<LatencyMetricsResponse>, ApiError> {
    if let Some(telemetry) = state.telemetry_repository.clone() {
        let requests = telemetry
            .list_requests(500)
            .await
            .map_err(|error| ApiError::from(application::errors::ApplicationError::Repository(error.to_string())))?;

        if requests.iter().any(|request| request.outcome != "selected") {
            return Ok(Json(latency_metrics_from_requests(&requests)));
        }
    }

    let service = ProxyPoolService::new(state.proxy_repository);
    let proxies = service.list_proxies().await?;

    let latency_values = proxies
        .iter()
        .filter_map(|proxy| proxy.avg_latency_ms)
        .collect::<Vec<_>>();
    let average_latency_ms = (!latency_values.is_empty()).then(|| {
        (latency_values.iter().map(|value| *value as u64).sum::<u64>() / latency_values.len() as u64)
            as u32
    });

    let items = vec![
        LatencyBandResponse {
            label: "< 250ms",
            count: proxies
                .iter()
                .filter(|proxy| (proxy.avg_latency_ms.unwrap_or(u32::MAX)) < 250)
                .count(),
        },
        LatencyBandResponse {
            label: "250ms - 500ms",
            count: proxies
                .iter()
                .filter(|proxy| {
                    let latency = proxy.avg_latency_ms.unwrap_or(u32::MAX);
                    (250..500).contains(&latency)
                })
                .count(),
        },
        LatencyBandResponse {
            label: "500ms - 1s",
            count: proxies
                .iter()
                .filter(|proxy| {
                    let latency = proxy.avg_latency_ms.unwrap_or(u32::MAX);
                    (500..1000).contains(&latency)
                })
                .count(),
        },
        LatencyBandResponse {
            label: "1s - 5s",
            count: proxies
                .iter()
                .filter(|proxy| {
                    let latency = proxy.avg_latency_ms.unwrap_or(u32::MAX);
                    (1000..5000).contains(&latency)
                })
                .count(),
        },
        LatencyBandResponse {
            label: "> 5s / no data",
            count: proxies
                .iter()
                .filter(|proxy| proxy.avg_latency_ms.is_none_or(|latency| latency >= 5000))
                .count(),
        },
    ];

    Ok(Json(LatencyMetricsResponse {
        average_latency_ms,
        items,
    }))
}

async fn get_success_rate_metrics(
    State(state): State<AppState>,
) -> Result<Json<SuccessRateMetricsResponse>, ApiError> {
    if let Some(telemetry) = state.telemetry_repository.clone() {
        let requests = telemetry
            .list_requests(500)
            .await
            .map_err(|error| ApiError::from(application::errors::ApplicationError::Repository(error.to_string())))?;

        if requests.iter().any(|request| request.outcome != "selected") {
            return Ok(Json(success_rate_metrics_from_requests(&requests)));
        }
    }

    let service = ProxyPoolService::new(state.proxy_repository);
    let proxies = service.list_proxies().await?;

    let success_values = proxies
        .iter()
        .filter_map(|proxy| proxy.success_rate)
        .collect::<Vec<_>>();
    let average_success_rate = if success_values.is_empty() {
        0.0
    } else {
        success_values.iter().sum::<f64>() / success_values.len() as f64
    };

    let items = vec![
        SuccessRateBucketResponse {
            label: "95% - 100%",
            count: proxies
                .iter()
                .filter(|proxy| proxy.success_rate.is_some_and(|value| value >= 0.95))
                .count(),
        },
        SuccessRateBucketResponse {
            label: "80% - 95%",
            count: proxies
                .iter()
                .filter(|proxy| proxy.success_rate.is_some_and(|value| (0.80..0.95).contains(&value)))
                .count(),
        },
        SuccessRateBucketResponse {
            label: "50% - 80%",
            count: proxies
                .iter()
                .filter(|proxy| proxy.success_rate.is_some_and(|value| (0.50..0.80).contains(&value)))
                .count(),
        },
        SuccessRateBucketResponse {
            label: "< 50%",
            count: proxies
                .iter()
                .filter(|proxy| proxy.success_rate.is_some_and(|value| value < 0.50))
                .count(),
        },
        SuccessRateBucketResponse {
            label: "No data",
            count: proxies
                .iter()
                .filter(|proxy| proxy.success_rate.is_none())
                .count(),
        },
    ];

    Ok(Json(SuccessRateMetricsResponse {
        average_success_rate,
        items,
    }))
}

fn latency_metrics_from_requests(requests: &[TelemetryRequest]) -> LatencyMetricsResponse {
    let completed_requests = requests
        .iter()
        .filter(|request| request.outcome == "succeeded" || request.outcome == "failed")
        .collect::<Vec<_>>();
    let latency_values = completed_requests
        .iter()
        .filter_map(|request| request.latency_ms)
        .map(|value| value as u32)
        .collect::<Vec<_>>();
    let average_latency_ms = (!latency_values.is_empty()).then(|| {
        (latency_values.iter().map(|value| *value as u64).sum::<u64>() / latency_values.len() as u64)
            as u32
    });

    let items = vec![
        LatencyBandResponse {
            label: "< 250ms",
            count: completed_requests
                .iter()
                .filter(|request| request.latency_ms.is_some_and(|value| value < 250))
                .count(),
        },
        LatencyBandResponse {
            label: "250ms - 500ms",
            count: completed_requests
                .iter()
                .filter(|request| request.latency_ms.is_some_and(|value| (250..500).contains(&value)))
                .count(),
        },
        LatencyBandResponse {
            label: "500ms - 1s",
            count: completed_requests
                .iter()
                .filter(|request| request.latency_ms.is_some_and(|value| (500..1000).contains(&value)))
                .count(),
        },
        LatencyBandResponse {
            label: "1s - 5s",
            count: completed_requests
                .iter()
                .filter(|request| request.latency_ms.is_some_and(|value| (1000..5000).contains(&value)))
                .count(),
        },
        LatencyBandResponse {
            label: "> 5s / no data",
            count: completed_requests
                .iter()
                .filter(|request| request.latency_ms.is_none_or(|value| value >= 5000))
                .count(),
        },
    ];

    LatencyMetricsResponse {
        average_latency_ms,
        items,
    }
}

fn success_rate_metrics_from_requests(requests: &[TelemetryRequest]) -> SuccessRateMetricsResponse {
    let grouped = requests
        .iter()
        .filter(|request| request.outcome == "succeeded" || request.outcome == "failed")
        .fold(std::collections::BTreeMap::<Option<uuid::Uuid>, (usize, usize)>::new(), |mut acc, request| {
            let entry = acc.entry(request.proxy_id).or_default();
            entry.0 += 1;
            if request.outcome == "succeeded" {
                entry.1 += 1;
            }
            acc
        });

    let rates = grouped
        .values()
        .map(|(total, succeeded)| *succeeded as f64 / *total as f64)
        .collect::<Vec<_>>();
    let average_success_rate = if rates.is_empty() {
        0.0
    } else {
        rates.iter().sum::<f64>() / rates.len() as f64
    };

    let items = vec![
        SuccessRateBucketResponse {
            label: "95% - 100%",
            count: rates.iter().filter(|value| **value >= 0.95).count(),
        },
        SuccessRateBucketResponse {
            label: "80% - 95%",
            count: rates
                .iter()
                .filter(|value| {
                    let value = **value;
                    (0.80..0.95).contains(&value)
                })
                .count(),
        },
        SuccessRateBucketResponse {
            label: "50% - 80%",
            count: rates
                .iter()
                .filter(|value| {
                    let value = **value;
                    (0.50..0.80).contains(&value)
                })
                .count(),
        },
        SuccessRateBucketResponse {
            label: "< 50%",
            count: rates.iter().filter(|value| **value < 0.50).count(),
        },
        SuccessRateBucketResponse {
            label: "No data",
            count: 0,
        },
    ];

    SuccessRateMetricsResponse {
        average_success_rate,
        items,
    }
}

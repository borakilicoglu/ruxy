use application::errors::ApplicationError;
use domain::proxy::{HealthCheckResult, NewProxy, Proxy, ProxyScheme, ProxyStatus};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: ErrorBody,
}

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub code: &'static str,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ProxyListResponse {
    pub items: Vec<ProxyResponse>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
pub struct HealthSummaryResponse {
    pub total: usize,
    pub healthy: usize,
    pub degraded: usize,
    pub unhealthy: usize,
    pub cooling_down: usize,
    pub disabled: usize,
    pub unknown: usize,
}

#[derive(Debug, Serialize)]
pub struct MetricsOverviewResponse {
    pub total_proxies: usize,
    pub healthy_proxies: usize,
    pub healthy_ratio: f64,
    pub average_latency_ms: Option<u32>,
    pub selection_ready: usize,
    pub needs_attention: usize,
}

#[derive(Debug, Serialize)]
pub struct LatencyMetricsResponse {
    pub average_latency_ms: Option<u32>,
    pub items: Vec<LatencyBandResponse>,
}

#[derive(Debug, Serialize)]
pub struct LatencyBandResponse {
    pub label: &'static str,
    pub count: usize,
}

#[derive(Debug, Serialize)]
pub struct SuccessRateMetricsResponse {
    pub average_success_rate: f64,
    pub items: Vec<SuccessRateBucketResponse>,
}

#[derive(Debug, Serialize)]
pub struct SuccessRateBucketResponse {
    pub label: &'static str,
    pub count: usize,
}

#[derive(Debug, Serialize)]
pub struct EventListResponse {
    pub items: Vec<EventResponse>,
    pub total: usize,
}

#[derive(Debug, Serialize)]
pub struct EventResponse {
    pub id: String,
    pub level: String,
    pub category: String,
    pub actor: String,
    pub message: String,
    pub proxy_id: Option<Uuid>,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
pub struct SettingsResponse {
    pub routing_strategy: &'static str,
    pub pool_label: &'static str,
    pub max_retries: u32,
    pub selection_timeout_ms: u64,
    pub health_interval_secs: u64,
    pub cooldown_secs: u64,
    pub timeout_ms: u64,
    pub concurrency: u32,
    pub failure_threshold: u32,
    pub recovery_threshold: u32,
}

#[derive(Debug, Serialize)]
pub struct ProxyResponse {
    pub id: Uuid,
    pub scheme: &'static str,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub tags: Vec<String>,
    pub status: &'static str,
    pub score: i32,
    pub avg_latency_ms: Option<u32>,
    pub success_rate: Option<f64>,
    pub consecutive_failures: u32,
    pub last_checked_at: Option<String>,
    pub cooldown_until: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProxyRequest {
    pub scheme: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateProxyResponse {
    pub id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct ManualHealthCheckRequest {
    pub success: bool,
    pub latency_ms: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct ManualHealthCheckResponse {
    pub proxy_id: Uuid,
    pub success: bool,
    pub latency_ms: Option<u32>,
    pub checked_at: String,
    pub status_after_check: &'static str,
}

impl TryFrom<CreateProxyRequest> for NewProxy {
    type Error = ErrorResponse;

    fn try_from(value: CreateProxyRequest) -> Result<Self, Self::Error> {
        let scheme = parse_scheme(&value.scheme)?;
        let host = parse_host(&value.host)?;

        Ok(Self {
            scheme,
            host,
            port: value.port,
            username: value.username,
            password: value.password,
            tags: value.tags,
        })
    }
}

impl From<Proxy> for ProxyResponse {
    fn from(value: Proxy) -> Self {
        Self {
            id: value.id,
            scheme: scheme_label(value.scheme),
            host: value.host,
            port: value.port,
            username: value.username,
            tags: value.tags,
            status: status_label(value.status),
            score: value.score,
            avg_latency_ms: value.avg_latency_ms,
            success_rate: value.success_rate,
            consecutive_failures: value.consecutive_failures,
            last_checked_at: value.last_checked_at.map(|ts| ts.to_rfc3339()),
            cooldown_until: value.cooldown_until.map(|ts| ts.to_rfc3339()),
            created_at: value.created_at.to_rfc3339(),
            updated_at: value.updated_at.to_rfc3339(),
        }
    }
}

impl ManualHealthCheckRequest {
    pub fn into_domain(self) -> HealthCheckResult {
        if self.success {
            HealthCheckResult::Success {
                latency_ms: self.latency_ms,
            }
        } else {
            HealthCheckResult::Failure
        }
    }
}

impl ManualHealthCheckResponse {
    pub fn from_proxy(proxy: &Proxy, success: bool, latency_ms: Option<u32>) -> Self {
        Self {
            proxy_id: proxy.id,
            success,
            latency_ms,
            checked_at: proxy
                .last_checked_at
                .map(|value| value.to_rfc3339())
                .unwrap_or_default(),
            status_after_check: status_label(proxy.status),
        }
    }
}

impl From<ApplicationError> for ErrorResponse {
    fn from(value: ApplicationError) -> Self {
        match value {
            ApplicationError::ProxyNotFound(_) => Self {
                error: ErrorBody {
                    code: "proxy_not_found",
                    message: value.to_string(),
                },
            },
            ApplicationError::NoHealthyProxy => Self {
                error: ErrorBody {
                    code: "no_healthy_proxy",
                    message: value.to_string(),
                },
            },
            ApplicationError::DuplicateProxy => Self {
                error: ErrorBody {
                    code: "duplicate_proxy",
                    message: value.to_string(),
                },
            },
            ApplicationError::HealthCheck(_) => Self {
                error: ErrorBody {
                    code: "health_check_error",
                    message: value.to_string(),
                },
            },
            ApplicationError::Repository(_) => Self {
                error: ErrorBody {
                    code: "repository_error",
                    message: value.to_string(),
                },
            },
        }
    }
}

fn parse_scheme(value: &str) -> Result<ProxyScheme, ErrorResponse> {
    match value {
        "http" => Ok(ProxyScheme::Http),
        "https" => Ok(ProxyScheme::Https),
        "socks5" => Ok(ProxyScheme::Socks5),
        _ => Err(ErrorResponse {
            error: ErrorBody {
                code: "invalid_scheme",
                message: format!("unsupported proxy scheme: {value}"),
            },
        }),
    }
}

fn parse_host(value: &str) -> Result<String, ErrorResponse> {
    let host = value.trim();

    if host.is_empty() {
        return Err(ErrorResponse {
            error: ErrorBody {
                code: "invalid_host",
                message: "host is required".to_string(),
            },
        });
    }

    if host.contains("://") || host.contains('/') {
        return Err(ErrorResponse {
            error: ErrorBody {
                code: "invalid_host",
                message: "host must contain only the hostname or IP address".to_string(),
            },
        });
    }

    let is_bracketed_ipv6 = host.starts_with('[') && host.ends_with(']');

    if host.contains(':') && !is_bracketed_ipv6 {
        return Err(ErrorResponse {
            error: ErrorBody {
                code: "invalid_host",
                message: "host must not include a port; enter the port in the port field".to_string(),
            },
        });
    }

    Ok(host.to_string())
}

fn scheme_label(value: ProxyScheme) -> &'static str {
    match value {
        ProxyScheme::Http => "http",
        ProxyScheme::Https => "https",
        ProxyScheme::Socks5 => "socks5",
    }
}

fn status_label(value: ProxyStatus) -> &'static str {
    match value {
        ProxyStatus::Unknown => "unknown",
        ProxyStatus::Healthy => "healthy",
        ProxyStatus::Degraded => "degraded",
        ProxyStatus::Unhealthy => "unhealthy",
        ProxyStatus::Disabled => "disabled",
        ProxyStatus::CoolingDown => "cooling_down",
    }
}

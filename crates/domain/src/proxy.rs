use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::health::HealthThresholds;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProxyStatus {
    Unknown,
    Healthy,
    Degraded,
    Unhealthy,
    Disabled,
    CoolingDown,
}

impl ProxyStatus {
    pub fn is_selectable(self) -> bool {
        matches!(self, Self::Healthy)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProxyScheme {
    Http,
    Https,
    Socks5,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proxy {
    pub id: Uuid,
    pub scheme: ProxyScheme,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tags: Vec<String>,
    pub status: ProxyStatus,
    pub score: i32,
    pub avg_latency_ms: Option<u32>,
    pub success_rate: Option<f64>,
    pub consecutive_failures: u32,
    pub consecutive_successes: u32,
    pub last_checked_at: Option<DateTime<Utc>>,
    pub cooldown_until: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct NewProxy {
    pub scheme: ProxyScheme,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealthCheckResult {
    Success { latency_ms: Option<u32> },
    Failure,
}

impl Proxy {
    pub fn new(input: NewProxy, now: DateTime<Utc>) -> Self {
        Self {
            id: Uuid::new_v4(),
            scheme: input.scheme,
            host: input.host,
            port: input.port,
            username: input.username,
            password: input.password,
            tags: input.tags,
            status: ProxyStatus::Unknown,
            score: 0,
            avg_latency_ms: None,
            success_rate: None,
            consecutive_failures: 0,
            consecutive_successes: 0,
            last_checked_at: None,
            cooldown_until: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn is_selectable(&self, now: DateTime<Utc>) -> bool {
        self.status.is_selectable() && !self.cooldown_active(now)
    }

    pub fn apply_health_check(
        &mut self,
        result: HealthCheckResult,
        checked_at: DateTime<Utc>,
        thresholds: HealthThresholds,
    ) {
        self.last_checked_at = Some(checked_at);
        self.updated_at = checked_at;

        match result {
            HealthCheckResult::Success { latency_ms } => self.apply_success(latency_ms, checked_at, thresholds),
            HealthCheckResult::Failure => self.apply_failure(checked_at, thresholds),
        }
    }

    pub fn disable(&mut self, now: DateTime<Utc>) {
        self.status = ProxyStatus::Disabled;
        self.cooldown_until = None;
        self.consecutive_failures = 0;
        self.consecutive_successes = 0;
        self.updated_at = now;
    }

    pub fn enable(&mut self, now: DateTime<Utc>) {
        self.status = ProxyStatus::Unknown;
        self.cooldown_until = None;
        self.consecutive_failures = 0;
        self.consecutive_successes = 0;
        self.updated_at = now;
    }

    fn apply_success(
        &mut self,
        latency_ms: Option<u32>,
        checked_at: DateTime<Utc>,
        thresholds: HealthThresholds,
    ) {
        self.consecutive_failures = 0;
        self.consecutive_successes += 1;
        self.avg_latency_ms = latency_ms;

        if self.status == ProxyStatus::Disabled {
            return;
        }

        if self.status == ProxyStatus::CoolingDown
            && self.cooldown_until.is_some_and(|until| checked_at < until)
        {
            return;
        }

        self.cooldown_until = None;

        match self.status {
            ProxyStatus::Unknown => {
                self.status = ProxyStatus::Healthy;
            }
            ProxyStatus::Degraded | ProxyStatus::Unhealthy | ProxyStatus::CoolingDown => {
                if self.consecutive_successes >= thresholds.successes_to_healthy {
                    self.status = ProxyStatus::Healthy;
                }
            }
            ProxyStatus::Healthy | ProxyStatus::Disabled => {}
        }
    }

    fn apply_failure(&mut self, checked_at: DateTime<Utc>, thresholds: HealthThresholds) {
        if self.status == ProxyStatus::Disabled {
            return;
        }

        self.consecutive_successes = 0;
        self.consecutive_failures += 1;

        self.status = match self.status {
            ProxyStatus::Unknown => ProxyStatus::Unhealthy,
            ProxyStatus::Healthy => {
                if self.consecutive_failures >= thresholds.failures_to_degraded {
                    ProxyStatus::Degraded
                } else {
                    ProxyStatus::Healthy
                }
            }
            ProxyStatus::Degraded => {
                if self.consecutive_failures >= thresholds.failures_to_unhealthy {
                    ProxyStatus::Unhealthy
                } else {
                    ProxyStatus::Degraded
                }
            }
            ProxyStatus::Unhealthy | ProxyStatus::CoolingDown => {
                if self.consecutive_failures >= thresholds.failures_to_cooldown {
                    self.cooldown_until = Some(
                        checked_at
                            + chrono::Duration::from_std(thresholds.cooldown)
                                .expect("cooldown duration should fit chrono duration"),
                    );
                    ProxyStatus::CoolingDown
                } else {
                    ProxyStatus::Unhealthy
                }
            }
            ProxyStatus::Disabled => ProxyStatus::Disabled,
        };
    }

    fn cooldown_active(&self, now: DateTime<Utc>) -> bool {
        self.status == ProxyStatus::CoolingDown
            && self.cooldown_until.is_some_and(|until| now < until)
    }
}

#[cfg(test)]
mod tests {
    use super::{HealthCheckResult, NewProxy, Proxy, ProxyScheme, ProxyStatus};
    use crate::health::HealthThresholds;
    use chrono::{Duration, TimeZone, Utc};

    fn proxy() -> Proxy {
        Proxy::new(
            NewProxy {
                scheme: ProxyScheme::Http,
                host: "127.0.0.1".to_string(),
                port: 8080,
                username: None,
                password: None,
                tags: vec!["test".to_string()],
            },
            Utc.with_ymd_and_hms(2026, 3, 26, 10, 0, 0).unwrap(),
        )
    }

    #[test]
    fn new_proxy_starts_unknown() {
        let proxy = proxy();
        assert_eq!(proxy.status, ProxyStatus::Unknown);
        assert_eq!(proxy.consecutive_failures, 0);
        assert_eq!(proxy.consecutive_successes, 0);
    }

    #[test]
    fn unknown_becomes_healthy_after_first_success() {
        let mut proxy = proxy();
        let now = Utc.with_ymd_and_hms(2026, 3, 26, 10, 1, 0).unwrap();

        proxy.apply_health_check(
            HealthCheckResult::Success {
                latency_ms: Some(120),
            },
            now,
            HealthThresholds::default(),
        );

        assert_eq!(proxy.status, ProxyStatus::Healthy);
        assert_eq!(proxy.consecutive_successes, 1);
        assert_eq!(proxy.consecutive_failures, 0);
    }

    #[test]
    fn healthy_moves_to_degraded_then_unhealthy_then_cooling_down() {
        let thresholds = HealthThresholds::default();
        let mut proxy = proxy();
        let start = Utc.with_ymd_and_hms(2026, 3, 26, 10, 1, 0).unwrap();

        proxy.apply_health_check(
            HealthCheckResult::Success { latency_ms: None },
            start,
            thresholds,
        );
        proxy.apply_health_check(HealthCheckResult::Failure, start + Duration::seconds(10), thresholds);
        assert_eq!(proxy.status, ProxyStatus::Degraded);

        proxy.apply_health_check(HealthCheckResult::Failure, start + Duration::seconds(20), thresholds);
        assert_eq!(proxy.status, ProxyStatus::Unhealthy);

        proxy.apply_health_check(HealthCheckResult::Failure, start + Duration::seconds(30), thresholds);
        assert_eq!(proxy.status, ProxyStatus::CoolingDown);
        assert!(proxy.cooldown_until.is_some());
    }

    #[test]
    fn degraded_requires_two_successes_to_recover() {
        let thresholds = HealthThresholds::default();
        let mut proxy = proxy();
        let start = Utc.with_ymd_and_hms(2026, 3, 26, 10, 1, 0).unwrap();

        proxy.apply_health_check(
            HealthCheckResult::Success { latency_ms: None },
            start,
            thresholds,
        );
        proxy.apply_health_check(HealthCheckResult::Failure, start + Duration::seconds(10), thresholds);
        assert_eq!(proxy.status, ProxyStatus::Degraded);

        proxy.apply_health_check(
            HealthCheckResult::Success { latency_ms: None },
            start + Duration::seconds(20),
            thresholds,
        );
        assert_eq!(proxy.status, ProxyStatus::Degraded);

        proxy.apply_health_check(
            HealthCheckResult::Success { latency_ms: None },
            start + Duration::seconds(30),
            thresholds,
        );
        assert_eq!(proxy.status, ProxyStatus::Healthy);
    }

    #[test]
    fn disabled_proxy_ignores_health_transitions_until_enabled() {
        let thresholds = HealthThresholds::default();
        let mut proxy = proxy();
        let start = Utc.with_ymd_and_hms(2026, 3, 26, 10, 1, 0).unwrap();

        proxy.disable(start);
        proxy.apply_health_check(HealthCheckResult::Failure, start + Duration::seconds(10), thresholds);
        assert_eq!(proxy.status, ProxyStatus::Disabled);

        proxy.enable(start + Duration::seconds(20));
        assert_eq!(proxy.status, ProxyStatus::Unknown);
    }
}

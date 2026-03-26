use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HealthThresholds {
    pub failures_to_degraded: u32,
    pub failures_to_unhealthy: u32,
    pub failures_to_cooldown: u32,
    pub successes_to_healthy: u32,
    pub cooldown: Duration,
}

impl Default for HealthThresholds {
    fn default() -> Self {
        Self {
            failures_to_degraded: 1,
            failures_to_unhealthy: 2,
            failures_to_cooldown: 3,
            successes_to_healthy: 2,
            cooldown: Duration::from_secs(60),
        }
    }
}

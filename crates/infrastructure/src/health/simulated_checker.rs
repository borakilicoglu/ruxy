use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use application::{errors::ApplicationError, ports::HealthChecker};
use domain::proxy::{HealthCheckResult, Proxy};
use uuid::Uuid;

#[derive(Clone, Default)]
pub struct SimulatedHealthChecker {
    attempts: Arc<Mutex<HashMap<Uuid, u32>>>,
}

impl SimulatedHealthChecker {
    pub fn new() -> Self {
        Self::default()
    }
}

impl HealthChecker for SimulatedHealthChecker {
    fn check(&self, proxy: &Proxy) -> Result<HealthCheckResult, ApplicationError> {
        let mut attempts = self
            .attempts
            .lock()
            .map_err(|error| ApplicationError::HealthCheck(format!("mutex poisoned: {error}")))?;
        let attempt = attempts
            .entry(proxy.id)
            .and_modify(|count| *count += 1)
            .or_insert(1);

        if proxy.host.contains("fail") {
            return Ok(HealthCheckResult::Failure);
        }

        if *attempt % 4 == 0 && proxy.port % 2 == 0 {
            return Ok(HealthCheckResult::Failure);
        }

        let latency_ms = 75 + ((proxy.port as u32 + *attempt * 13) % 450);

        Ok(HealthCheckResult::Success {
            latency_ms: Some(latency_ms),
        })
    }
}

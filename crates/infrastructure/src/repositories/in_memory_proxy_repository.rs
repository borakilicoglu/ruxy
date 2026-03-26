use async_trait::async_trait;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use application::{errors::ApplicationError, ports::ProxyRepository};
use domain::proxy::{Proxy, ProxyScheme, ProxyStatus};
use uuid::Uuid;

#[derive(Clone, Default)]
pub struct InMemoryProxyRepository {
    proxies: Arc<Mutex<HashMap<Uuid, Proxy>>>,
}

impl InMemoryProxyRepository {
    pub fn new() -> Self {
        Self::default()
    }

    fn lock(&self) -> Result<std::sync::MutexGuard<'_, HashMap<Uuid, Proxy>>, ApplicationError> {
        self.proxies
            .lock()
            .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))
    }
}

#[async_trait]
impl ProxyRepository for InMemoryProxyRepository {
    async fn list(&self) -> Result<Vec<Proxy>, ApplicationError> {
        Ok(self.lock()?.values().cloned().collect())
    }

    async fn get(&self, id: Uuid) -> Result<Option<Proxy>, ApplicationError> {
        Ok(self.lock()?.get(&id).cloned())
    }

    async fn insert(&self, proxy: Proxy) -> Result<Proxy, ApplicationError> {
        self.lock()?.insert(proxy.id, proxy.clone());
        Ok(proxy)
    }

    async fn update(&self, proxy: Proxy) -> Result<Proxy, ApplicationError> {
        self.lock()?.insert(proxy.id, proxy.clone());
        Ok(proxy)
    }

    async fn delete(&self, id: Uuid) -> Result<(), ApplicationError> {
        self.lock()?.remove(&id);
        Ok(())
    }

    async fn exists(&self, id: Uuid) -> Result<bool, ApplicationError> {
        Ok(self.lock()?.contains_key(&id))
    }

    async fn status(&self, id: Uuid) -> Result<Option<ProxyStatus>, ApplicationError> {
        Ok(self.lock()?.get(&id).map(|proxy| proxy.status))
    }

    async fn exists_with_address(
        &self,
        scheme: ProxyScheme,
        host: &str,
        port: u16,
        username: Option<&str>,
    ) -> Result<bool, ApplicationError> {
        Ok(self.lock()?.values().any(|proxy| {
            proxy.scheme == scheme
                && proxy.host == host
                && proxy.port == port
                && proxy.username.as_deref() == username
        }))
    }
}

#[cfg(test)]
mod tests {
    use application::services::{HealthService, ProxyPoolService};
    use chrono::{TimeZone, Utc};
    use domain::{
        health::HealthThresholds,
        proxy::{HealthCheckResult, NewProxy, ProxyScheme, ProxyStatus},
    };

    use super::InMemoryProxyRepository;

    fn sample_new_proxy() -> NewProxy {
        NewProxy {
            scheme: ProxyScheme::Http,
            host: "127.0.0.1".to_string(),
            port: 8080,
            username: Some("user".to_string()),
            password: Some("secret".to_string()),
            tags: vec!["test".to_string()],
        }
    }

    #[tokio::test]
    async fn repository_can_back_application_services() {
        let repository = InMemoryProxyRepository::new();
        let pool = ProxyPoolService::new(repository.clone());
        let health = HealthService::new(repository, HealthThresholds::default());
        let now = Utc.with_ymd_and_hms(2026, 3, 26, 13, 0, 0).unwrap();

        let proxy = pool.create_proxy(sample_new_proxy(), now).await.unwrap();
        let updated = health
            .run_health_check(
                proxy.id,
                HealthCheckResult::Success {
                    latency_ms: Some(95),
                },
                now,
            )
            .await
            .unwrap();

        assert_eq!(updated.status, ProxyStatus::Healthy);
        assert_eq!(updated.avg_latency_ms, Some(95));
        assert_eq!(pool.list_proxies().await.unwrap().len(), 1);
    }
}

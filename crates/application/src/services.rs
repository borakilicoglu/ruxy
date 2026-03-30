use std::{
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use chrono::{DateTime, Utc};
use domain::{
    health::HealthThresholds,
    proxy::{HealthCheckResult, NewProxy, Proxy},
};
use uuid::Uuid;

use crate::{
    errors::ApplicationError,
    ports::{HealthChecker, ProxyRepository},
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SelectionStrategy {
    RoundRobin,
    Random,
}

pub struct ProxyPoolService<R> {
    repository: R,
}

impl<R> ProxyPoolService<R>
where
    R: ProxyRepository,
{
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub async fn list_proxies(&self) -> Result<Vec<Proxy>, ApplicationError> {
        self.repository.list().await
    }

    pub async fn get_proxy(&self, id: Uuid) -> Result<Proxy, ApplicationError> {
        self.repository
            .get(id)
            .await?
            .ok_or(ApplicationError::ProxyNotFound(id))
    }

    pub async fn create_proxy(&self, new_proxy: NewProxy, now: DateTime<Utc>) -> Result<Proxy, ApplicationError> {
        let duplicate = self.repository.exists_with_address(
            new_proxy.scheme,
            &new_proxy.host,
            new_proxy.port,
            new_proxy.username.as_deref(),
        ).await?;

        if duplicate {
            return Err(ApplicationError::DuplicateProxy);
        }

        let proxy = Proxy::new(new_proxy, now);
        self.repository.insert(proxy).await
    }

    pub async fn update_proxy(
        &self,
        id: Uuid,
        new_proxy: NewProxy,
        now: DateTime<Utc>,
    ) -> Result<Proxy, ApplicationError> {
        let mut proxy = self
            .repository
            .get(id)
            .await?
            .ok_or(ApplicationError::ProxyNotFound(id))?;

        let duplicate = self
            .repository
            .list()
            .await?
            .into_iter()
            .any(|item| {
                item.id != id
                    && item.scheme == new_proxy.scheme
                    && item.host == new_proxy.host
                    && item.port == new_proxy.port
                    && item.username == new_proxy.username
            });

        if duplicate {
            return Err(ApplicationError::DuplicateProxy);
        }

        proxy.scheme = new_proxy.scheme;
        proxy.host = new_proxy.host;
        proxy.port = new_proxy.port;
        proxy.username = new_proxy.username;
        proxy.password = new_proxy.password;
        proxy.tags = new_proxy.tags;
        proxy.status = domain::proxy::ProxyStatus::Unknown;
        proxy.score = 0;
        proxy.avg_latency_ms = None;
        proxy.success_rate = None;
        proxy.consecutive_failures = 0;
        proxy.consecutive_successes = 0;
        proxy.last_checked_at = None;
        proxy.cooldown_until = None;
        proxy.updated_at = now;

        self.repository.update(proxy).await
    }

    pub async fn delete_proxy(&self, id: Uuid) -> Result<(), ApplicationError> {
        if !self.repository.exists(id).await? {
            return Err(ApplicationError::ProxyNotFound(id));
        }

        self.repository.delete(id).await
    }
}

pub struct HealthService<R> {
    repository: R,
    thresholds: HealthThresholds,
}

impl<R> HealthService<R>
where
    R: ProxyRepository,
{
    pub fn new(repository: R, thresholds: HealthThresholds) -> Self {
        Self {
            repository,
            thresholds,
        }
    }

    pub async fn run_health_check(
        &self,
        id: Uuid,
        result: HealthCheckResult,
        checked_at: DateTime<Utc>,
    ) -> Result<Proxy, ApplicationError> {
        let mut proxy = self
            .repository
            .get(id)
            .await?
            .ok_or(ApplicationError::ProxyNotFound(id))?;

        proxy.apply_health_check(result, checked_at, self.thresholds);
        self.repository.update(proxy).await
    }
}

pub struct HealthWorkerService<R, C> {
    repository: R,
    checker: C,
    thresholds: HealthThresholds,
}

#[derive(Clone, Default)]
pub struct SelectionCursor {
    next_index: Arc<AtomicUsize>,
}

impl SelectionCursor {
    pub fn new() -> Self {
        Self::default()
    }
}

pub struct SelectionService<R> {
    repository: R,
    cursor: SelectionCursor,
}

impl<R> SelectionService<R>
where
    R: ProxyRepository,
{
    pub fn new(repository: R) -> Self {
        Self {
            repository,
            cursor: SelectionCursor::new(),
        }
    }

    pub fn with_cursor(repository: R, cursor: SelectionCursor) -> Self {
        Self { repository, cursor }
    }

    pub async fn select_proxy(
        &self,
        strategy: SelectionStrategy,
        now: DateTime<Utc>,
    ) -> Result<Proxy, ApplicationError> {
        let proxies = self.repository.list().await?;
        let selectable: Vec<_> = proxies
            .into_iter()
            .filter(|proxy| proxy.is_selectable(now))
            .collect();

        if selectable.is_empty() {
            return Err(ApplicationError::NoHealthyProxy);
        }

        let index = match strategy {
            SelectionStrategy::RoundRobin => {
                let current = self.cursor.next_index.fetch_add(1, Ordering::Relaxed);
                current % selectable.len()
            }
            SelectionStrategy::Random => pseudo_random_index(selectable.len()),
        };

        Ok(selectable[index].clone())
    }
}

fn pseudo_random_index(len: usize) -> usize {
    if len <= 1 {
        return 0;
    }

    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.subsec_nanos() as usize)
        .unwrap_or(0);

    nanos % len
}

impl<R, C> HealthWorkerService<R, C>
where
    R: ProxyRepository + Clone,
    C: HealthChecker,
{
    pub fn new(repository: R, checker: C, thresholds: HealthThresholds) -> Self {
        Self {
            repository,
            checker,
            thresholds,
        }
    }

    pub async fn run_cycle(&self, checked_at: DateTime<Utc>) -> Result<Vec<Proxy>, ApplicationError> {
        let health = HealthService::new(self.repository.clone(), self.thresholds);
        let proxies = self.repository.list().await?;
        let mut updated = Vec::new();

        for proxy in proxies {
            if proxy.status == domain::proxy::ProxyStatus::Disabled {
                continue;
            }

            let result = self.checker.check(&proxy)?;
            updated.push(health.run_health_check(proxy.id, result, checked_at).await?);
        }

        Ok(updated)
    }
}

#[cfg(test)]
mod tests {
    use std::{
        collections::HashMap,
        sync::{Arc, Mutex},
    };

    use chrono::{TimeZone, Utc};
    use domain::{
        health::HealthThresholds,
        proxy::{HealthCheckResult, NewProxy, Proxy, ProxyScheme, ProxyStatus},
    };
    use uuid::Uuid;

    use async_trait::async_trait;

    use crate::{
        errors::ApplicationError,
        ports::{HealthChecker, ProxyRepository},
    };

    use super::{
        HealthService, HealthWorkerService, ProxyPoolService, SelectionCursor, SelectionService,
        SelectionStrategy,
    };

    #[derive(Clone, Default)]
    struct InMemoryProxyRepository {
        proxies: Arc<Mutex<HashMap<Uuid, Proxy>>>,
    }

    #[async_trait]
    impl ProxyRepository for InMemoryProxyRepository {
        async fn list(&self) -> Result<Vec<Proxy>, ApplicationError> {
            Ok(self
                .proxies
                .lock()
                .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))?
                .values()
                .cloned()
                .collect())
        }

        async fn get(&self, id: Uuid) -> Result<Option<Proxy>, ApplicationError> {
            Ok(self
                .proxies
                .lock()
                .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))?
                .get(&id)
                .cloned())
        }

        async fn insert(&self, proxy: Proxy) -> Result<Proxy, ApplicationError> {
            self.proxies
                .lock()
                .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))?
                .insert(proxy.id, proxy.clone());
            Ok(proxy)
        }

        async fn update(&self, proxy: Proxy) -> Result<Proxy, ApplicationError> {
            self.proxies
                .lock()
                .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))?
                .insert(proxy.id, proxy.clone());
            Ok(proxy)
        }

        async fn delete(&self, id: Uuid) -> Result<(), ApplicationError> {
            self.proxies
                .lock()
                .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))?
                .remove(&id);
            Ok(())
        }

        async fn exists(&self, id: Uuid) -> Result<bool, ApplicationError> {
            Ok(self
                .proxies
                .lock()
                .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))?
                .contains_key(&id))
        }

        async fn status(&self, id: Uuid) -> Result<Option<ProxyStatus>, ApplicationError> {
            Ok(self
                .proxies
                .lock()
                .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))?
                .get(&id)
                .map(|proxy| proxy.status))
        }

        async fn exists_with_address(
            &self,
            scheme: ProxyScheme,
            host: &str,
            port: u16,
            username: Option<&str>,
        ) -> Result<bool, ApplicationError> {
            Ok(self
                .proxies
                .lock()
                .map_err(|error| ApplicationError::Repository(format!("mutex poisoned: {error}")))?
                .values()
                .any(|proxy| {
                    proxy.scheme == scheme
                        && proxy.host == host
                        && proxy.port == port
                        && proxy.username.as_deref() == username
                }))
        }
    }

    struct StaticSuccessChecker;

    impl HealthChecker for StaticSuccessChecker {
        fn check(&self, _proxy: &Proxy) -> Result<HealthCheckResult, ApplicationError> {
            Ok(HealthCheckResult::Success {
                latency_ms: Some(42),
            })
        }
    }

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
    async fn create_proxy_rejects_duplicates() {
        let repository = InMemoryProxyRepository::default();
        let service = ProxyPoolService::new(repository);
        let now = Utc.with_ymd_and_hms(2026, 3, 26, 12, 0, 0).unwrap();

        service.create_proxy(sample_new_proxy(), now).await.unwrap();
        let duplicate = service.create_proxy(sample_new_proxy(), now).await;

        assert!(matches!(duplicate, Err(ApplicationError::DuplicateProxy)));
    }

    #[tokio::test]
    async fn delete_proxy_returns_not_found_for_missing_id() {
        let service = ProxyPoolService::new(InMemoryProxyRepository::default());
        let missing_id = Uuid::new_v4();

        let result = service.delete_proxy(missing_id).await;

        assert!(matches!(result, Err(ApplicationError::ProxyNotFound(id)) if id == missing_id));
    }

    #[tokio::test]
    async fn health_service_updates_proxy_status() {
        let repository = InMemoryProxyRepository::default();
        let pool = ProxyPoolService::new(repository);
        let now = Utc.with_ymd_and_hms(2026, 3, 26, 12, 0, 0).unwrap();
        let proxy = pool.create_proxy(sample_new_proxy(), now).await.unwrap();
        let health = HealthService::new(pool.repository, HealthThresholds::default());

        let updated = health
            .run_health_check(
                proxy.id,
                HealthCheckResult::Success {
                    latency_ms: Some(100),
                },
                now,
            )
            .await
            .unwrap();

        assert_eq!(updated.status, ProxyStatus::Healthy);
        assert_eq!(updated.avg_latency_ms, Some(100));
    }

    #[tokio::test]
    async fn worker_service_runs_health_cycle_for_all_non_disabled_proxies() {
        let repository = InMemoryProxyRepository::default();
        let pool = ProxyPoolService::new(repository.clone());
        let now = Utc.with_ymd_and_hms(2026, 3, 26, 12, 0, 0).unwrap();

        let first = pool.create_proxy(sample_new_proxy(), now).await.unwrap();
        let second = pool
            .create_proxy(
                NewProxy {
                    host: "127.0.0.2".to_string(),
                    ..sample_new_proxy()
                },
                now,
            )
            .await
            .unwrap();

        let worker = HealthWorkerService::new(
            repository.clone(),
            StaticSuccessChecker,
            HealthThresholds::default(),
        );

        let updated = worker.run_cycle(now).await.unwrap();

        assert_eq!(updated.len(), 2);
        assert!(updated.iter().all(|proxy| proxy.status == ProxyStatus::Healthy));
        assert_eq!(repository.get(first.id).await.unwrap().unwrap().avg_latency_ms, Some(42));
        assert_eq!(repository.get(second.id).await.unwrap().unwrap().avg_latency_ms, Some(42));
    }

    #[tokio::test]
    async fn selection_service_returns_round_robin_healthy_proxies() {
        let repository = InMemoryProxyRepository::default();
        let pool = ProxyPoolService::new(repository.clone());
        let now = Utc.with_ymd_and_hms(2026, 3, 26, 12, 0, 0).unwrap();

        let first = pool.create_proxy(sample_new_proxy(), now).await.unwrap();
        let second = pool
            .create_proxy(
                NewProxy {
                    host: "127.0.0.2".to_string(),
                    ..sample_new_proxy()
                },
                now,
            )
            .await
            .unwrap();

        let health = HealthService::new(repository.clone(), HealthThresholds::default());
        health
            .run_health_check(
                first.id,
                HealthCheckResult::Success {
                    latency_ms: Some(80),
                },
                now,
            )
            .await
            .unwrap();
        health
            .run_health_check(
                second.id,
                HealthCheckResult::Success {
                    latency_ms: Some(90),
                },
                now,
            )
            .await
            .unwrap();

        let selection = SelectionService::with_cursor(repository, SelectionCursor::new());
        let selected_first = selection
            .select_proxy(SelectionStrategy::RoundRobin, now)
            .await
            .unwrap();
        let selected_second = selection
            .select_proxy(SelectionStrategy::RoundRobin, now)
            .await
            .unwrap();

        assert_ne!(selected_first.id, selected_second.id);
        assert!(matches!(selected_first.status, ProxyStatus::Healthy));
        assert!(matches!(selected_second.status, ProxyStatus::Healthy));
    }

    #[tokio::test]
    async fn selection_service_returns_error_when_no_healthy_proxy_exists() {
        let repository = InMemoryProxyRepository::default();
        let pool = ProxyPoolService::new(repository.clone());
        let now = Utc.with_ymd_and_hms(2026, 3, 26, 12, 0, 0).unwrap();

        pool.create_proxy(sample_new_proxy(), now).await.unwrap();

        let selection = SelectionService::new(repository);
        let error = selection
            .select_proxy(SelectionStrategy::RoundRobin, now)
            .await
            .unwrap_err();

        assert!(matches!(error, ApplicationError::NoHealthyProxy));
    }
}

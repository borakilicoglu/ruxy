use async_trait::async_trait;
use domain::proxy::{HealthCheckResult, NewProxy, Proxy, ProxyScheme, ProxyStatus};
use uuid::Uuid;

use crate::errors::ApplicationError;

#[async_trait]
pub trait ProxyRepository {
    async fn list(&self) -> Result<Vec<Proxy>, ApplicationError>;
    async fn get(&self, id: Uuid) -> Result<Option<Proxy>, ApplicationError>;
    async fn insert(&self, proxy: Proxy) -> Result<Proxy, ApplicationError>;
    async fn update(&self, proxy: Proxy) -> Result<Proxy, ApplicationError>;
    async fn delete(&self, id: Uuid) -> Result<(), ApplicationError>;
    async fn exists(&self, id: Uuid) -> Result<bool, ApplicationError>;
    async fn status(&self, id: Uuid) -> Result<Option<ProxyStatus>, ApplicationError>;
    async fn exists_with_address(
        &self,
        scheme: ProxyScheme,
        host: &str,
        port: u16,
        username: Option<&str>,
    ) -> Result<bool, ApplicationError>;
}

pub trait ProxyFactory {
    fn create(&self, new_proxy: NewProxy) -> Proxy;
}

pub trait HealthChecker {
    fn check(&self, proxy: &Proxy) -> Result<HealthCheckResult, ApplicationError>;
}

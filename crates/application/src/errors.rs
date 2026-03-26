use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum ApplicationError {
    #[error("proxy {0} was not found")]
    ProxyNotFound(Uuid),
    #[error("no healthy proxy is available")]
    NoHealthyProxy,
    #[error("proxy already exists for the given address")]
    DuplicateProxy,
    #[error("health check failed: {0}")]
    HealthCheck(String),
    #[error("repository error: {0}")]
    Repository(String),
}

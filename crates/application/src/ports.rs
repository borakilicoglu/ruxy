use domain::proxy::ProxyStatus;
use uuid::Uuid;

pub trait ProxyRepository {
    fn exists(&self, id: Uuid) -> bool;
    fn status(&self, id: Uuid) -> Option<ProxyStatus>;
}

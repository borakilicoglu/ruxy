use uuid::Uuid;

pub fn new_id() -> Uuid {
    Uuid::new_v4()
}

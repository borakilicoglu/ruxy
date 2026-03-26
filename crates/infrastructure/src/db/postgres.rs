use sqlx::{Executor, PgPool};

pub async fn initialize_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    let sql = include_str!("../../../../infra/postgres/init.sql");

    for statement in sql.split(';').map(str::trim).filter(|part| !part.is_empty()) {
        if let Err(error) = pool.execute(format!("{statement};").as_str()).await {
            if should_ignore_init_error(&error) {
                continue;
            }

            return Err(error);
        }
    }

    Ok(())
}

fn should_ignore_init_error(error: &sqlx::Error) -> bool {
    let Some(database_error) = error.as_database_error() else {
        return false;
    };

    match database_error.code().as_deref() {
        Some("23505") | Some("42710") | Some("42P07") => true,
        _ => false,
    }
}

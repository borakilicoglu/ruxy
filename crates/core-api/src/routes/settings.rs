use axum::{extract::State, routing::get, Json, Router};
use infrastructure::db::postgres::StoredSettings;

use crate::{
    app_state::AppState,
    dto::{SettingsResponse, UpdateSettingsRequest},
};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(get_settings).patch(update_settings))
}

async fn get_settings(State(state): State<AppState>) -> Json<SettingsResponse> {
    Json(state.settings.read().await.clone())
}

async fn update_settings(
    State(state): State<AppState>,
    Json(payload): Json<UpdateSettingsRequest>,
) -> Result<Json<SettingsResponse>, crate::routes::proxies::ApiError> {
    let stored: StoredSettings = payload.into();

    if let Some(repository) = state.settings_repository.clone() {
        repository
            .save(&stored)
            .await
            .map_err(|error| application::errors::ApplicationError::Repository(error.to_string()))
            .map_err(crate::routes::proxies::ApiError::from)?;
    }

    let mut settings = state.settings.write().await;
    *settings = stored.into();

    Ok(Json(settings.clone()))
}

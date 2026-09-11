use crate::state::PersistedData;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn data_file_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join("sundial-state.json"))
}

pub fn load(app: &AppHandle) -> PersistedData {
    let Some(path) = data_file_path(app) else {
        return PersistedData::default();
    };
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(app: &AppHandle, data: &PersistedData) {
    let Some(path) = data_file_path(app) else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(data) {
        let _ = std::fs::write(path, json);
    }
}

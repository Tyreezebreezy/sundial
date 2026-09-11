use crate::state::Settings;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn size_for(size: &str) -> (f64, f64) {
    match size {
        "small" => (150.0, 74.0),
        "large" => (260.0, 210.0),
        _ => (220.0, 148.0),
    }
}

fn clamp_position(app: &AppHandle, pos: Option<(i32, i32)>, size: (f64, f64)) -> (f64, f64) {
    if let Some((x, y)) = pos {
        if let Ok(monitors) = app.available_monitors() {
            let fits = monitors.iter().any(|m| {
                let mp = m.position();
                let ms = m.size();
                let scale = m.scale_factor();
                let (mx, my) = (mp.x as f64, mp.y as f64);
                let (mw, mh) = (ms.width as f64 / scale, ms.height as f64 / scale);
                (x as f64) >= mx - 4.0
                    && (x as f64) < mx + mw
                    && (y as f64) >= my - 4.0
                    && (y as f64) < my + mh
            });
            if fits {
                return (x as f64, y as f64);
            }
        }
    }
    if let Ok(Some(m)) = app.primary_monitor() {
        let mp = m.position();
        let ms = m.size();
        let scale = m.scale_factor();
        let (mw, mh) = (ms.width as f64 / scale, ms.height as f64 / scale);
        let x = mp.x as f64 + mw - size.0 - 24.0;
        let y = mp.y as f64 + mh - size.1 - 24.0;
        return (x, y);
    }
    (80.0, 80.0)
}

pub fn create(app: &AppHandle, settings: &Settings) -> tauri::Result<()> {
    if app.get_webview_window("widget").is_some() {
        return Ok(());
    }
    let size = size_for(&settings.widget_size);
    let (x, y) = clamp_position(app, settings.widget_position, size);

    let window = WebviewWindowBuilder::new(app, "widget", WebviewUrl::App("index.html".into()))
        .title("SUNDIAL")
        .inner_size(size.0, size.1)
        .position(x, y)
        .decorations(false)
        .transparent(true)
        .always_on_top(settings.widget_always_on_top)
        .skip_taskbar(true)
        .resizable(false)
        .visible(false)
        .build()?;

    let app_handle = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(pos) = event {
            if let Some(state) = app_handle.try_state::<crate::commands::AppState>() {
                let mut data = state.0.lock().unwrap();
                data.settings.widget_position = Some((pos.x, pos.y));
                crate::persistence::save(&app_handle, &data);
            }
        }
    });

    if settings.widget_visible {
        let _ = window.show();
    }
    Ok(())
}

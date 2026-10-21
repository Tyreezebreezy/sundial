mod commands;
mod persistence;
mod state;
mod widget;

use commands::AppState;
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WindowEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_boot_data,
            commands::start_session,
            commands::pause_timer,
            commands::resume_timer,
            commands::add_minutes,
            commands::advance_phase,
            commands::reset_timer,
            commands::save_preset,
            commands::delete_preset,
            commands::update_settings,
            commands::open_main_window,
            commands::set_widget_visible,
            commands::set_widget_always_on_top,
            commands::set_widget_size,
            commands::quit_app,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let mut data = persistence::load(&handle);
            data.state.catch_up(commands::now_ms());
            persistence::save(&handle, &data);
            let settings_snapshot = data.settings.clone();
            app.manage(AppState(Mutex::new(data)));

            widget::create(&handle, &settings_snapshot)?;

            let open_item = MenuItem::with_id(app, "open", "Open SUNDIAL", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit SUNDIAL", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&open_item, &quit_item])?;
            TrayIconBuilder::new()
                .icon(tauri::include_image!("icons/tray.png"))
                .menu(&tray_menu)
                .tooltip("SUNDIAL")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => commands::open_main_window(app.clone()),
                    "quit" => commands::quit_app(app.clone()),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        commands::open_main_window(tray.app_handle().clone());
                    }
                })
                .build(app)?;

            let tick_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_millis(500));
                loop {
                    interval.tick().await;
                    let state = tick_handle.state::<AppState>();
                    commands::reconcile(&tick_handle, &state.0);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let quit_on_close = window
                        .state::<AppState>()
                        .0
                        .lock()
                        .unwrap()
                        .settings
                        .quit_on_main_close;
                    if quit_on_close {
                        commands::quit_app(window.app_handle().clone());
                    } else {
                        let _ = window.hide();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the Tauri application");
}

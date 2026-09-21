use crate::persistence;
use crate::state::{
    AppMode, PersistedData, Phase, PhaseKind, Preset, SessionPlan, Settings, TimerState,
};
use serde::Serialize;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_notification::NotificationExt;

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub struct AppState(pub Mutex<PersistedData>);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreSummary {
    pub had_active_session: bool,
    pub was_paused: bool,
    pub phases_completed_while_away: Vec<PhaseKind>,
    pub gap_ms: i64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootPayload {
    pub state: TimerState,
    pub settings: Settings,
    pub custom_presets: Vec<Preset>,
    pub restore: RestoreSummary,
}

fn persist_and_broadcast(app: &AppHandle, data: &PersistedData) {
    persistence::save(app, data);
    let _ = app.emit("state-changed", data.state.clone());
}

/// The phase that follows a finished one, if the session continues.
type Following = Option<(PhaseKind, u64)>;

/// Toast wording for a finished phase, concise and free of evaluation.
/// `next` is the phase after it in the plan (None when the session is over).
fn completion_copy(kind: PhaseKind, next: Following) -> (&'static str, Option<String>) {
    match kind {
        PhaseKind::Study => (
            "Study complete",
            Some(match next {
                Some((PhaseKind::Break, ms)) => {
                    format!("Your {}-minute break is ready.", ms / 60_000)
                }
                Some(_) => "Your next block is ready.".to_string(),
                None => "Your session is complete.".to_string(),
            }),
        ),
        PhaseKind::Break => (
            "Break complete",
            Some(match next {
                Some((PhaseKind::Study, _)) => "Time to return to your study session.".to_string(),
                Some(_) => "Your next block is ready.".to_string(),
                None => "Your session is complete.".to_string(),
            }),
        ),
        PhaseKind::Timer => ("Timer complete", None),
    }
}

/// For each phase `catch_up` just completed (oldest first), the phase that
/// follows it. Derived from the plan and the post-catch-up position, so a
/// notification can say how long the coming break is without the engine
/// having to report more than the kinds it already returns.
fn following_phases(state: &TimerState, completed: &[PhaseKind]) -> Vec<Following> {
    let Some(plan) = &state.plan else {
        return vec![None; completed.len()];
    };
    // index of the last phase that just finished: still-running/awaiting
    // sessions sit one past it, finished sessions stay on it
    let last = if state.is_running {
        state.current_index.saturating_sub(1)
    } else {
        state.current_index
    };
    let first = (last + 1).saturating_sub(completed.len());
    (0..completed.len())
        .map(|i| {
            plan.phases
                .get(first + i + 1)
                .map(|p| (p.kind, p.duration_ms))
        })
        .collect()
}

pub fn fire_completions(app: &AppHandle, kinds: &[PhaseKind], following: &[Following]) {
    for (i, kind) in kinds.iter().enumerate() {
        let tag = match kind {
            PhaseKind::Study => "study",
            PhaseKind::Break => "break",
            PhaseKind::Timer => "timer",
        };
        let (title, body) = completion_copy(*kind, following.get(i).copied().flatten());
        let mut toast = app.notification().builder().title(title);
        if let Some(body) = body {
            toast = toast.body(body);
        }
        if let Err(e) = toast.show() {
            eprintln!("[sundial] notification failed: {e}");
        }
        let _ = app.emit("phase-complete", tag);
    }
}

/// Runs once at startup and on every background tick: reconciles the
/// authoritative state against wall-clock time, persists, notifies, and
/// broadcasts. Returns the phases that completed during this call.
pub fn reconcile(app: &AppHandle, state: &Mutex<PersistedData>) -> Vec<PhaseKind> {
    let mut data = state.lock().unwrap();
    let completed = data.state.catch_up(now_ms());
    let following = following_phases(&data.state, &completed);
    if !completed.is_empty() {
        persist_and_broadcast(app, &data);
    }
    drop(data);
    if !completed.is_empty() {
        fire_completions(app, &completed, &following);
    }
    completed
}

#[tauri::command]
pub fn get_boot_data(app: AppHandle, state: State<AppState>) -> BootPayload {
    let before = state.0.lock().unwrap().state.clone();
    let gap_ms = before.ends_at.map(|e| (now_ms() - e).max(0)).unwrap_or(0);
    let was_paused = before.is_paused;
    let had_active_session = before.is_running;

    drop(before);
    let completed = reconcile(&app, &state.0);

    let data = state.0.lock().unwrap();
    BootPayload {
        state: data.state.clone(),
        settings: data.settings.clone(),
        custom_presets: data.custom_presets.clone(),
        restore: RestoreSummary {
            had_active_session,
            was_paused,
            phases_completed_while_away: completed,
            gap_ms,
        },
    }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn start_session(
    app: AppHandle,
    state: State<AppState>,
    mode: AppMode,
    phases: Vec<Phase>,
    visual: String,
    auto_advance: bool,
    label: Option<String>,
    preset_name: Option<String>,
) -> TimerState {
    let mut data = state.0.lock().unwrap();
    let plan = SessionPlan {
        mode,
        label,
        visual,
        auto_advance,
        preset_name,
        phases,
    };
    data.state.start(plan, now_ms());
    persist_and_broadcast(&app, &data);
    data.state.clone()
}

#[tauri::command]
pub fn pause_timer(app: AppHandle, state: State<AppState>) -> TimerState {
    let mut data = state.0.lock().unwrap();
    data.state.pause(now_ms());
    persist_and_broadcast(&app, &data);
    data.state.clone()
}

#[tauri::command]
pub fn resume_timer(app: AppHandle, state: State<AppState>) -> TimerState {
    let mut data = state.0.lock().unwrap();
    data.state.resume(now_ms());
    persist_and_broadcast(&app, &data);
    data.state.clone()
}

#[tauri::command]
pub fn add_minutes(app: AppHandle, state: State<AppState>, minutes: u32) -> TimerState {
    let mut data = state.0.lock().unwrap();
    data.state.add_ms(minutes as u64 * 60_000, now_ms());
    persist_and_broadcast(&app, &data);
    data.state.clone()
}

#[tauri::command]
pub fn advance_phase(app: AppHandle, state: State<AppState>) -> TimerState {
    let mut data = state.0.lock().unwrap();
    data.state.advance_now(now_ms());
    persist_and_broadcast(&app, &data);
    data.state.clone()
}

#[tauri::command]
pub fn reset_timer(app: AppHandle, state: State<AppState>) -> TimerState {
    let mut data = state.0.lock().unwrap();
    data.state.reset();
    persist_and_broadcast(&app, &data);
    data.state.clone()
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn save_preset(
    app: AppHandle,
    state: State<AppState>,
    name: String,
    study_minutes: u32,
    break_minutes: u32,
    default_total_minutes: Option<u32>,
    auto_advance: Option<bool>,
    visual: Option<String>,
) -> Vec<Preset> {
    let mut data = state.0.lock().unwrap();
    data.custom_presets.push(Preset {
        id: format!("custom-{}", now_ms()),
        name,
        study_minutes,
        break_minutes,
        default_total_minutes,
        auto_advance,
        visual,
    });
    persistence::save(&app, &data);
    let _ = app.emit("presets-changed", data.custom_presets.clone());
    data.custom_presets.clone()
}

#[tauri::command]
pub fn delete_preset(app: AppHandle, state: State<AppState>, id: String) -> Vec<Preset> {
    let mut data = state.0.lock().unwrap();
    data.custom_presets.retain(|p| p.id != id);
    persistence::save(&app, &data);
    let _ = app.emit("presets-changed", data.custom_presets.clone());
    data.custom_presets.clone()
}

#[tauri::command]
pub fn update_settings(app: AppHandle, state: State<AppState>, settings: Settings) -> Settings {
    let mut data = state.0.lock().unwrap();
    data.settings = settings;
    persistence::save(&app, &data);
    let _ = app.emit("settings-changed", data.settings.clone());
    data.settings.clone()
}

#[tauri::command]
pub fn open_main_window(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

#[tauri::command]
pub fn set_widget_visible(app: AppHandle, state: State<AppState>, visible: bool) {
    if let Some(w) = app.get_webview_window("widget") {
        if visible {
            let _ = w.show();
        } else {
            let _ = w.hide();
        }
    }
    let mut data = state.0.lock().unwrap();
    data.settings.widget_visible = visible;
    persistence::save(&app, &data);
}

#[tauri::command]
pub fn set_widget_always_on_top(app: AppHandle, state: State<AppState>, always_on_top: bool) {
    if let Some(w) = app.get_webview_window("widget") {
        let _ = w.set_always_on_top(always_on_top);
    }
    let mut data = state.0.lock().unwrap();
    data.settings.widget_always_on_top = always_on_top;
    persistence::save(&app, &data);
}

#[tauri::command]
pub fn set_widget_size(app: AppHandle, state: State<AppState>, size: String) {
    let (w, h) = crate::widget::size_for(&size);
    if let Some(win) = app.get_webview_window("widget") {
        let _ = win.set_size(tauri::LogicalSize::new(w, h));
    }
    let mut data = state.0.lock().unwrap();
    data.settings.widget_size = size;
    persistence::save(&app, &data);
}

/// Full quit, from any entry point (tray, Settings, widget, or main window
/// close with `quit_on_main_close` set): closes the widget window explicitly
/// so it disappears immediately, then exits the process. `app.exit` tears
/// down every remaining window, the tray icon, and the background
/// reconciliation task as part of process termination - there is no
/// separate "stop the tick loop" step because nothing survives the process
/// exiting.
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    if let Some(w) = app.get_webview_window("widget") {
        let _ = w.close();
    }
    app.exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::SessionPlan;

    fn plan(kinds: &[(PhaseKind, u64)]) -> SessionPlan {
        SessionPlan {
            mode: AppMode::Study,
            label: None,
            visual: "disk".into(),
            auto_advance: false,
            preset_name: None,
            phases: kinds
                .iter()
                .map(|&(kind, minutes)| Phase {
                    kind,
                    duration_ms: minutes * 60_000,
                })
                .collect(),
        }
    }

    #[test]
    fn study_complete_names_the_length_of_the_break_that_follows() {
        let (title, body) =
            completion_copy(PhaseKind::Study, Some((PhaseKind::Break, 15 * 60_000)));
        assert_eq!(title, "Study complete");
        assert_eq!(body.as_deref(), Some("Your 15-minute break is ready."));
    }

    #[test]
    fn break_complete_points_back_to_the_session() {
        let (title, body) =
            completion_copy(PhaseKind::Break, Some((PhaseKind::Study, 45 * 60_000)));
        assert_eq!(title, "Break complete");
        assert_eq!(
            body.as_deref(),
            Some("Time to return to your study session.")
        );
    }

    #[test]
    fn timer_complete_is_just_a_title() {
        assert_eq!(
            completion_copy(PhaseKind::Timer, None),
            ("Timer complete", None)
        );
    }

    #[test]
    fn the_last_phase_reports_the_session_is_complete() {
        assert_eq!(
            completion_copy(PhaseKind::Study, None).1.as_deref(),
            Some("Your session is complete.")
        );
        assert_eq!(
            completion_copy(PhaseKind::Break, None).1.as_deref(),
            Some("Your session is complete.")
        );
    }

    #[test]
    fn following_phases_for_a_manual_advance_pause() {
        // S45 B15 S45, study just finished and the break is queued
        let state = TimerState {
            plan: Some(plan(&[
                (PhaseKind::Study, 45),
                (PhaseKind::Break, 15),
                (PhaseKind::Study, 45),
            ])),
            current_index: 1,
            is_running: true,
            awaiting_advance: true,
            ..Default::default()
        };
        assert_eq!(
            following_phases(&state, &[PhaseKind::Study]),
            vec![Some((PhaseKind::Break, 15 * 60_000))]
        );
    }

    #[test]
    fn following_phases_after_sleeping_through_several_phases() {
        // S45 B15 S45 B15, woke up mid third phase having missed S and B
        let state = TimerState {
            plan: Some(plan(&[
                (PhaseKind::Study, 45),
                (PhaseKind::Break, 15),
                (PhaseKind::Study, 45),
                (PhaseKind::Break, 15),
            ])),
            current_index: 2,
            is_running: true,
            ..Default::default()
        };
        assert_eq!(
            following_phases(&state, &[PhaseKind::Study, PhaseKind::Break]),
            vec![
                Some((PhaseKind::Break, 15 * 60_000)),
                Some((PhaseKind::Study, 45 * 60_000)),
            ]
        );
    }

    #[test]
    fn following_phases_when_the_session_just_finished() {
        let state = TimerState {
            plan: Some(plan(&[(PhaseKind::Study, 45), (PhaseKind::Break, 15)])),
            current_index: 1,
            is_running: false,
            ..Default::default()
        };
        assert_eq!(
            following_phases(&state, &[PhaseKind::Study, PhaseKind::Break]),
            vec![Some((PhaseKind::Break, 15 * 60_000)), None]
        );
    }
}

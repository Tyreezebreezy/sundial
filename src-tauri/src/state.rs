use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum PhaseKind {
    Study,
    Break,
    Timer,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Phase {
    pub kind: PhaseKind,
    pub duration_ms: u64,
}

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum AppMode {
    Study,
    Timer,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SessionPlan {
    pub mode: AppMode,
    pub label: Option<String>,
    pub visual: String,
    pub auto_advance: bool,
    pub preset_name: Option<String>,
    pub phases: Vec<Phase>,
}

#[derive(Clone, Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct TimerState {
    pub plan: Option<SessionPlan>,
    pub current_index: usize,
    pub started_at: Option<i64>,
    pub ends_at: Option<i64>,
    pub duration_ms: u64,
    pub paused_at: Option<i64>,
    pub paused_remaining_ms: Option<u64>,
    pub is_paused: bool,
    pub is_running: bool,
    /// A phase just completed and auto_advance is off; the next phase is
    /// queued (current_index already points at it) but not yet started.
    pub awaiting_advance: bool,
}

impl TimerState {
    pub fn start(&mut self, plan: SessionPlan, now: i64) {
        let dur = plan.phases[0].duration_ms;
        self.duration_ms = dur;
        self.started_at = Some(now);
        self.ends_at = Some(now + dur as i64);
        self.paused_at = None;
        self.paused_remaining_ms = None;
        self.is_paused = false;
        self.is_running = true;
        self.awaiting_advance = false;
        self.current_index = 0;
        self.plan = Some(plan);
    }

    pub fn pause(&mut self, now: i64) {
        if !self.is_running || self.is_paused || self.awaiting_advance {
            return;
        }
        let remaining = (self.ends_at.unwrap_or(now) - now).max(0) as u64;
        self.paused_remaining_ms = Some(remaining);
        self.paused_at = Some(now);
        self.is_paused = true;
    }

    pub fn resume(&mut self, now: i64) {
        if !self.is_running || !self.is_paused {
            return;
        }
        let remaining = self.paused_remaining_ms.unwrap_or(0);
        self.ends_at = Some(now + remaining as i64);
        self.started_at = Some(now);
        self.is_paused = false;
        self.paused_at = None;
        self.paused_remaining_ms = None;
    }

    pub fn add_ms(&mut self, ms: u64, now: i64) {
        if !self.is_running {
            return;
        }
        self.duration_ms += ms;
        if self.is_paused {
            self.paused_remaining_ms = Some(self.paused_remaining_ms.unwrap_or(0) + ms);
        } else if let Some(e) = self.ends_at {
            self.ends_at = Some(e + ms as i64);
        }
        let _ = now;
    }

    /// Advances through every phase whose end has already passed as of `now`,
    /// chaining exactly off the previous end time (no drift). Used both by
    /// the periodic background tick and once at startup to reconcile state
    /// against wall-clock time after the app was closed or asleep. Returns
    /// the kinds of phases that finished, in order, for notification/sound.
    pub fn catch_up(&mut self, now: i64) -> Vec<PhaseKind> {
        let mut completed = Vec::new();
        if !self.is_running || self.is_paused || self.awaiting_advance {
            return completed;
        }
        while let Some(ends_at) = self.ends_at {
            if now < ends_at {
                break;
            }
            let Some(plan) = &self.plan else { break };
            let finished_kind = plan.phases[self.current_index].kind;
            completed.push(finished_kind);

            let next_index = self.current_index + 1;
            if next_index >= plan.phases.len() {
                self.is_running = false;
                self.ends_at = None;
                self.started_at = None;
                self.duration_ms = 0;
                break;
            }

            let auto = plan.auto_advance;
            let next_dur = plan.phases[next_index].duration_ms;
            self.current_index = next_index;
            self.duration_ms = next_dur;
            if auto {
                self.started_at = Some(ends_at);
                self.ends_at = Some(ends_at + next_dur as i64);
            } else {
                self.awaiting_advance = true;
                self.started_at = None;
                self.ends_at = None;
                break;
            }
        }
        completed
    }

    /// Manual "Skip phase" during an active phase, or manual "Start Break" /
    /// "Start next Study" after `catch_up` parked us in `awaiting_advance`.
    pub fn advance_now(&mut self, now: i64) {
        let Some(plan) = self.plan.clone() else {
            return;
        };

        if self.awaiting_advance {
            let dur = plan.phases[self.current_index].duration_ms;
            self.duration_ms = dur;
            self.started_at = Some(now);
            self.ends_at = Some(now + dur as i64);
            self.is_paused = false;
            self.awaiting_advance = false;
            return;
        }

        if !self.is_running {
            return;
        }

        let next_index = self.current_index + 1;
        if next_index >= plan.phases.len() {
            self.reset();
            return;
        }

        let dur = plan.phases[next_index].duration_ms;
        self.current_index = next_index;
        self.duration_ms = dur;
        self.started_at = Some(now);
        self.ends_at = Some(now + dur as i64);
        self.is_paused = false;
        self.paused_at = None;
        self.paused_remaining_ms = None;
        self.awaiting_advance = false;
    }

    pub fn reset(&mut self) {
        *self = TimerState::default();
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub study_minutes: u32,
    pub break_minutes: u32,
    /// What a saved custom preset remembers besides its rhythm (v1.1). All
    /// `#[serde(default)]` so presets saved by 1.0.x still load unchanged.
    #[serde(default)]
    pub default_total_minutes: Option<u32>,
    #[serde(default)]
    pub auto_advance: Option<bool>,
    #[serde(default)]
    pub visual: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub sound_enabled: bool,
    pub volume: f32,
    pub sound_study_complete: String,
    pub sound_break_complete: String,
    pub sound_timer_complete: String,
    pub auto_advance: bool,
    pub default_visual: String,
    pub widget_visible: bool,
    pub widget_always_on_top: bool,
    pub widget_size: String,
    pub widget_position: Option<(i32, i32)>,
    pub last_study_preset_id: Option<String>,
    pub last_study_total_minutes: Option<u32>,
    pub last_timer_minutes: Option<u32>,
    /// Whether closing the main window quits SUNDIAL entirely, rather than
    /// hiding it to the tray. `#[serde(default)]` so a settings file saved by
    /// an older SUNDIAL version (without this field) still loads instead of
    /// falling back to `PersistedData::default()` and losing everything else
    /// in it - see `persistence::load`.
    #[serde(default)]
    pub quit_on_main_close: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            sound_enabled: true,
            volume: 0.8,
            sound_study_complete: "chime".into(),
            sound_break_complete: "bell".into(),
            sound_timer_complete: "digital".into(),
            auto_advance: false,
            default_visual: "disk".into(),
            widget_visible: true,
            widget_always_on_top: true,
            widget_size: "medium".into(),
            widget_position: None,
            last_study_preset_id: None,
            last_study_total_minutes: None,
            last_timer_minutes: None,
            quit_on_main_close: false,
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PersistedData {
    pub settings: Settings,
    pub custom_presets: Vec<Preset>,
    pub state: TimerState,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn plan(auto_advance: bool, phases: Vec<(PhaseKind, u64)>) -> SessionPlan {
        SessionPlan {
            mode: AppMode::Study,
            label: None,
            visual: "disk".into(),
            auto_advance,
            preset_name: None,
            phases: phases
                .into_iter()
                .map(|(kind, duration_ms)| Phase { kind, duration_ms })
                .collect(),
        }
    }

    #[test]
    fn start_sets_wall_clock_fields_from_first_phase() {
        let mut s = TimerState::default();
        s.start(plan(true, vec![(PhaseKind::Study, 1_000)]), 10_000);
        assert_eq!(s.duration_ms, 1_000);
        assert_eq!(s.started_at, Some(10_000));
        assert_eq!(s.ends_at, Some(11_000));
        assert!(s.is_running);
        assert!(!s.is_paused);
    }

    #[test]
    fn pause_snapshots_remaining_time() {
        let mut s = TimerState::default();
        s.start(plan(true, vec![(PhaseKind::Study, 10_000)]), 0);
        s.pause(4_000);
        assert!(s.is_paused);
        assert_eq!(s.paused_remaining_ms, Some(6_000));
    }

    #[test]
    fn resume_recomputes_ends_at_from_now_plus_remaining() {
        let mut s = TimerState::default();
        s.start(plan(true, vec![(PhaseKind::Study, 10_000)]), 0);
        s.pause(4_000);
        s.resume(100_000);
        assert!(!s.is_paused);
        assert_eq!(s.ends_at, Some(106_000));
    }

    #[test]
    fn add_ms_while_running_extends_ends_at() {
        let mut s = TimerState::default();
        s.start(plan(true, vec![(PhaseKind::Study, 10_000)]), 0);
        s.add_ms(5_000, 1_000);
        assert_eq!(s.ends_at, Some(15_000));
        assert_eq!(s.duration_ms, 15_000);
    }

    #[test]
    fn add_ms_while_paused_extends_snapshotted_remainder() {
        let mut s = TimerState::default();
        s.start(plan(true, vec![(PhaseKind::Study, 10_000)]), 0);
        s.pause(4_000);
        s.add_ms(5_000, 4_000);
        assert_eq!(s.paused_remaining_ms, Some(11_000));
    }

    #[test]
    fn catch_up_chains_through_multiple_completed_phases_when_auto_advance() {
        let mut s = TimerState::default();
        s.start(
            plan(
                true,
                vec![
                    (PhaseKind::Study, 1_000),
                    (PhaseKind::Break, 1_000),
                    (PhaseKind::Study, 1_000),
                ],
            ),
            0,
        );
        // Machine asleep well past phase 1 and phase 2; wakes mid phase 3.
        let completed = s.catch_up(2_500);
        assert_eq!(completed, vec![PhaseKind::Study, PhaseKind::Break]);
        assert_eq!(s.current_index, 2);
        assert!(s.is_running);
        assert_eq!(s.ends_at, Some(3_000));
    }

    #[test]
    fn catch_up_stops_and_awaits_manual_advance_when_auto_advance_off() {
        let mut s = TimerState::default();
        s.start(
            plan(
                false,
                vec![(PhaseKind::Study, 1_000), (PhaseKind::Break, 1_000)],
            ),
            0,
        );
        let completed = s.catch_up(1_500);
        assert_eq!(completed, vec![PhaseKind::Study]);
        assert!(s.awaiting_advance);
        assert_eq!(s.current_index, 1);
        assert_eq!(s.ends_at, None);
    }

    #[test]
    fn catch_up_past_final_phase_ends_session() {
        let mut s = TimerState::default();
        s.start(plan(true, vec![(PhaseKind::Study, 1_000)]), 0);
        let completed = s.catch_up(5_000);
        assert_eq!(completed, vec![PhaseKind::Study]);
        assert!(!s.is_running);
    }

    #[test]
    fn advance_now_skips_mid_phase() {
        let mut s = TimerState::default();
        s.start(
            plan(
                true,
                vec![(PhaseKind::Study, 10_000), (PhaseKind::Break, 5_000)],
            ),
            0,
        );
        s.advance_now(3_000);
        assert_eq!(s.current_index, 1);
        assert_eq!(s.duration_ms, 5_000);
        assert_eq!(s.ends_at, Some(8_000));
    }

    #[test]
    fn advance_now_starts_queued_phase_from_awaiting_advance() {
        let mut s = TimerState::default();
        s.start(
            plan(
                false,
                vec![(PhaseKind::Study, 1_000), (PhaseKind::Break, 2_000)],
            ),
            0,
        );
        s.catch_up(1_000);
        assert!(s.awaiting_advance);
        s.advance_now(5_000);
        assert!(!s.awaiting_advance);
        assert_eq!(s.ends_at, Some(7_000));
    }

    #[test]
    fn persisted_data_round_trips_through_json_and_catches_up_after_a_gap() {
        // Mirrors what actually happens on disk: a session was running when
        // the app was last closed, wall-clock time moved on while it was
        // gone, and on the next launch we deserialize exactly what was
        // written and reconcile it against "now".
        let mut original = PersistedData::default();
        original.state.start(
            plan(
                true,
                vec![
                    (PhaseKind::Study, 60_000),
                    (PhaseKind::Break, 60_000),
                    (PhaseKind::Study, 60_000),
                ],
            ),
            0,
        );

        let json = serde_json::to_string(&original).expect("serialize");
        let mut restored: PersistedData = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(restored.state.current_index, 0);
        assert!(restored.state.is_running);

        // "Now" is 150s after the session started: phase 1 (ends at 60s) and
        // phase 2 (ends at 120s) are both long over; phase 3 (ends at 180s)
        // still has 30s left.
        let completed = restored.state.catch_up(150_000);
        assert_eq!(completed, vec![PhaseKind::Study, PhaseKind::Break]);
        assert_eq!(restored.state.current_index, 2);
        assert!(restored.state.is_running);
        assert_eq!(restored.state.ends_at, Some(180_000));
    }

    #[test]
    fn reset_returns_to_idle_default() {
        let mut s = TimerState::default();
        s.start(plan(true, vec![(PhaseKind::Study, 1_000)]), 0);
        s.reset();
        assert!(!s.is_running);
        assert!(s.plan.is_none());
    }

    #[test]
    fn settings_json_missing_quit_on_main_close_defaults_to_false() {
        // A real settings file written by SUNDIAL 1.0.0 (before this field
        // existed) must still load - `persistence::load` falls back to
        // `PersistedData::default()` on any deserialize error, so a missing
        // field here would silently discard the user's whole settings file,
        // not just default one field.
        let json = r#"{
            "soundEnabled": false,
            "volume": 0.3,
            "soundStudyComplete": "bell",
            "soundBreakComplete": "chime",
            "soundTimerComplete": "alarm",
            "autoAdvance": true,
            "defaultVisual": "hourglass",
            "widgetVisible": false,
            "widgetAlwaysOnTop": false,
            "widgetSize": "small",
            "widgetPosition": null,
            "lastStudyPresetId": null,
            "lastStudyTotalMinutes": null,
            "lastTimerMinutes": null
        }"#;
        let restored: Settings = serde_json::from_str(json).expect("deserialize");
        assert!(!restored.quit_on_main_close);
        assert!(
            !restored.sound_enabled,
            "existing fields still load correctly"
        );
    }

    #[test]
    fn presets_saved_by_1_0_x_still_load_with_no_defaults() {
        // A custom preset written before v1.1 has no default_total_minutes /
        // autoAdvance / visual. `persistence::load` falls back to full defaults
        // on ANY deserialize error, so a missing field here would silently
        // discard every saved preset and setting.
        let json = r#"{"id":"custom-1","name":"CCNA","studyMinutes":40,"breakMinutes":10}"#;
        let preset: Preset = serde_json::from_str(json).expect("deserialize");
        assert_eq!(preset.study_minutes, 40);
        assert_eq!(preset.default_total_minutes, None);
        assert_eq!(preset.auto_advance, None);
        assert_eq!(preset.visual, None);
    }

    #[test]
    fn preset_defaults_round_trip() {
        let preset = Preset {
            id: "custom-2".into(),
            name: "Deep".into(),
            study_minutes: 50,
            break_minutes: 10,
            default_total_minutes: Some(120),
            auto_advance: Some(true),
            visual: Some("sundial".into()),
        };
        let json = serde_json::to_string(&preset).expect("serialize");
        assert!(json.contains("\"defaultTotalMinutes\":120"));
        let back: Preset = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.default_total_minutes, Some(120));
        assert_eq!(back.auto_advance, Some(true));
        assert_eq!(back.visual.as_deref(), Some("sundial"));
    }
}

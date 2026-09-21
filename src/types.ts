export type PhaseKind = "study" | "break" | "timer";

export interface Phase {
  kind: PhaseKind;
  durationMs: number;
}

export type AppMode = "study" | "timer";
export type VisualKind = "disk" | "hourglass" | "sundial";
export type WidgetSize = "small" | "medium" | "large";
export type SoundKey = "bell" | "chime" | "doubleChime" | "digital" | "alarm";

export interface SessionPlan {
  mode: AppMode;
  label: string | null;
  visual: VisualKind;
  autoAdvance: boolean;
  presetName: string | null;
  phases: Phase[];
}

export interface TimerState {
  plan: SessionPlan | null;
  currentIndex: number;
  startedAt: number | null;
  endsAt: number | null;
  durationMs: number;
  pausedAt: number | null;
  pausedRemainingMs: number | null;
  isPaused: boolean;
  isRunning: boolean;
  awaitingAdvance: boolean;
}

export interface Settings {
  soundEnabled: boolean;
  volume: number;
  soundStudyComplete: SoundKey;
  soundBreakComplete: SoundKey;
  soundTimerComplete: SoundKey;
  autoAdvance: boolean;
  defaultVisual: VisualKind;
  widgetVisible: boolean;
  widgetAlwaysOnTop: boolean;
  widgetSize: WidgetSize;
  widgetPosition: [number, number] | null;
  lastStudyPresetId: string | null;
  lastStudyTotalMinutes: number | null;
  lastTimerMinutes: number | null;
  quitOnMainClose: boolean;
}

export interface Preset {
  id: string;
  name: string;
  studyMinutes: number;
  breakMinutes: number;
  /** Saved custom presets may remember these; built-in presets never do. */
  defaultTotalMinutes?: number | null;
  autoAdvance?: boolean | null;
  visual?: VisualKind | null;
}

export interface RestoreSummary {
  hadActiveSession: boolean;
  wasPaused: boolean;
  phasesCompletedWhileAway: PhaseKind[];
  gapMs: number;
}

export interface BootPayload {
  state: TimerState;
  settings: Settings;
  customPresets: Preset[];
  restore: RestoreSummary;
}

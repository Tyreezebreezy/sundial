import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type {
  AppMode,
  BootPayload,
  Phase,
  PhaseKind,
  Preset,
  Settings,
  TimerState,
  VisualKind,
} from "./types";

export function currentWindowLabel(): string {
  return getCurrentWindow().label;
}

export const api = {
  getBootData: () => invoke<BootPayload>("get_boot_data"),
  startSession: (args: {
    mode: AppMode;
    phases: Phase[];
    visual: VisualKind;
    autoAdvance: boolean;
    label: string | null;
    presetName: string | null;
  }) => invoke<TimerState>("start_session", args),
  pause: () => invoke<TimerState>("pause_timer"),
  resume: () => invoke<TimerState>("resume_timer"),
  addMinutes: (minutes: number) =>
    invoke<TimerState>("add_minutes", { minutes }),
  advancePhase: () => invoke<TimerState>("advance_phase"),
  reset: () => invoke<TimerState>("reset_timer"),
  savePreset: (
    name: string,
    studyMinutes: number,
    breakMinutes: number,
    defaults?: {
      defaultTotalMinutes: number | null;
      autoAdvance: boolean;
      visual: VisualKind;
    },
  ) =>
    invoke<Preset[]>("save_preset", {
      name,
      studyMinutes,
      breakMinutes,
      ...defaults,
    }),
  deletePreset: (id: string) => invoke<Preset[]>("delete_preset", { id }),
  updateSettings: (settings: Settings) =>
    invoke<Settings>("update_settings", { settings }),
  openMainWindow: () => invoke<void>("open_main_window"),
  setWidgetVisible: (visible: boolean) =>
    invoke<void>("set_widget_visible", { visible }),
  setWidgetAlwaysOnTop: (alwaysOnTop: boolean) =>
    invoke<void>("set_widget_always_on_top", { alwaysOnTop }),
  setWidgetSize: (size: string) => invoke<void>("set_widget_size", { size }),
  quit: () => invoke<void>("quit_app"),
};

export function onStateChanged(
  cb: (state: TimerState) => void,
): Promise<UnlistenFn> {
  return listen<TimerState>("state-changed", (e) => cb(e.payload));
}

export function onPhaseComplete(
  cb: (kind: PhaseKind) => void,
): Promise<UnlistenFn> {
  return listen<PhaseKind>("phase-complete", (e) => cb(e.payload));
}

export function onSettingsChanged(
  cb: (settings: Settings) => void,
): Promise<UnlistenFn> {
  return listen<Settings>("settings-changed", (e) => cb(e.payload));
}

export function onPresetsChanged(
  cb: (presets: Preset[]) => void,
): Promise<UnlistenFn> {
  return listen<Preset[]>("presets-changed", (e) => cb(e.payload));
}

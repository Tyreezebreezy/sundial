import { useEffect, useRef, useState } from "react";
import {
  api,
  onPhaseComplete,
  onPresetsChanged,
  onSettingsChanged,
  onStateChanged,
} from "./tauri";
import type {
  BootPayload,
  PhaseKind,
  Preset,
  Settings,
  TimerState,
} from "./types";

function computeRemainingMs(state: TimerState): number {
  if (!state.isRunning || state.awaitingAdvance) return state.durationMs;
  if (state.isPaused) return state.pausedRemainingMs ?? 0;
  if (state.endsAt == null) return state.durationMs;
  return Math.max(0, state.endsAt - Date.now());
}

export function useTimer(onPhaseCompleteCb?: (kind: PhaseKind) => void) {
  const [state, setState] = useState<TimerState | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [restore, setRestore] = useState<BootPayload["restore"] | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const stateRef = useRef<TimerState | null>(null);
  const cbRef = useRef(onPhaseCompleteCb);
  cbRef.current = onPhaseCompleteCb;

  useEffect(() => {
    let disposed = false;
    const unlisten: Array<() => void> = [];

    void api.getBootData().then((boot) => {
      if (disposed) return;
      stateRef.current = boot.state;
      setState(boot.state);
      setSettings(boot.settings);
      setCustomPresets(boot.customPresets);
      setRestore(boot.restore);
      setRemainingMs(computeRemainingMs(boot.state));
    });

    void onStateChanged((s) => {
      stateRef.current = s;
      setState(s);
      setRemainingMs(computeRemainingMs(s));
    }).then((un) => unlisten.push(un));

    void onSettingsChanged((s) => setSettings(s)).then((un) =>
      unlisten.push(un),
    );
    void onPresetsChanged((p) => setCustomPresets(p)).then((un) =>
      unlisten.push(un),
    );
    void onPhaseComplete((kind) => cbRef.current?.(kind)).then((un) =>
      unlisten.push(un),
    );

    const interval = window.setInterval(() => {
      if (stateRef.current)
        setRemainingMs(computeRemainingMs(stateRef.current));
    }, 200);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      unlisten.forEach((un) => un());
    };
  }, []);

  return { state, settings, customPresets, restore, remainingMs };
}

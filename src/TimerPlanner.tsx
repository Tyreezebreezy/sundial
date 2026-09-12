import { useState } from "react";
import { api } from "./tauri";
import { TIMER_PRESET_MINUTES } from "./presets";
import type { Settings, VisualKind } from "./types";

const VISUALS: { value: VisualKind; label: string }[] = [
  { value: "disk", label: "Disk" },
  { value: "hourglass", label: "Hourglass" },
  { value: "sundial", label: "Sundial" },
];

export function TimerPlanner({ settings }: { settings: Settings }) {
  const [minutes, setMinutes] = useState(settings.lastTimerMinutes ?? 25);
  const [visual, setVisual] = useState<VisualKind>(settings.defaultVisual);

  async function handleStart() {
    await api.updateSettings({
      ...settings,
      defaultVisual: visual,
      lastTimerMinutes: minutes,
    });
    await api.startSession({
      mode: "timer",
      phases: [{ kind: "timer", durationMs: minutes * 60_000 }],
      visual,
      autoAdvance: true,
      label: null,
      presetName: null,
    });
  }

  return (
    <div className="planner">
      <div className="field-group">
        <span className="field-label">Minutes</span>
        <div className="quick-picks">
          {TIMER_PRESET_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              className={minutes === m ? "selected" : ""}
              onClick={() => setMinutes(m)}
            >
              {m}
            </button>
          ))}
          <input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) =>
              setMinutes(Math.max(1, Number(e.target.value) || 1))
            }
          />
        </div>
      </div>

      <div className="field-group">
        <span className="field-label">Visual</span>
        <div className="quick-picks">
          {VISUALS.map((v) => (
            <button
              key={v.value}
              type="button"
              className={visual === v.value ? "selected" : ""}
              onClick={() => setVisual(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="start-button"
        onClick={() => void handleStart()}
      >
        Start
      </button>
    </div>
  );
}

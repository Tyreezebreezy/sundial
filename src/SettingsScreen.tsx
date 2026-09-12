import { api } from "./tauri";
import { playSound } from "./audio";
import type { Settings, SoundKey, VisualKind, WidgetSize } from "./types";

const SOUND_OPTIONS: { value: SoundKey; label: string }[] = [
  { value: "bell", label: "Bell" },
  { value: "chime", label: "Chime" },
  { value: "doubleChime", label: "Double Chime" },
  { value: "digital", label: "Digital" },
  { value: "alarm", label: "Alarm" },
];

const VISUAL_OPTIONS: { value: VisualKind; label: string }[] = [
  { value: "disk", label: "Disk" },
  { value: "hourglass", label: "Hourglass" },
  { value: "sundial", label: "Sundial" },
];

const WIDGET_SIZES: { value: WidgetSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export function SettingsScreen({ settings }: { settings: Settings }) {
  function update(partial: Partial<Settings>) {
    void api.updateSettings({ ...settings, ...partial });
  }

  return (
    <div className="settings-screen">
      <section>
        <h3>Sound</h3>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => update({ soundEnabled: e.target.checked })}
          />
          Sound enabled
        </label>
        <label className="row">
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => update({ volume: Number(e.target.value) })}
          />
        </label>

        <label className="row">
          Study complete
          <select
            value={settings.soundStudyComplete}
            onChange={(e) =>
              update({ soundStudyComplete: e.target.value as SoundKey })
            }
          >
            {SOUND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              playSound(settings.soundStudyComplete, settings.volume)
            }
          >
            Test
          </button>
        </label>

        <label className="row">
          Break complete
          <select
            value={settings.soundBreakComplete}
            onChange={(e) =>
              update({ soundBreakComplete: e.target.value as SoundKey })
            }
          >
            {SOUND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              playSound(settings.soundBreakComplete, settings.volume)
            }
          >
            Test
          </button>
        </label>

        <label className="row">
          Timer complete
          <select
            value={settings.soundTimerComplete}
            onChange={(e) =>
              update({ soundTimerComplete: e.target.value as SoundKey })
            }
          >
            {SOUND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              playSound(settings.soundTimerComplete, settings.volume)
            }
          >
            Test
          </button>
        </label>
      </section>

      <section>
        <h3>Timer</h3>
        <label className="row">
          Default visual
          <select
            value={settings.defaultVisual}
            onChange={(e) =>
              update({ defaultVisual: e.target.value as VisualKind })
            }
          >
            {VISUAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.autoAdvance}
            onChange={(e) => update({ autoAdvance: e.target.checked })}
          />
          Auto-advance phases by default
        </label>
      </section>

      <section>
        <h3>Widget</h3>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.widgetVisible}
            onChange={(e) => {
              update({ widgetVisible: e.target.checked });
              void api.setWidgetVisible(e.target.checked);
            }}
          />
          Show widget
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.widgetAlwaysOnTop}
            onChange={(e) => {
              update({ widgetAlwaysOnTop: e.target.checked });
              void api.setWidgetAlwaysOnTop(e.target.checked);
            }}
          />
          Widget always on top
        </label>
        <label className="row">
          Widget size
          <select
            value={settings.widgetSize}
            onChange={(e) => {
              const size = e.target.value as WidgetSize;
              update({ widgetSize: size });
              void api.setWidgetSize(size);
            }}
          >
            {WIDGET_SIZES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
}

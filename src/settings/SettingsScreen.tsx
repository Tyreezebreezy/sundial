import type { ReactNode } from "react";
import { playSound } from "../audio";
import { api } from "../tauri";
import { Icon } from "../ui/Icon";
import { Segmented } from "../ui/Segmented";
import { Switch } from "../ui/Switch";
import { VisualPicker } from "../visuals/VisualPicker";
import type { Settings, SoundKey, WidgetSize } from "../types";

const SOUND_OPTIONS: { value: SoundKey; label: string }[] = [
  { value: "bell", label: "Bell" },
  { value: "chime", label: "Chime" },
  { value: "doubleChime", label: "Double Chime" },
  { value: "digital", label: "Digital" },
  { value: "alarm", label: "Alarm" },
];

const WIDGET_SIZES: { value: WidgetSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section" aria-labelledby={id}>
      <h2 id={id} className="type-heading">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One scrolling surface: sections divided by hairlines, never nested pages. */
export function SettingsScreen({ settings }: { settings: Settings }) {
  const update = (partial: Partial<Settings>) =>
    void api.updateSettings({ ...settings, ...partial });

  const soundRows: {
    key: "soundStudyComplete" | "soundBreakComplete" | "soundTimerComplete";
    label: string;
  }[] = [
    { key: "soundStudyComplete", label: "Study complete" },
    { key: "soundBreakComplete", label: "Break complete" },
    { key: "soundTimerComplete", label: "Timer complete" },
  ];

  return (
    <div className="settings surface-in">
      <Section id="set-appearance" title="Appearance">
        <VisualPicker
          name="default-visual"
          legend="Default visual"
          value={settings.defaultVisual}
          onChange={(defaultVisual) => update({ defaultVisual })}
        />
      </Section>

      <Section id="set-study" title="Study">
        <Switch
          checked={settings.autoAdvance}
          onChange={(autoAdvance) => update({ autoAdvance })}
        >
          Advance to the next phase automatically
        </Switch>
      </Section>

      <Section id="set-widget" title="Widget">
        <Switch
          checked={settings.widgetVisible}
          onChange={(widgetVisible) => {
            update({ widgetVisible });
            void api.setWidgetVisible(widgetVisible);
          }}
        >
          Show widget
        </Switch>
        <Switch
          checked={settings.widgetAlwaysOnTop}
          onChange={(widgetAlwaysOnTop) => {
            update({ widgetAlwaysOnTop });
            void api.setWidgetAlwaysOnTop(widgetAlwaysOnTop);
          }}
        >
          Always on top
        </Switch>
        <Segmented
          legend="Size"
          name="widget-size"
          value={settings.widgetSize}
          options={WIDGET_SIZES}
          onChange={(widgetSize) => {
            update({ widgetSize });
            void api.setWidgetSize(widgetSize);
          }}
        />
      </Section>

      <Section id="set-audio" title="Audio">
        <Switch
          checked={settings.soundEnabled}
          onChange={(soundEnabled) => update({ soundEnabled })}
        >
          Sound
        </Switch>
        {soundRows.map((row) => (
          <div className="setting-row" key={row.key}>
            <label className="setting-label" htmlFor={`sound-${row.key}`}>
              {row.label}
            </label>
            <div className="setting-control">
              <span className="select">
                <select
                  id={`sound-${row.key}`}
                  value={settings[row.key]}
                  onChange={(e) =>
                    update({ [row.key]: e.target.value as SoundKey })
                  }
                >
                  {SOUND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--compact"
                aria-label={`Test ${row.label.toLowerCase()} sound`}
                onClick={() => playSound(settings[row.key], settings.volume)}
              >
                Test
              </button>
            </div>
          </div>
        ))}
        <div className="setting-row">
          <label className="setting-label" htmlFor="volume">
            Volume
          </label>
          <div className="setting-control">
            <input
              id="volume"
              className="range"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => update({ volume: Number(e.target.value) })}
            />
            <span className="type-meta setting-value">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
        </div>
      </Section>

      <Section id="set-app" title="App">
        <p className="field-label">Keyboard shortcuts</p>
        <div className="shortcut-list" aria-label="Keyboard shortcuts">
          {[
            ["Space", "Pause or resume"],
            ["+", "Add 5 minutes"],
            ["S", "Skip phase"],
            ["F", "Focus Display"],
            ["Esc", "Close overlay"],
          ].map(([key, label]) => (
            <div className="shortcut-row" key={key}>
              <span className="setting-label">{label}</span>
              <kbd className="key">{key}</kbd>
            </div>
          ))}
        </div>
        <fieldset className="close-behavior">
          <legend className="setting-label">When the main window closes</legend>
          <label className="choice">
            <input
              type="radio"
              name="close-behavior"
              checked={!settings.quitOnMainClose}
              onChange={() => update({ quitOnMainClose: false })}
            />
            <span className="choice-face">Keep SUNDIAL running</span>
          </label>
          <label className="choice">
            <input
              type="radio"
              name="close-behavior"
              checked={settings.quitOnMainClose}
              onChange={() => update({ quitOnMainClose: true })}
            />
            <span className="choice-face">Quit SUNDIAL</span>
          </label>
        </fieldset>
        <div>
          <button
            type="button"
            className="btn btn--secondary btn--quit"
            onClick={() => void api.quit()}
          >
            <Icon name="power" />
            Quit SUNDIAL
          </button>
        </div>
      </Section>
    </div>
  );
}

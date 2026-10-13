import { useState } from "react";
import { formatMinutesLabel, formatTimer } from "../format";
import { TIMER_PRESET_MINUTES } from "../presets";
import { api } from "../tauri";
import { DurationFields } from "../ui/DurationFields";
import { Segmented } from "../ui/Segmented";
import { TimerVisual } from "../visuals/TimerVisual";
import { VisualPicker } from "../visuals/VisualPicker";
import type { Settings, VisualKind } from "../types";

type Choice = string;

const OPTIONS: { value: Choice; label: string; ariaLabel?: string }[] = [
  ...TIMER_PRESET_MINUTES.map((m) => ({
    value: String(m),
    label: String(m),
    ariaLabel: `${m} minutes`,
  })),
  { value: "custom", label: "Custom" },
];

/** General countdown: pick a length, see it, start it. Simpler than Study by design. */
export function TimerSetup({ settings }: { settings: Settings }) {
  const initial = settings.lastTimerMinutes ?? 25;
  const [minutes, setMinutes] = useState<number | null>(initial);
  const [customMode, setCustomMode] = useState(
    !TIMER_PRESET_MINUTES.includes(initial),
  );
  const [visual, setVisual] = useState<VisualKind>(settings.defaultVisual);

  const selected: Choice = customMode ? "custom" : String(minutes);
  const ready = minutes !== null && minutes > 0;

  async function handleStart() {
    if (!ready || minutes === null) return;
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
    <section className="setup setup--timer surface-in" aria-label="Timer setup">
      <div className="composer">
        <div className="instrument-stage" aria-hidden="true">
          <div className="visual-frame visual-frame--instrument">
            <TimerVisual
              kind={visual}
              remainingMs={0}
              durationMs={0}
              progress={0.75}
              state="idle"
              size="large"
              reducedMotion
            />
          </div>
          <p className="readout readout--idle">
            {formatTimer((minutes ?? 0) * 60_000)}
          </p>
        </div>

        <div className="session-composer">
          <div className="timer-choice">
            <Segmented
              legend="Minutes"
              legendClassName="sr-only"
              name="timer-minutes"
              variant="grid"
              value={selected}
              options={OPTIONS}
              onChange={(choice) => {
                if (choice === "custom") {
                  setCustomMode(true);
                } else {
                  setCustomMode(false);
                  setMinutes(Number(choice));
                }
              }}
            />
            {customMode && (
              <DurationFields
                idPrefix="timer-custom"
                initialMinutes={minutes}
                onChange={setMinutes}
              />
            )}
          </div>

          <VisualPicker
            name="timer-visual"
            legend="Visual"
            value={visual}
            onChange={setVisual}
          />

          <div className="setup-actions">
            <button
              type="button"
              className="btn btn--primary start-cta"
              disabled={!ready}
              onClick={() => void handleStart()}
            >
              <span className="start-cta-label">
                {ready && minutes !== null
                  ? `Start ${formatMinutesLabel(minutes)} timer`
                  : "Choose a duration"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

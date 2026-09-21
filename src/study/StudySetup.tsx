import { useMemo, useState } from "react";
import { formatMinutesLabel } from "../format";
import { BUILT_IN_PRESETS } from "../presets";
import { buildStudySchedule, lastConfig, summarizeSchedule } from "../session";
import { api } from "../tauri";
import { Icon } from "../ui/Icon";
import { Switch } from "../ui/Switch";
import { TimerVisual } from "../visuals/TimerVisual";
import { VisualPicker } from "../visuals/VisualPicker";
import type { Preset, Settings, VisualKind } from "../types";
import { CustomPreset } from "./CustomPreset";
import { PresetSelector } from "./PresetSelector";
import { SessionDuration } from "./SessionDuration";
import { SessionSummary } from "./SessionSummary";
import { SessionTimeline } from "./SessionTimeline";

type Panel = "plan" | "options" | null;

/**
 * The primary setup surface: one rhythm, one question ("how long?"), one
 * action. Everything else (the exact plan, visual, advance mode, label) is
 * disclosed on demand so the first screen stays a decision, not a form.
 */
export function StudySetup({
  settings,
  customPresets,
}: {
  settings: Settings;
  customPresets: Preset[];
}) {
  const allPresets = useMemo(
    () => [...BUILT_IN_PRESETS, ...customPresets],
    [customPresets],
  );
  const remembered = allPresets.find(
    (p) => p.id === settings.lastStudyPresetId,
  );

  const [presetId, setPresetId] = useState((remembered ?? allPresets[0]).id);
  const [total, setTotal] = useState<number | null>(
    settings.lastStudyTotalMinutes ?? remembered?.defaultTotalMinutes ?? null,
  );
  const [visual, setVisual] = useState<VisualKind>(settings.defaultVisual);
  const [autoAdvance, setAutoAdvance] = useState(settings.autoAdvance);
  const [label, setLabel] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [creating, setCreating] = useState(false);
  // remounts the duration control when a saved preset supplies its own default
  const [durationKey, setDurationKey] = useState(0);

  const preset = allPresets.find((p) => p.id === presetId) ?? allPresets[0];
  const schedule = useMemo(
    () =>
      buildStudySchedule(total ?? 0, preset.studyMinutes, preset.breakMinutes),
    [total, preset.studyMinutes, preset.breakMinutes],
  );
  const summary = useMemo(() => summarizeSchedule(schedule), [schedule]);
  const ready = schedule.length > 0;

  const last = lastConfig(
    settings.lastStudyPresetId,
    settings.lastStudyTotalMinutes,
    allPresets,
  );
  const showRepeat =
    last !== null &&
    (last.preset.id !== preset.id ||
      last.totalMinutes !== summary.totalMinutes);

  function choosePreset(next: Preset) {
    setPresetId(next.id);
    if (next.visual) setVisual(next.visual);
    if (next.autoAdvance != null) setAutoAdvance(next.autoAdvance);
    if (next.defaultTotalMinutes) {
      setTotal(next.defaultTotalMinutes);
      setDurationKey((k) => k + 1);
    }
  }

  async function start(
    chosen: Preset,
    totalMinutes: number,
    withVisual: VisualKind,
    withAutoAdvance: boolean,
  ) {
    const phases = buildStudySchedule(
      totalMinutes,
      chosen.studyMinutes,
      chosen.breakMinutes,
    );
    if (phases.length === 0) return;
    await api.updateSettings({
      ...settings,
      defaultVisual: withVisual,
      autoAdvance: withAutoAdvance,
      lastStudyPresetId: chosen.id,
      lastStudyTotalMinutes: totalMinutes,
    });
    await api.startSession({
      mode: "study",
      phases,
      visual: withVisual,
      autoAdvance: withAutoAdvance,
      label: label.trim() ? label.trim() : null,
      presetName: chosen.name,
    });
  }

  if (creating) {
    return (
      <CustomPreset
        settings={settings}
        onCancel={() => setCreating(false)}
        onSaved={(created) => {
          setCreating(false);
          choosePreset(created);
        }}
      />
    );
  }

  const togglePanel = (next: Exclude<Panel, null>) =>
    setPanel((current) => (current === next ? null : next));

  return (
    <section className="setup surface-in" aria-label="Study setup">
      <PresetSelector
        presets={allPresets}
        value={preset}
        onSelect={choosePreset}
        onDelete={(p) => void api.deletePreset(p.id)}
        onCreate={() => setCreating(true)}
      />

      <div className="visual-frame visual-frame--preview" aria-hidden="true">
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

      <SessionDuration
        key={durationKey}
        name="study-total"
        legend="How long are you studying?"
        legendClassName="prompt"
        value={total}
        onChange={setTotal}
      />

      {ready && <SessionSummary summary={summary} />}

      <div className="disclosures">
        <button
          type="button"
          className="disclosure"
          aria-expanded={panel === "plan"}
          aria-controls="panel-plan"
          disabled={!ready}
          onClick={() => togglePanel("plan")}
        >
          View plan
          <Icon name="chevron" />
        </button>
        <button
          type="button"
          className="disclosure"
          aria-expanded={panel === "options"}
          aria-controls="panel-options"
          onClick={() => togglePanel("options")}
        >
          Options
          <Icon name="chevron" />
        </button>
      </div>

      {panel === "plan" && ready && (
        <div id="panel-plan" className="panel">
          <SessionTimeline phases={schedule} />
        </div>
      )}
      {panel === "options" && (
        <div id="panel-options" className="panel panel--options">
          <VisualPicker
            name="study-visual"
            legend="Visual"
            value={visual}
            onChange={setVisual}
          />
          <Switch checked={autoAdvance} onChange={setAutoAdvance}>
            Advance to the next phase automatically
          </Switch>
          <div className="field">
            <label className="field-label" htmlFor="session-label">
              Label (optional)
            </label>
            <input
              id="session-label"
              className="input"
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="setup-actions">
        <button
          type="button"
          className="btn btn--primary start-cta"
          disabled={!ready}
          onClick={() =>
            void start(preset, summary.totalMinutes, visual, autoAdvance)
          }
        >
          <span className="start-cta-label">
            {ready
              ? `Start ${formatMinutesLabel(summary.totalMinutes)} ${preset.name}`
              : "Choose a duration"}
          </span>
        </button>
        {showRepeat && last && (
          <button
            type="button"
            className="btn btn--tertiary"
            onClick={() =>
              void start(
                last.preset,
                last.totalMinutes,
                last.preset.visual ?? settings.defaultVisual,
                last.preset.autoAdvance ?? settings.autoAdvance,
              )
            }
          >
            Repeat last · {last.preset.name} ·{" "}
            {formatMinutesLabel(last.totalMinutes)}
          </button>
        )}
      </div>
    </section>
  );
}

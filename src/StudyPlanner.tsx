import { useMemo, useState } from "react";
import { api } from "./tauri";
import { BUILT_IN_PRESETS } from "./presets";
import { buildStudySchedule, summarizeSchedule } from "./session";
import type { Preset, Settings, VisualKind } from "./types";

const TOTAL_QUICK_PICKS = [60, 90, 120, 150, 180];
const VISUALS: { value: VisualKind; label: string }[] = [
  { value: "disk", label: "Disk" },
  { value: "hourglass", label: "Hourglass" },
  { value: "sundial", label: "Sundial" },
];

function formatTotal(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${rest}` : `${hours}h`;
}

export function StudyPlanner({
  settings,
  customPresets,
}: {
  settings: Settings;
  customPresets: Preset[];
}) {
  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
  const initialPreset =
    allPresets.find((p) => p.id === settings.lastStudyPresetId) ??
    allPresets[0];

  const [presetId, setPresetId] = useState(initialPreset.id);
  const [customStudy, setCustomStudy] = useState(initialPreset.studyMinutes);
  const [customBreak, setCustomBreak] = useState(initialPreset.breakMinutes);
  const [totalMinutes, setTotalMinutes] = useState(
    settings.lastStudyTotalMinutes ?? 120,
  );
  const [visual, setVisual] = useState<VisualKind>(settings.defaultVisual);
  const [autoAdvance, setAutoAdvance] = useState(settings.autoAdvance);
  const [label, setLabel] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingName, setSavingName] = useState("");

  const isCustom = presetId === "custom";
  const activePreset = allPresets.find((p) => p.id === presetId);
  const studyMinutes = isCustom
    ? customStudy
    : (activePreset?.studyMinutes ?? customStudy);
  const breakMinutes = isCustom
    ? customBreak
    : (activePreset?.breakMinutes ?? customBreak);

  const schedule = useMemo(
    () => buildStudySchedule(totalMinutes, studyMinutes, breakMinutes),
    [totalMinutes, studyMinutes, breakMinutes],
  );
  const summary = useMemo(() => summarizeSchedule(schedule), [schedule]);

  async function handleStart() {
    if (schedule.length === 0) return;
    await api.updateSettings({
      ...settings,
      defaultVisual: visual,
      autoAdvance,
      lastStudyPresetId: presetId,
      lastStudyTotalMinutes: totalMinutes,
    });
    await api.startSession({
      mode: "study",
      phases: schedule,
      visual,
      autoAdvance,
      label: label.trim() ? label.trim() : null,
      presetName: !isCustom ? (activePreset?.name ?? null) : null,
    });
  }

  async function handleSavePreset() {
    if (!savingName.trim()) return;
    await api.savePreset(savingName.trim(), customStudy, customBreak);
    setShowSaveForm(false);
    setSavingName("");
  }

  return (
    <div className="planner">
      <div className="preset-grid">
        {allPresets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={"preset-card" + (presetId === p.id ? " selected" : "")}
            onClick={() => setPresetId(p.id)}
          >
            <span className="preset-name">{p.name}</span>
            <span className="preset-ratio">
              {p.studyMinutes}/{p.breakMinutes}
            </span>
          </button>
        ))}
        <button
          type="button"
          className={"preset-card" + (isCustom ? " selected" : "")}
          onClick={() => setPresetId("custom")}
        >
          <span className="preset-name">Custom</span>
        </button>
      </div>

      {isCustom && (
        <div className="custom-ratio">
          <label>
            Study (min)
            <input
              type="number"
              min={1}
              value={customStudy}
              onChange={(e) =>
                setCustomStudy(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </label>
          <label>
            Break (min)
            <input
              type="number"
              min={0}
              value={customBreak}
              onChange={(e) =>
                setCustomBreak(Math.max(0, Number(e.target.value) || 0))
              }
            />
          </label>
          {!showSaveForm ? (
            <button type="button" onClick={() => setShowSaveForm(true)}>
              Save as preset
            </button>
          ) : (
            <div className="save-preset-form">
              <input
                placeholder="Preset name"
                value={savingName}
                onChange={(e) => setSavingName(e.target.value)}
              />
              <button type="button" onClick={() => void handleSavePreset()}>
                Save
              </button>
            </div>
          )}
        </div>
      )}

      {customPresets.length > 0 && (
        <ul className="custom-preset-list">
          {customPresets.map((p) => (
            <li key={p.id}>
              <span>
                {p.name} ({p.studyMinutes}/{p.breakMinutes})
              </span>
              <button
                type="button"
                className="delete-preset"
                onClick={() => void api.deletePreset(p.id)}
                aria-label={`Delete ${p.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="field-group">
        <span className="field-label">Total duration</span>
        <div className="quick-picks">
          {TOTAL_QUICK_PICKS.map((m) => (
            <button
              key={m}
              type="button"
              className={totalMinutes === m ? "selected" : ""}
              onClick={() => setTotalMinutes(m)}
            >
              {formatTotal(m)}
            </button>
          ))}
          <input
            type="number"
            min={1}
            value={totalMinutes}
            onChange={(e) =>
              setTotalMinutes(Math.max(1, Number(e.target.value) || 1))
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

      <label className="row">
        <input
          type="checkbox"
          checked={autoAdvance}
          onChange={(e) => setAutoAdvance(e.target.checked)}
        />
        Auto-advance phases
      </label>

      <label className="row">
        Label (optional)
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
        />
      </label>

      <div className="session-summary">
        <span>{summary.totalMinutes}m total</span>
        <span>{summary.studyMinutes}m study</span>
        <span>{summary.breakMinutes}m break</span>
        <span>
          {summary.studyBlocks} focus block
          {summary.studyBlocks === 1 ? "" : "s"}
        </span>
      </div>

      <button
        type="button"
        className="start-button"
        disabled={schedule.length === 0}
        onClick={() => void handleStart()}
      >
        Start
      </button>
    </div>
  );
}

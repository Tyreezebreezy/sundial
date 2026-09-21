import { useState } from "react";
import { api } from "../tauri";
import { Icon } from "../ui/Icon";
import { Switch } from "../ui/Switch";
import { VisualPicker } from "../visuals/VisualPicker";
import type { Preset, Settings, VisualKind } from "../types";
import { SessionDuration } from "./SessionDuration";

/** Name + focus + break, plus the defaults a saved rhythm remembers. */
export function CustomPreset({
  settings,
  onSaved,
  onCancel,
}: {
  settings: Settings;
  onSaved: (preset: Preset) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("45");
  const [rest, setRest] = useState("15");
  const [total, setTotal] = useState<number | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(settings.autoAdvance);
  const [visual, setVisual] = useState<VisualKind>(settings.defaultVisual);
  const [submitted, setSubmitted] = useState(false);

  const focusMinutes = Number(focus);
  const breakMinutes = rest === "" ? 0 : Number(rest);
  const nameError = name.trim() ? null : "Enter a name for this preset.";
  const focusError =
    Number.isInteger(focusMinutes) && focusMinutes >= 1
      ? null
      : "Enter a focus length greater than 0.";
  const breakError =
    Number.isInteger(breakMinutes) && breakMinutes >= 0
      ? null
      : "Enter a break length of 0 or more.";
  const valid = !nameError && !focusError && !breakError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    const list = await api.savePreset(name.trim(), focusMinutes, breakMinutes, {
      defaultTotalMinutes: total,
      autoAdvance,
      visual,
    });
    const created = list[list.length - 1];
    if (created) onSaved(created);
  }

  return (
    <form
      className="custom-preset surface-in"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="custom-preset-head">
        <button
          type="button"
          className="icon-btn"
          aria-label="Back to study setup"
          onClick={onCancel}
        >
          <Icon name="back" />
        </button>
        <h2 className="type-display">Custom preset</h2>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="preset-name">
          Name
        </label>
        <input
          id="preset-name"
          className="input"
          value={name}
          maxLength={40}
          placeholder="e.g. CCNA Study"
          autoFocus
          aria-invalid={submitted && nameError ? true : undefined}
          aria-describedby={
            submitted && nameError ? "preset-name-error" : undefined
          }
          onChange={(e) => setName(e.target.value)}
        />
        {submitted && nameError && (
          <p id="preset-name-error" className="field-error" role="alert">
            {nameError}
          </p>
        )}
      </div>

      <div className="duration-inputs">
        <div className="field">
          <label className="field-label" htmlFor="preset-focus">
            Focus (minutes)
          </label>
          <input
            id="preset-focus"
            className="input"
            type="number"
            min={1}
            value={focus}
            aria-invalid={submitted && focusError ? true : undefined}
            aria-describedby={
              submitted && focusError ? "preset-focus-error" : undefined
            }
            onChange={(e) => setFocus(e.target.value)}
          />
          {submitted && focusError && (
            <p id="preset-focus-error" className="field-error" role="alert">
              {focusError}
            </p>
          )}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="preset-break">
            Break (minutes)
          </label>
          <input
            id="preset-break"
            className="input"
            type="number"
            min={0}
            value={rest}
            aria-invalid={submitted && breakError ? true : undefined}
            aria-describedby={
              submitted && breakError ? "preset-break-error" : undefined
            }
            onChange={(e) => setRest(e.target.value)}
          />
          {submitted && breakError && (
            <p id="preset-break-error" className="field-error" role="alert">
              {breakError}
            </p>
          )}
        </div>
      </div>

      <SessionDuration
        name="preset-default"
        legend="Default session (optional)"
        value={total}
        onChange={setTotal}
      />

      <Switch checked={autoAdvance} onChange={setAutoAdvance}>
        Advance to the next phase automatically
      </Switch>

      <VisualPicker
        name="preset-visual"
        legend="Visual"
        value={visual}
        onChange={setVisual}
      />

      <div className="form-actions">
        <button type="submit" className="btn btn--primary">
          Save preset
        </button>
        <button type="button" className="btn btn--tertiary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

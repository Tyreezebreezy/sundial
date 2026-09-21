import { useEffect, useRef, useState } from "react";
import { BUILT_IN_PRESETS, PRIMARY_PRESET_IDS } from "../presets";
import { Icon } from "../ui/Icon";
import type { Preset } from "../types";

/**
 * The selected rhythm is the setup screen's identity ("DEEP STUDY 45 / 15").
 * Choosing another opens a short panel: the two primary rhythms first, the
 * rest behind a divider, saved custom presets last.
 */
export function PresetSelector({
  presets,
  value,
  onSelect,
  onDelete,
  onCreate,
}: {
  presets: Preset[];
  value: Preset;
  onSelect: (preset: Preset) => void;
  onDelete: (preset: Preset) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const builtInIds = new Set(BUILT_IN_PRESETS.map((p) => p.id));
  const primary = presets.filter((p) => PRIMARY_PRESET_IDS.includes(p.id));
  const secondary = presets.filter(
    (p) => builtInIds.has(p.id) && !PRIMARY_PRESET_IDS.includes(p.id),
  );
  const saved = presets.filter((p) => !builtInIds.has(p.id));

  useEffect(() => {
    if (!open) return;
    rootRef.current
      ?.querySelector<HTMLInputElement>("input[type=radio]:checked")
      ?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function renderOption(p: Preset, deletable = false) {
    return (
      <li key={p.id} className="preset-row">
        {/* The radio itself covers the row, so a pointer click lands on the
            input directly. Closing from a label click would unmount the panel
            before the browser forwards the click to the input, losing the
            selection. detail > 0 = a real pointer click (arrow keys also emit
            clicks, with detail 0, and must leave the menu open). */}
        <label className="preset-option">
          <input
            type="radio"
            name="study-rhythm"
            value={p.id}
            checked={value.id === p.id}
            onChange={() => onSelect(p)}
            onClick={(e) => {
              if (e.detail > 0) setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
              }
            }}
          />
          <span className="preset-option-face">
            <span className="preset-option-name">{p.name}</span>
            <span className="type-meta">
              {p.studyMinutes} / {p.breakMinutes}
            </span>
          </span>
        </label>
        {deletable && (
          <button
            type="button"
            className="icon-btn icon-btn--small"
            aria-label={`Delete ${p.name}`}
            onClick={() => onDelete(p)}
          >
            <Icon name="close" />
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="preset-selector" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="preset-trigger"
        aria-expanded={open}
        aria-controls="preset-menu"
        aria-label={`Study rhythm: ${value.name}, ${value.studyMinutes} minutes study, ${value.breakMinutes} minutes break. Change`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="type-display">{value.name}</span>
        <span className="preset-trigger-meta">
          <span className="type-meta">
            {value.studyMinutes} / {value.breakMinutes}
          </span>
          <Icon name="chevron" />
        </span>
      </button>

      {open && (
        <div
          id="preset-menu"
          className="preset-menu"
          role="group"
          aria-label="Choose study rhythm"
        >
          <p className="type-heading">Choose study rhythm</p>
          <ul className="preset-list">{primary.map((p) => renderOption(p))}</ul>
          <ul className="preset-list preset-list--divided">
            {secondary.map((p) => renderOption(p))}
          </ul>
          {saved.length > 0 && (
            <ul className="preset-list preset-list--divided">
              {saved.map((p) => renderOption(p, true))}
            </ul>
          )}
          <button
            type="button"
            className="btn btn--tertiary preset-add"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
          >
            <Icon name="plus" />
            Custom preset
          </button>
        </div>
      )}
    </div>
  );
}

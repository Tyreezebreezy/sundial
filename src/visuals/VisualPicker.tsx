import type { VisualKind } from "../types";
import { TimerVisual } from "./TimerVisual";

const OPTIONS: { value: VisualKind; label: string }[] = [
  { value: "disk", label: "Disk" },
  { value: "hourglass", label: "Hourglass" },
  { value: "sundial", label: "Sundial" },
];

/**
 * Radio group whose options are live previews of the visuals themselves
 * (native radios for keyboard behavior; selection is shown by text, marker
 * and brightness - never by color alone).
 */
export function VisualPicker({
  value,
  onChange,
  name,
  legend,
}: {
  value: VisualKind;
  onChange: (next: VisualKind) => void;
  name: string;
  legend: string;
}) {
  return (
    <fieldset className="visual-picker">
      <legend className="sr-only">{legend}</legend>
      {OPTIONS.map((o) => (
        <label key={o.value} className="visual-option">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span className="visual-option-body">
            <span className="visual-frame">
              <TimerVisual
                kind={o.value}
                remainingMs={0}
                durationMs={0}
                progress={0.72}
                state="idle"
                size="small"
                reducedMotion
              />
            </span>
            <span className="visual-option-label">{o.label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

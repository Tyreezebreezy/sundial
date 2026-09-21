import { useId, type ReactNode } from "react";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** Accessible name when the visible label is only a number or symbol. */
  ariaLabel?: string;
}

/**
 * Single-choice control built on native radios (arrow keys, one tab stop,
 * correct semantics for free). Selection is shown by border, brighter text
 * and a bottom marker - not by color alone.
 */
export function Segmented<T extends string | number>({
  legend,
  legendClassName = "field-label",
  name,
  value,
  options,
  onChange,
  variant = "row",
}: {
  legend: ReactNode;
  legendClassName?: string;
  name: string;
  value: T | null;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
  variant?: "row" | "grid";
}) {
  const labelId = useId();
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className={`segmented segmented--${variant}`}
    >
      <span id={labelId} className={`segmented-label ${legendClassName}`}>
        {legend}
      </span>
      <div className="segmented-options">
        {options.map((o) => (
          <label key={String(o.value)} className="segment">
            <input
              type="radio"
              name={name}
              value={String(o.value)}
              checked={value === o.value}
              aria-label={o.ariaLabel}
              onChange={() => onChange(o.value)}
            />
            <span className="segment-face">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

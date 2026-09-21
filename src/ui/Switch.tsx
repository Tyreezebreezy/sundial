import type { ReactNode } from "react";

/** Labeled on/off control; the On/Off word means state is never color-only. */
export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch-track" aria-hidden="true" />
      <span className="switch-state" aria-hidden="true">
        {checked ? "On" : "Off"}
      </span>
      <span className="switch-label">{children}</span>
    </label>
  );
}

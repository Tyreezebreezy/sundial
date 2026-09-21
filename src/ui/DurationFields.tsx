import { useState } from "react";
import { customDurationError, splitMinutes } from "../session";

/**
 * Hours + minutes entry that reports a total in minutes (or null while
 * invalid) and explains problems inline instead of silently clamping.
 */
export function DurationFields({
  initialMinutes,
  onChange,
  idPrefix,
}: {
  initialMinutes: number | null;
  onChange: (totalMinutes: number | null) => void;
  idPrefix: string;
}) {
  const initial = initialMinutes ? splitMinutes(initialMinutes) : null;
  const [hours, setHours] = useState(initial ? String(initial.hours) : "");
  const [minutes, setMinutes] = useState(
    initial ? String(initial.minutes) : "",
  );
  const [touched, setTouched] = useState(false);

  function update(nextHours: string, nextMinutes: string) {
    setTouched(true);
    setHours(nextHours);
    setMinutes(nextMinutes);
    const h = nextHours === "" ? 0 : Number(nextHours);
    const m = nextMinutes === "" ? 0 : Number(nextMinutes);
    onChange(customDurationError(h, m) ? null : h * 60 + m);
  }

  const h = hours === "" ? 0 : Number(hours);
  const m = minutes === "" ? 0 : Number(minutes);
  const error = touched ? customDurationError(h, m) : null;
  const errorId = `${idPrefix}-error`;

  return (
    <div className="duration-fields">
      <div className="duration-inputs">
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-h`}>
            Hours
          </label>
          <input
            id={`${idPrefix}-h`}
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            value={hours}
            placeholder="0"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => update(e.target.value, minutes)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${idPrefix}-m`}>
            Minutes
          </label>
          <input
            id={`${idPrefix}-m`}
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={minutes}
            placeholder="0"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => update(hours, e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

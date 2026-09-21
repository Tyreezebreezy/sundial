import { useState } from "react";
import { DURATION_CHOICES } from "../session";
import { DurationFields } from "../ui/DurationFields";
import { Segmented } from "../ui/Segmented";

type Choice = "60" | "120" | "180" | "custom";

const OPTIONS: { value: Choice; label: string }[] = [
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "custom", label: "Custom" },
];

/**
 * "How long are you studying?" - the value is TOTAL elapsed session time,
 * breaks included. null means nothing chosen yet (a brand-new user is never
 * given a silent default).
 */
export function SessionDuration({
  value,
  onChange,
  name,
  legend,
  legendClassName,
}: {
  value: number | null;
  onChange: (totalMinutes: number | null) => void;
  name: string;
  legend: string;
  legendClassName?: string;
}) {
  const isPreset =
    value !== null && (DURATION_CHOICES as readonly number[]).includes(value);
  const [customMode, setCustomMode] = useState(value !== null && !isPreset);
  const selected: Choice | null = customMode
    ? "custom"
    : isPreset
      ? (String(value) as Choice)
      : null;

  return (
    <div className="session-duration">
      <Segmented
        legend={legend}
        legendClassName={legendClassName}
        name={name}
        value={selected}
        options={OPTIONS}
        onChange={(choice) => {
          if (choice === "custom") {
            setCustomMode(true);
          } else {
            setCustomMode(false);
            onChange(Number(choice));
          }
        }}
      />
      {customMode && (
        <DurationFields
          idPrefix={`${name}-custom`}
          initialMinutes={value}
          onChange={onChange}
        />
      )}
    </div>
  );
}

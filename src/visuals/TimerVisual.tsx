import type { VisualKind } from "../types";
import { DiskTimer } from "./DiskTimer";
import { HourglassTimer } from "./HourglassTimer";
import { SundialTimer } from "./SundialTimer";
import type { TimerVisualProps } from "./visualTypes";

export type {
  TimerVisualProps,
  TimerVisualSize,
  TimerVisualState,
} from "./visualTypes";

/**
 * The digital readout beside a visual is the accessible alternative for the
 * remaining time, so the artwork itself is hidden from assistive tech.
 */
export function TimerVisual({
  kind,
  ...props
}: TimerVisualProps & { kind: VisualKind }) {
  if (kind === "hourglass") return <HourglassTimer {...props} />;
  if (kind === "sundial") return <SundialTimer {...props} />;
  return <DiskTimer {...props} />;
}

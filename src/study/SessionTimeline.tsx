import { planTotalMs } from "../session";
import type { Phase } from "../types";

/** The real sequence, drawn to scale: gold bars are study, thin bars are breaks. */
export function SessionTimeline({ phases }: { phases: Phase[] }) {
  const total = planTotalMs(phases);
  return (
    <ol className="timeline" aria-label="Session plan">
      {phases.map((phase, i) => {
        const minutes = Math.round(phase.durationMs / 60_000);
        const roomy = phase.durationMs / total >= 0.11;
        return (
          <li
            key={i}
            className={`timeline-seg timeline-seg--${phase.kind}`}
            style={{ flexGrow: phase.durationMs }}
          >
            <span className="timeline-bar" aria-hidden="true" />
            <span className={roomy ? "timeline-label" : "sr-only"}>
              <span className="timeline-kind">
                {phase.kind === "study" ? "Study" : "Break"}
              </span>{" "}
              <span className="timeline-min">{minutes}m</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

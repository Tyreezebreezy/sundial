import { planTotalMs } from "../session";
import type { Phase } from "../types";

/**
 * SUNDIAL's signature session-plan visualization: study/break phases drawn
 * to scale (gold = study, thin muted = break), the same component for the
 * setup preview, the active session and the large widget. When `live` is
 * given, segments before it settle, the current one carries a leading
 * position marker at `elapsedFraction`, and later ones stay quiet - but the
 * breakdown is also exposed as text (`title`, and the list's own accessible
 * name), so nothing here is the only way to learn the plan.
 */
export function Sunline({
  phases,
  live,
  compact = false,
}: {
  phases: Phase[];
  live?: { currentIndex: number; elapsedFraction: number };
  compact?: boolean;
}) {
  const total = planTotalMs(phases);
  if (total <= 0) return null;

  return (
    <ol
      className={`sunline${compact ? " sunline--compact" : ""}`}
      aria-label="Session plan"
    >
      {phases.map((phase, i) => {
        const minutes = Math.round(phase.durationMs / 60_000);
        const roomy = !compact && phase.durationMs / total >= 0.11;
        const status = !live
          ? undefined
          : i < live.currentIndex
            ? "done"
            : i === live.currentIndex
              ? "current"
              : "upcoming";
        return (
          <li
            key={i}
            className={`sunline-seg sunline-seg--${phase.kind}${status ? ` sunline-seg--${status}` : ""}`}
            style={{ flexGrow: phase.durationMs }}
            title={`${phase.kind === "study" ? "Study" : "Break"} ${minutes} minutes`}
          >
            <span className="sunline-bar" aria-hidden="true">
              {status === "current" && (
                <span
                  className="sunline-marker"
                  style={{
                    left: `${Math.round(Math.min(1, Math.max(0, live!.elapsedFraction)) * 100)}%`,
                  }}
                />
              )}
            </span>
            {roomy && (
              <span className="sunline-label">
                <span className="sunline-kind">
                  {phase.kind === "study" ? "Study" : "Break"}
                </span>{" "}
                <span className="sunline-min">{minutes}m</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

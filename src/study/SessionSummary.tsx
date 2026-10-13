import { formatDuration } from "../format";
import type { ScheduleSummary } from "../session";

/**
 * What will actually run. "Total session" is elapsed time including breaks;
 * Focus and Breaks split it, so the total is never mistaken for focus time.
 * Block count isn't repeated here - the Sunline directly below is always
 * showing at the same time and already answers "how many blocks".
 */
export function SessionSummary({ summary }: { summary: ScheduleSummary }) {
  return (
    <dl className="summary">
      <div className="summary-item summary-item--lead">
        <dt>Total session</dt>
        <dd>{formatDuration(summary.totalMinutes)}</dd>
      </div>
      <div className="summary-item">
        <dt>Focus</dt>
        <dd>{formatDuration(summary.studyMinutes)}</dd>
      </div>
      <div className="summary-item">
        <dt>Breaks</dt>
        <dd>{formatDuration(summary.breakMinutes)}</dd>
      </div>
    </dl>
  );
}
